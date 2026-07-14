const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");
const axios = require("axios");
require("dotenv").config();

// docx imports
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, BorderStyle, WidthType, ShadingType,
  HeadingLevel, UnderlineType
} = require("docx");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const upload = multer({ dest: "uploads/" });

// ── ROOT ──────────────────────────────────────────
app.get("/", (req, res) => res.send("Backend running 🚀"));


// ── ANALYZE ───────────────────────────────────────
app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No resume uploaded" });

    const filePath = req.file.path;
    const jobDescription = req.body.jobDescription;
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const resumeText = pdfData.text;

    const aiResponse = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{
        role: "user",
        content: `You are a strict JSON generator. Return ONLY valid JSON, no extra text.

{
  "matchPercentage": number,
  "missingSkills": [],
  "strengths": [],
  "extractedSkills": []
}

Resume:
${resumeText}

Job Description:
${jobDescription}`,
      }],
    });

    const raw = aiResponse.choices[0].message.content;
    const jsonMatch = raw.match(/{[\s\S]*}/);
    if (!jsonMatch) return res.status(500).json({ error: "AI did not return JSON" });

    let parsed;
    try { parsed = JSON.parse(jsonMatch[0]); }
    catch { return res.status(500).json({ error: "Invalid AI JSON" }); }

    parsed.resumeText = resumeText;
    res.json({ result: parsed });
  } catch (error) {
    console.error("ANALYZE ERROR:", error);
    res.status(500).json({ error: "Error analyzing resume" });
  }
});


// ── REWRITE ───────────────────────────────────────
app.post("/rewrite", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;
    if (!resumeText || !jobDescription)
      return res.status(400).json({ error: "Missing resumeText or jobDescription" });

    const aiResponse = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: `You are an elite ATS resume writer. Rewrite the candidate's resume to perfectly match the job description.

CRITICAL RULES:
- Return ONLY valid JSON, no markdown, no explanation
- Use strong action verbs: Led, Built, Designed, Developed, Implemented, Optimized, Delivered, Architected
- Naturally embed keywords from the job description
- Bullet format: "Action verb + what you did + measurable impact"
- ATS-friendly: no special chars, no tables
- Extract candidate's real name, email, phone, location from original resume
- Keep all real projects and experience from original resume, just improve the writing
- skills: flat list of strings, job-relevant skills first
- experience: array of real jobs from the resume with improved bullet points
- projects: array of real projects with improved descriptions

Return EXACTLY this JSON shape:
{
  "name": "Candidate Full Name",
  "email": "email@example.com",
  "phone": "phone number",
  "location": "City, State",
  "linkedin": "linkedin url or empty string",
  "github": "github url or empty string",
  "summary": "3-sentence professional summary aligned to JD",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Month Year – Month Year",
      "bullets": ["Action verb bullet 1", "Action verb bullet 2", "Action verb bullet 3"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "tech": "Tech stack used",
      "bullets": ["Action verb bullet 1", "Action verb bullet 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "school": "University Name",
      "year": "Graduation Year",
      "gpa": "GPA if mentioned or empty string"
    }
  ]
}

Original Resume:
${resumeText}

Target Job Description:
${jobDescription}`,
      }],
    });

    const raw = aiResponse.choices[0].message.content;
    const jsonMatch = raw.match(/{[\s\S]*}/);
    if (!jsonMatch) return res.status(500).json({ error: "AI did not return JSON" });

    let parsed;
    try { parsed = JSON.parse(jsonMatch[0]); }
    catch (e) {
      console.error("Rewrite parse error:", e);
      return res.status(500).json({ error: "Invalid AI JSON from rewrite" });
    }

    res.json({ rewrite: parsed });
  } catch (error) {
    console.error("REWRITE ERROR:", error);
    res.status(500).json({ error: "Error rewriting resume" });
  }
});


