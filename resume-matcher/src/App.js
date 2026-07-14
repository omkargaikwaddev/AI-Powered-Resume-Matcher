import React, { useState, useRef, useEffect } from "react";
import "./App.css";

/* ── Score Ring ── */
function ScoreRing({ pct }) {
  const r = 52, circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setOffset(circ); setCount(0);
    const t1 = setTimeout(() => setOffset(circ - (pct / 100) * circ), 100);
    let raf, cur = 0;
    const tick = () => { cur = Math.min(cur + 2, pct); setCount(cur); if (cur < pct) raf = requestAnimationFrame(tick); };
    const t2 = setTimeout(() => { raf = requestAnimationFrame(tick); }, 100);
    return () => { clearTimeout(t1); clearTimeout(t2); cancelAnimationFrame(raf); };
  }, [pct, circ]);

  const color = pct >= 75 ? "#34D399" : pct >= 50 ? "#F59E0B" : "#FF6B6B";
  const label = pct >= 75 ? "Strong fit 🎯" : pct >= 50 ? "Decent fit ⚡" : "Partial fit 📌";

  return (
    <div className="ring-wrap">
      <div className="ring-svg-wrap">
        <svg width="124" height="124" viewBox="0 0 124 124" style={{ transform: "rotate(-90deg)", display: "block" }}>
          <defs>
            <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          <circle cx="62" cy="62" r={r} fill="none" stroke="#162035" strokeWidth="9" />
          <circle cx="62" cy="62" r={r} fill="none" stroke="url(#rg)" strokeWidth="9"
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)" }} />
        </svg>
        <div className="ring-center">
          <span className="ring-num" style={{ color }}>{count}</span>
          <span className="ring-unit">%</span>
        </div>
      </div>
      <p className="ring-label" style={{ color }}>{label}</p>
    </div>
  );
}

/* ── Skeleton ── */
function Skeleton() {
  return (
    <div className="skeleton-wrap">
      <div className="skel skel-ring" />
      <div className="skel skel-line" style={{ width: "60%", marginTop: 20 }} />
      <div className="skel skel-line" style={{ width: "80%", marginTop: 10 }} />
      <div className="skel skel-line" style={{ width: "70%", marginTop: 10 }} />
    </div>
  );
}

/* ── Job Card ── */
function JobCard({ job, index }) {
  return (
    <div className="job-card" style={{ animationDelay: `${index * 0.07}s` }}>
      <div className="job-card-header">
        <div className="job-icon">{job.company?.[0] ?? "J"}</div>
        <div>
          <h3 className="job-title">{job.title}</h3>
          <p className="job-company">{job.company}</p>
        </div>
      </div>
      {job.location && <p className="job-location">📍 {job.location}</p>}
      <div className="job-footer">
        <span className="job-score-badge">{job.score} skill{job.score !== 1 ? "s" : ""} matched</span>
        <a href={job.url} target="_blank" rel="noreferrer" className="apply-btn">
          Apply <span className="apply-arrow">→</span>
        </a>
      </div>
    </div>
  );
}