// ── GENERATE DOCX ─────────────────────────────────
app.post("/generate-docx", async (req, res) => {
  try {
    const { rewrite } = req.body;
    if (!rewrite) return res.status(400).json({ error: "No rewrite data provided" });

    const CONTENT_WIDTH = 9360; // US Letter, 1-inch margins

    // Helper: section divider line
    const divider = () => new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "7C3AED", space: 1 } },
      spacing: { before: 160, after: 80 },
      children: []
    });

    // Helper: section heading
    const sectionHead = (text) => new Paragraph({
      spacing: { before: 200, after: 60 },
      children: [new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: 22,
        font: "Arial",
        color: "7C3AED",
        characterSpacing: 80,
      })]
    });

    // Helper: bullet paragraph
    const bullet = (text) => new Paragraph({
      numbering: { reference: "resume-bullets", level: 0 },
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text, font: "Arial", size: 20 })]
    });

    // Helper: skill chip row (wrapped paragraph)
    const skillsLine = (skills) => new Paragraph({
      spacing: { before: 60, after: 60 },
      children: skills.map((s, i) => [
        new TextRun({ text: s, font: "Arial", size: 20, bold: false }),
        i < skills.length - 1
          ? new TextRun({ text: "  •  ", font: "Arial", size: 20, color: "7C3AED" })
          : null
      ]).flat().filter(Boolean)
    });

    const children = [];

    // ── NAME ──
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [new TextRun({
        text: rewrite.name || "Your Name",
        bold: true,
        size: 52,
        font: "Arial",
        color: "1A1A2E",
      })]
    }));

    // ── CONTACT LINE ──
    const contactParts = [
      rewrite.email, rewrite.phone, rewrite.location,
      rewrite.linkedin, rewrite.github
    ].filter(Boolean);

    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: contactParts.map((p, i) => [
        new TextRun({ text: p, font: "Arial", size: 18, color: "444444" }),
        i < contactParts.length - 1
          ? new TextRun({ text: "   |   ", font: "Arial", size: 18, color: "999999" })
          : null
      ]).flat().filter(Boolean)
    }));

    // ── SUMMARY ──
    if (rewrite.summary) {
      children.push(sectionHead("Professional Summary"));
      children.push(divider());
      children.push(new Paragraph({
        spacing: { before: 60, after: 100 },
        children: [new TextRun({ text: rewrite.summary, font: "Arial", size: 20, color: "333333", italics: true })]
      }));
    }

    // ── SKILLS ──
    if (rewrite.skills?.length) {
      children.push(sectionHead("Technical Skills"));
      children.push(divider());
      // Group into rows of 5
      const rows = [];
      for (let i = 0; i < rewrite.skills.length; i += 5) rows.push(rewrite.skills.slice(i, i + 5));
      rows.forEach(row => children.push(skillsLine(row)));
      children.push(new Paragraph({ spacing: { before: 60, after: 0 }, children: [] }));
    }

    // ── EXPERIENCE ──
    if (rewrite.experience?.length) {
      children.push(sectionHead("Work Experience"));
      children.push(divider());
      rewrite.experience.forEach(exp => {
        // Title + Duration on same line
        children.push(new Paragraph({
          spacing: { before: 120, after: 20 },
          children: [
            new TextRun({ text: exp.title || "", bold: true, size: 22, font: "Arial", color: "1A1A2E" }),
            new TextRun({ text: `   ${exp.duration || ""}`, size: 20, font: "Arial", color: "888888" }),
          ]
        }));
        // Company
        children.push(new Paragraph({
          spacing: { before: 0, after: 60 },
          children: [new TextRun({ text: exp.company || "", size: 20, font: "Arial", color: "7C3AED", bold: false })]
        }));
        // Bullets
        (exp.bullets || []).forEach(b => children.push(bullet(b)));
      });
    }

    // ── PROJECTS ──
    if (rewrite.projects?.length) {
      children.push(sectionHead("Projects"));
      children.push(divider());
      rewrite.projects.forEach(proj => {
        children.push(new Paragraph({
          spacing: { before: 120, after: 20 },
          children: [
            new TextRun({ text: proj.name || "", bold: true, size: 22, font: "Arial", color: "1A1A2E" }),
            proj.tech ? new TextRun({ text: `  ·  ${proj.tech}`, size: 18, font: "Arial", color: "888888" }) : null,
          ].filter(Boolean)
        }));
        (proj.bullets || []).forEach(b => children.push(bullet(b)));
      });
    }

    // ── EDUCATION ──
    if (rewrite.education?.length) {
      children.push(sectionHead("Education"));
      children.push(divider());
      rewrite.education.forEach(edu => {
        children.push(new Paragraph({
          spacing: { before: 100, after: 20 },
          children: [
            new TextRun({ text: edu.degree || "", bold: true, size: 22, font: "Arial", color: "1A1A2E" }),
            new TextRun({ text: `   ${edu.year || ""}`, size: 20, font: "Arial", color: "888888" }),
          ]
        }));
        children.push(new Paragraph({
          spacing: { before: 0, after: 60 },
          children: [
            new TextRun({ text: edu.school || "", size: 20, font: "Arial", color: "7C3AED" }),
            edu.gpa ? new TextRun({ text: `   GPA: ${edu.gpa}`, size: 20, font: "Arial", color: "888888" }) : null,
          ].filter(Boolean)
        }));
      });
    }

    const doc = new Document({
      numbering: {
        config: [{
          reference: "resume-bullets",
          levels: [{
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 440, hanging: 280 } } }
          }]
        }]
      },
      styles: {
        default: {
          document: { run: { font: "Arial", size: 20, color: "222222" } }
        }
      },
      sections: [{
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
          }
        },
        children
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `${(rewrite.name || "Resume").replace(/\s+/g, "_")}_ATS_Resume.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    console.error("DOCX ERROR:", error);
    res.status(500).json({ error: "Failed to generate DOCX: " + error.message });
  }
});


// ── JOBS ──────────────────────────────────────────
app.post("/jobs", async (req, res) => {
  try {
    const { skills } = req.body;
    if (!skills?.length) return res.status(400).json({ error: "No skills provided" });

    const query = skills.slice(0, 5).join(" ");
    const response = await axios.get(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}`);

    const jobs = response.data.jobs.map(job => {
      const text = (job.title + " " + job.description).toLowerCase();
      let score = 0;
      skills.forEach(skill => { if (text.includes(skill.toLowerCase())) score++; });
      return { title: job.title, company: job.company_name, location: job.candidate_required_location, url: job.url, score };
    });

    res.json({
      jobs: jobs.filter(j => j.score > 0).sort((a, b) => b.score - a.score).slice(0, 8)
    });
  } catch (error) {
    console.error("JOBS ERROR:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});


app.listen(5000, () => console.log("Server running on port 5000 🚀"));