/* ── Rewrite Display ── */
function RewriteDisplay({ rewrite, onDownload, downloading }) {
  const [tab, setTab] = useState("summary");

  const tabs = [
    { id: "summary",   label: "📝 Summary" },
    { id: "skills",    label: "🛠 Skills" },
    { id: "experience",label: "💼 Experience" },
    { id: "projects",  label: "🚀 Projects" },
    { id: "education", label: "🎓 Education" },
  ];

  return (
    <div className="rewrite-section">
      {/* Header */}
      <div className="rewrite-section-header">
        <div className="rewrite-section-title">
          <div>
            <span className="rewrite-badge">✨ ATS-Optimized Resume</span>
            <p className="rewrite-section-subtitle">
              Rewritten to match the job description · Ready to download
            </p>
          </div>
        </div>
        <button className="download-btn" onClick={onDownload} disabled={downloading}>
          <span className="download-btn-icon">{downloading ? "⏳" : "⬇️"}</span>
          {downloading ? "Generating…" : "Download .docx"}
        </button>
      </div>

      {/* Tabs */}
      <div className="rewrite-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`rewrite-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="rewrite-tab-body">

        {tab === "summary" && (
          <div>
            <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 600 }}>
              Professional Summary
            </p>
            <div className="rewrite-summary-card">{rewrite.summary}</div>
          </div>
        )}

        {tab === "skills" && (
          <div>
            <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 12, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 600 }}>
              {rewrite.skills?.length} skills · ordered by JD relevance
            </p>
            <div className="rewrite-skills-grid">
              {rewrite.skills?.map((s, i) => <span key={i} className="skill-chip">{s}</span>)}
            </div>
          </div>
        )}

        {tab === "experience" && (
          <div className="rewrite-items">
            {rewrite.experience?.length ? rewrite.experience.map((exp, i) => (
              <div key={i} className="rewrite-item">
                <div className="rewrite-item-header">
                  <p className="rewrite-item-title">{exp.title}</p>
                  <span className="rewrite-item-duration">{exp.duration}</span>
                </div>
                <p className="rewrite-item-sub">{exp.company}</p>
                <ul className="rewrite-bullets">
                  {exp.bullets?.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            )) : <p style={{ color: "var(--muted)", fontSize: 14 }}>No experience data found in resume.</p>}
          </div>
        )}

        {tab === "projects" && (
          <div className="rewrite-items">
            {rewrite.projects?.length ? rewrite.projects.map((proj, i) => (
              <div key={i} className="rewrite-item">
                <p className="rewrite-item-title" style={{ marginBottom: 6 }}>{proj.name}</p>
                {proj.tech && <span className="rewrite-item-tech">{proj.tech}</span>}
                <ul className="rewrite-bullets">
                  {proj.bullets?.map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            )) : <p style={{ color: "var(--muted)", fontSize: 14 }}>No projects found in resume.</p>}
          </div>
        )}

        {tab === "education" && (
          <div className="edu-items">
            {rewrite.education?.length ? rewrite.education.map((edu, i) => (
              <div key={i} className="edu-item">
                <div>
                  <p className="edu-degree">{edu.degree}</p>
                  <p className="edu-school">{edu.school}{edu.gpa ? ` · GPA: ${edu.gpa}` : ""}</p>
                </div>
                <span className="edu-year">{edu.year}</span>
              </div>
            )) : <p style={{ color: "var(--muted)", fontSize: 14 }}>No education data found in resume.</p>}
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Main App ── */
export default function App() {
  const [resume, setResume]           = useState(null);
  const [jobDesc, setJobDesc]         = useState("");
  const [result, setResult]           = useState(null);
  const [resumeText, setResumeText]   = useState("");
  const [jobs, setJobs]               = useState([]);
  const [loading, setLoading]         = useState(false);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [error, setError]             = useState("");
  const [dragging, setDragging]       = useState(false);
  const [rewrite, setRewrite]         = useState(null);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteError, setRewriteError]     = useState("");
  const [downloading, setDownloading]       = useState(false);

  const fileRef    = useRef();
  const rewriteRef = useRef();

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") setResume(f);
  };

  /* Analyze */
  const handleAnalyze = async () => {
    if (!resume || !jobDesc.trim()) return;
    setLoading(true); setError(""); setResult(null); setJobs([]);
    setRewrite(null); setRewriteError("");

    try {
      const fd = new FormData();
      fd.append("resume", resume);
      fd.append("jobDescription", jobDesc);
      const res = await fetch("http://localhost:5000/analyze", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setResult(data.result);
      setResumeText(data.result.resumeText || "");
      setLoading(false);

      const skills = data.result?.extractedSkills || [];
      if (skills.length) {
        setJobsLoading(true);
        try {
          const jr = await fetch("http://localhost:5000/jobs", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ skills }),
          });
          const jd = await jr.json();
          setJobs(jd.jobs || []);
        } catch { } finally { setJobsLoading(false); }
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Is the backend running?");
      setLoading(false);
    }
  };

  /* Rewrite */
  const handleRewrite = async () => {
    if (!resumeText || !jobDesc.trim()) return;
    setRewriteLoading(true); setRewriteError(""); setRewrite(null);
    setTimeout(() => rewriteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);

    try {
      const res = await fetch("http://localhost:5000/rewrite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription: jobDesc }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setRewrite(data.rewrite);
    } catch (err) {
      setRewriteError(err.message || "Rewrite failed. Is backend running?");
    } finally {
      setRewriteLoading(false);
    }
  };

  /* Download DOCX */
  const handleDownload = async () => {
    if (!rewrite) return;
    setDownloading(true);
    try {
      const res = await fetch("http://localhost:5000/generate-docx", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewrite }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(rewrite.name || "Resume").replace(/\s+/g, "_")}_ATS_Resume.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setRewriteError("Download failed: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const canAnalyze = resume && jobDesc.trim().length > 20 && !loading;
  const canRewrite = !!result && !!resumeText && jobDesc.trim().length > 20 && !rewriteLoading;

  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <div className="eyebrow"><span className="eyebrow-dot" /> AI-Powered · Real-time Analysis</div>
        <h1 className="headline">Match your resume to <em>any job</em></h1>
        <p className="headline-sub">
          Upload your PDF, paste a job description — get a match score, skill gaps, and curated openings instantly.
        </p>
        <div className="stats-bar">
          <div><div className="stat-num">98%</div><div className="stat-lbl">AI Accuracy</div></div>
          <div className="stat-sep" />
          <div><div className="stat-num">&lt;10s</div><div className="stat-lbl">Analysis Time</div></div>
          <div className="stat-sep" />
          <div><div className="stat-num">500+</div><div className="stat-lbl">Jobs Indexed</div></div>
        </div>
      </header>

      {/* Main 2-col grid */}
      <div className="main-grid">

        {/* Left: Inputs */}
        <div className="panel">
          <p className="panel-label">01 — Resume</p>
          <div
            className={`drop-zone${dragging ? " drag-over" : ""}${resume ? " has-file" : ""}`}
            onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
            onClick={() => fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
              onChange={(e) => setResume(e.target.files[0])} />
            <div className="drop-icon">{resume ? "✓" : "↑"}</div>
            {resume ? (
              <><p className="drop-main" style={{ color: "#34D399" }}>{resume.name}</p><p className="drop-sub">Click to replace</p></>
            ) : (
              <><p className="drop-main"><strong>Click to upload</strong> or drag here</p><p className="drop-sub">PDF only · max 5 MB</p></>
            )}
          </div>

          <p className="panel-label" style={{ marginTop: 22 }}>02 — Job Description</p>
          <textarea className="jd-input"
            placeholder="Paste the full job posting here — the more detail, the better the match…"
            value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} />

          <button className="analyze-btn" onClick={handleAnalyze} disabled={!canAnalyze}>
            {loading ? <><span className="btn-spinner" /> Analyzing…</> : "Analyze Resume"}
          </button>
          {error && <p className="error-box">{error}</p>}
        </div>

        {/* Right: Result */}
        <div className="panel result-panel">
          {!result && !loading && (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <p>Your match score, strengths, and skill gaps will appear here after analysis.</p>
            </div>
          )}

          {loading && <Skeleton />}

          {result && !loading && (
            <div className="result-content">
              <ScoreRing pct={parseInt(result.matchPercentage) || 0} />

              {result.strengths?.length > 0 && (
                <div className="skills-block">
                  <p className="skills-label strengths-label">Strengths</p>
                  <ul className="skills-list">
                    {result.strengths.map((s, i) => (
                      <li key={i}><span className="dot green-dot" />{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.missingSkills?.length > 0 && (
                <div className="skills-block" style={{ marginTop: 14 }}>
                  <p className="skills-label missing-label">Skills to develop</p>
                  <ul className="skills-list">
                    {result.missingSkills.map((s, i) => (
                      <li key={i}><span className="dot red-dot" />{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ✨ Improve Resume Button */}
              <div className="rewrite-btn-wrap">
                <button className="rewrite-btn" onClick={handleRewrite} disabled={!canRewrite}>
                  {rewriteLoading
                    ? <><span className="btn-spinner" /> Rewriting Resume…</>
                    : <><span className="rewrite-btn-icon">✨</span> Improve Resume</>
                  }
                </button>
                <p className="rewrite-btn-hint">
                  AI rewrites your entire resume aligned to this job description.<br />
                  Download as a formatted Word file, ready to apply.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rewrite Section — full width */}
      <div ref={rewriteRef}>
        {rewriteLoading && (
          <div className="rewrite-section">
            <div className="rewrite-loading">
              <div className="rewrite-loading-spinner" />
              <p>Rewriting your resume for ATS…</p>
              <span>Crafting action verbs · Embedding keywords · Aligning to JD</span>
            </div>
          </div>
        )}

        {rewriteError && !rewriteLoading && (
          <div className="rewrite-section">
            <p className="rewrite-error">{rewriteError}</p>
          </div>
        )}

        {rewrite && !rewriteLoading && (
          <RewriteDisplay rewrite={rewrite} onDownload={handleDownload} downloading={downloading} />
        )}
      </div>

      {/* Jobs */}
      {(jobs.length > 0 || jobsLoading) && (
        <section className="jobs-section">
          <div className="jobs-header">
            <h2>Matching Jobs</h2>
            {!jobsLoading && <span className="jobs-count">{jobs.length} found</span>}
          </div>
          {jobsLoading
            ? <p className="jobs-loading">Fetching matching jobs…</p>
            : <div className="jobs-grid">
                {jobs.map((job, i) => <JobCard key={i} job={job} index={i} />)}
              </div>
          }
        </section>
      )}
    </div>
  );
}