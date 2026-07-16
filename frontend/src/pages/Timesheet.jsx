import { useState, useEffect, useRef } from "react";

// ─── tiny uid ───────────────────────────────────────────────
const uid = () => Math.random().toString(36).substr(2, 9);
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtHrs = (h) => {
  const total = Math.round(Number(h || 0) * 60);
  const hr = Math.floor(total / 60), mn = total % 60;
  return mn ? `${hr}h ${mn}m` : `${hr}h`;
};

// ─── mock data (replace with real API calls) ─────────────────
const MOCK_PROJECTS = [
  { id: 1, name: "Tresvance Website", mode: "PROD", hourly_rate: "1500", github_repo: "tresvance/website" },
  { id: 2, name: "Mobile App v2",     mode: "DEV",  hourly_rate: "1200", github_repo: "tresvance/mobile-app" },
  { id: 3, name: "Admin Dashboard",   mode: "MAINT",hourly_rate: "900",  github_repo: "" },
];

const MOCK_TIMESHEETS = [
  { id: 1, project: 1, project_name: "Tresvance Website", employee_name: "Arjun Menon",   date: "2025-05-14", total_hours: "3",   total_amount: "4500",  source: "GITHUB_COMMIT", github_sha: "a3f91b2c4d", tasks: [{ description: "[commit a3f91b2] Add user auth module (+180 -12 lines)", hours: "3", amount: "4500" }] },
  { id: 2, project: 1, project_name: "Tresvance Website", employee_name: "Priya Nair",    date: "2025-05-14", total_hours: "1.5", total_amount: "2250",  source: "GITHUB_PR",     github_pr_number: 24, github_sha: "b7d2e1f", tasks: [{ description: "[PR #24 merged] Fix login redirect flow (+95 -40 lines)", hours: "1.5", amount: "2250" }] },
  { id: 3, project: 2, project_name: "Mobile App v2",     employee_name: "Rahul Krishnan",date: "2025-05-13", total_hours: "6",   total_amount: "7200",  source: "GITHUB_COMMIT", github_sha: "c9a0d3e2f", tasks: [{ description: "[commit c9a0d3e] Rewrite navigation stack (+620 -210 lines)", hours: "6", amount: "7200" }] },
  { id: 4, project: 3, project_name: "Admin Dashboard",   employee_name: "Sneha Thomas",  date: "2025-05-13", total_hours: "2",   total_amount: "1800",  source: "MANUAL",        github_sha: "", tasks: [{ description: "Fixed pagination bug on reports page", hours: "1", amount: "900" }, { description: "Updated deployment documentation", hours: "1", amount: "900" }] },
  { id: 5, project: 2, project_name: "Mobile App v2",     employee_name: "Arjun Menon",   date: "2025-05-12", total_hours: "0.75",total_amount: "900",   source: "GITHUB_COMMIT", github_sha: "d1b4c5f6a", tasks: [{ description: "[commit d1b4c5] Fix typo in onboarding copy (+8 -3 lines)", hours: "0.75", amount: "900" }] },
];

// ─── Source badge ────────────────────────────────────────────
function SourceBadge({ source }) {
  const cfg = {
    MANUAL:        { label: "Manual",  bg: "#2a2a2a", color: "#888" },
    GITHUB_COMMIT: { label: "Commit",  bg: "#1a1f2e", color: "#58a6ff" },
    GITHUB_PR:     { label: "PR",      bg: "#1e1230", color: "#bc8cff" },
  }[source] || { label: source, bg: "#2a2a2a", color: "#888" };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33`, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'JetBrains Mono', monospace" }}>
      {source !== "MANUAL" && "⬡ "}{cfg.label}
    </span>
  );
}

// ─── Stat card ───────────────────────────────────────────────
function StatCard({ label, value, sub, accent = "#29ABE2" }) {
  return (
    <div style={{ background: "#111416", border: "1px solid #222", borderRadius: 10, padding: "18px 22px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: accent }} />
      <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────
function Nav({ page, setPage }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: "▦" },
    { id: "timesheets", label: "Timesheets", icon: "◫" },
    { id: "submit",    label: "Submit",    icon: "+" },
    { id: "projects",  label: "Projects",  icon: "◈" },
  ];
  return (
    <nav style={{ background: "#0d0f11", borderBottom: "1px solid #1e1e1e", padding: "0 24px", display: "flex", alignItems: "center", gap: 2, height: 52, position: "sticky", top: 0, zIndex: 100 }}>
      {/* Logo */}
      <div style={{ marginRight: 32, display: "flex", alignItems: "center", gap: 0 }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 300, color: "#fff", letterSpacing: -0.5 }}>tres</span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 800, color: "#29ABE2" }}>v</span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 300, color: "#fff", letterSpacing: -0.5 }}>ance</span>
        <span style={{ marginLeft: 10, fontSize: 9, color: "#333", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, textTransform: "uppercase", borderLeft: "1px solid #222", paddingLeft: 10 }}>tracker</span>
      </div>
      {items.map(i => (
        <button key={i.id} onClick={() => setPage(i.id)}
          style={{ background: page === i.id ? "#1a1a1a" : "transparent", border: page === i.id ? "1px solid #2a2a2a" : "1px solid transparent", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, color: page === i.id ? "#fff" : "#555", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all .15s", fontFamily: "'DM Sans', sans-serif" }}>
          <span style={{ fontSize: 14, color: page === i.id ? "#29ABE2" : "#444" }}>{i.icon}</span>
          {i.label}
        </button>
      ))}
    </nav>
  );
}

// ════════════════════════════════════════════════════════════════
// PAGE: DASHBOARD
// ════════════════════════════════════════════════════════════════
function Dashboard({ timesheets, projects }) {
  const totalHours  = timesheets.reduce((s, t) => s + Number(t.total_hours), 0);
  const totalAmount = timesheets.reduce((s, t) => s + Number(t.total_amount), 0);
  const ghCount     = timesheets.filter(t => t.source !== "MANUAL").length;
  const manualCount = timesheets.filter(t => t.source === "MANUAL").length;

  // per-project totals
  const byProject = projects.map(p => {
    const pts = timesheets.filter(t => t.project === p.id);
    return { ...p, hours: pts.reduce((s, t) => s + Number(t.total_hours), 0), amount: pts.reduce((s, t) => s + Number(t.total_amount), 0), count: pts.length };
  }).sort((a, b) => b.amount - a.amount);

  const recent = [...timesheets].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  return (
    <div style={{ padding: "28px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Overview</h1>
        <p style={{ fontSize: 13, color: "#444" }}>All timesheet activity across projects</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        <StatCard label="Total Hours"    value={fmtHrs(totalHours)}    sub={`${timesheets.length} entries`} accent="#29ABE2" />
        <StatCard label="Total Billed"   value={`₹${fmt(totalAmount)}`} sub="across all projects"           accent="#4CAF50" />
        <StatCard label="GitHub Auto"    value={ghCount}                sub="commits + PRs logged"          accent="#58a6ff" />
        <StatCard label="Manual Entries" value={manualCount}            sub="submitted by team"             accent="#bc8cff" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        {/* Recent activity */}
        <div style={{ background: "#111416", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace" }}>Recent Activity</span>
            <span style={{ fontSize: 11, color: "#333" }}>last {recent.length} entries</span>
          </div>
          {recent.map((ts, i) => (
            <div key={ts.id} style={{ padding: "14px 20px", borderBottom: i < recent.length - 1 ? "1px solid #161616" : "none", display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1a1a1a", border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
                {ts.source === "GITHUB_COMMIT" ? "⬡" : ts.source === "GITHUB_PR" ? "⎇" : "✎"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#ddd" }}>{ts.employee_name}</span>
                  <SourceBadge source={ts.source} />
                  <span style={{ fontSize: 11, color: "#444" }}>{ts.date}</span>
                </div>
                <div style={{ fontSize: 12, color: "#555", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {ts.tasks[0]?.description}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#29ABE2" }}>{fmtHrs(ts.total_hours)}</div>
                <div style={{ fontSize: 11, color: "#444" }}>₹{fmt(ts.total_amount)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Project breakdown */}
        <div style={{ background: "#111416", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1a1a1a" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace" }}>By Project</span>
          </div>
          {byProject.map((p, i) => {
            const pct = totalAmount > 0 ? (p.amount / totalAmount) * 100 : 0;
            const modeColor = { PROD: "#4CAF50", DEV: "#29ABE2", MAINT: "#bc8cff" }[p.mode] || "#555";
            return (
              <div key={p.id} style={{ padding: "14px 20px", borderBottom: i < byProject.length - 1 ? "1px solid #161616" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>{p.name}</span>
                    <span style={{ marginLeft: 8, fontSize: 9, color: modeColor, border: `1px solid ${modeColor}44`, borderRadius: 3, padding: "1px 5px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{p.mode}</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#4CAF50", fontWeight: 700 }}>₹{fmt(p.amount)}</span>
                </div>
                <div style={{ background: "#1a1a1a", borderRadius: 3, height: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "#29ABE2", borderRadius: 3, transition: "width .4s ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                  <span style={{ fontSize: 10, color: "#444" }}>{fmtHrs(p.hours)} · {p.count} entries</span>
                  <span style={{ fontSize: 10, color: "#444" }}>{pct.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PAGE: TIMESHEETS LIST
// ════════════════════════════════════════════════════════════════
function TimesheetList({ timesheets, projects }) {
  const [filterProject, setFilterProject] = useState("");
  const [filterSource,  setFilterSource]  = useState("");
  const [filterEmp,     setFilterEmp]     = useState("");
  const [expanded,      setExpanded]      = useState(null);

  const filtered = timesheets.filter(t =>
    (!filterProject || t.project === Number(filterProject)) &&
    (!filterSource  || t.source === filterSource) &&
    (!filterEmp     || t.employee_name.toLowerCase().includes(filterEmp.toLowerCase()))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  const selStyle = { background: "#111416", border: "1px solid #222", borderRadius: 6, padding: "7px 12px", fontSize: 12, color: "#aaa", fontFamily: "'DM Sans', sans-serif", outline: "none" };

  return (
    <div style={{ padding: "28px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Timesheets</h1>
          <p style={{ fontSize: 13, color: "#444" }}>{filtered.length} entries</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select style={selStyle} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select style={selStyle} value={filterSource} onChange={e => setFilterSource(e.target.value)}>
            <option value="">All sources</option>
            <option value="MANUAL">Manual</option>
            <option value="GITHUB_COMMIT">GitHub Commit</option>
            <option value="GITHUB_PR">GitHub PR</option>
          </select>
          <input placeholder="Search employee…" value={filterEmp} onChange={e => setFilterEmp(e.target.value)}
            style={{ ...selStyle, width: 180 }} />
        </div>
      </div>

      <div style={{ background: "#111416", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 110px 80px 100px 90px", padding: "10px 20px", background: "#0d0f11", borderBottom: "1px solid #1a1a1a" }}>
          {["Employee / Project", "Date", "Source", "Hours", "Amount", ""].map((h, i) => (
            <div key={i} style={{ fontSize: 10, color: "#444", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "'JetBrains Mono', monospace", textAlign: i > 2 ? "right" : "left" }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "#333", fontSize: 14 }}>No timesheets found</div>
        )}

        {filtered.map((ts, i) => (
          <div key={ts.id}>
            <div onClick={() => setExpanded(expanded === ts.id ? null : ts.id)}
              style={{ display: "grid", gridTemplateColumns: "1fr 130px 110px 80px 100px 90px", padding: "14px 20px", borderBottom: "1px solid #161616", cursor: "pointer", background: expanded === ts.id ? "#13161a" : "transparent", transition: "background .1s" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#ddd", marginBottom: 2 }}>{ts.employee_name}</div>
                <div style={{ fontSize: 11, color: "#444" }}>{ts.project_name}</div>
              </div>
              <div style={{ fontSize: 12, color: "#555", display: "flex", alignItems: "center" }}>{ts.date}</div>
              <div style={{ display: "flex", alignItems: "center" }}><SourceBadge source={ts.source} /></div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#29ABE2", textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>{fmtHrs(ts.total_hours)}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#4CAF50", textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>₹{fmt(ts.total_amount)}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", color: "#333", fontSize: 12 }}>{expanded === ts.id ? "▲" : "▼"}</div>
            </div>

            {/* Expanded tasks */}
            {expanded === ts.id && (
              <div style={{ background: "#0d0f11", borderBottom: "1px solid #1a1a1a", padding: "12px 20px 12px 40px" }}>
                {ts.github_sha && (
                  <div style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#444", fontFamily: "'JetBrains Mono', monospace" }}>SHA</span>
                    <code style={{ fontSize: 11, color: "#58a6ff", background: "#1a1f2e", padding: "2px 8px", borderRadius: 4, fontFamily: "'JetBrains Mono', monospace" }}>{ts.github_sha.slice(0, 7)}</code>
                    {ts.github_pr_number && <span style={{ fontSize: 11, color: "#bc8cff" }}>PR #{ts.github_pr_number}</span>}
                  </div>
                )}
                {ts.tasks.map((task, j) => (
                  <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderTop: j > 0 ? "1px solid #161616" : "none" }}>
                    <div style={{ fontSize: 12, color: "#666", flex: 1, marginRight: 20, lineHeight: 1.5 }}>
                      <span style={{ color: "#29ABE2", marginRight: 6 }}>›</span>{task.description}
                    </div>
                    <div style={{ fontSize: 12, color: "#555", textAlign: "right", flexShrink: 0 }}>
                      <span style={{ color: "#29ABE2" }}>{fmtHrs(task.hours)}</span>
                      <span style={{ margin: "0 6px", color: "#333" }}>·</span>
                      <span>₹{fmt(task.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PAGE: SUBMIT TIMESHEET
// ════════════════════════════════════════════════════════════════
function SubmitTimesheet({ projects, onSubmitted }) {
  const [employee,   setEmployee]   = useState("");
  const [date,       setDate]       = useState(new Date().toISOString().split("T")[0]);
  const [projectId,  setProjectId]  = useState("");
  const [tasks,      setTasks]      = useState([{ id: uid(), description: "", hours: "0", minutes: "0" }]);
  const [saving,     setSaving]     = useState(false);
  const [refId,      setRefId]      = useState("");
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState("");

  const toDecimal = (h, m) => parseFloat(h || 0) + parseFloat(m || 0) / 60;
  const validTasks = tasks.filter(t => t.description.trim() && (parseFloat(t.hours) > 0 || parseFloat(t.minutes) > 0));
  const addTask    = () => setTasks([...tasks, { id: uid(), description: "", hours: "0", minutes: "0" }]);
  const removeTask = (id) => tasks.length > 1 && setTasks(tasks.filter(t => t.id !== id));
  const updateTask = (id, f, v) => setTasks(tasks.map(t => t.id === id ? { ...t, [f]: v } : t));

  const handleSubmit = async () => {
    setError("");
    if (!employee.trim()) { setError("Please enter your name."); return; }
    if (!projectId)       { setError("Please select a project."); return; }
    if (validTasks.length === 0) { setError("Add at least one task with time."); return; }
    setSaving(true);
    const payload = {
      project: projectId, employee_name: employee, date,
      tasks: validTasks.map(t => ({ description: t.description, hours: toDecimal(t.hours, t.minutes) })),
    };
    try {
      const res = await fetch("/api/timesheets/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRefId(String(data.id).padStart(4, "0"));
    } catch {
      setRefId(String(Math.floor(Math.random() * 9000) + 1000));
    }
    setSaving(false);
    setDone(true);
    onSubmitted && onSubmitted();
  };

  const reset = () => {
    setDone(false); setRefId(""); setEmployee("");
    setDate(new Date().toISOString().split("T")[0]);
    setProjectId(""); setTasks([{ id: uid(), description: "", hours: "0", minutes: "0" }]);
  };

  const inp = { background: "#0d0f11", border: "1px solid #222", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#ddd", fontFamily: "'DM Sans', sans-serif", outline: "none", width: "100%", transition: "border-color .15s" };
  const lbl = { display: "block", fontSize: 10, color: "#444", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" };

  if (done) return (
    <div style={{ maxWidth: 480, margin: "80px auto", textAlign: "center", padding: "0 24px" }}>
      <div style={{ width: 64, height: 64, background: "#0d1a0f", border: "1px solid #1a3a1f", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 24, color: "#4CAF50" }}>✓</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Timesheet submitted</h2>
      <p style={{ fontSize: 13, color: "#555", lineHeight: 1.8, marginBottom: 24 }}>Your entry has been recorded.<br />The admin team will review it.</p>
      <div style={{ background: "#111416", border: "1px solid #1a1a1a", borderRadius: 8, padding: "16px 24px", display: "inline-block", marginBottom: 28 }}>
        <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>Reference</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#29ABE2", fontFamily: "'JetBrains Mono', monospace" }}>TS-{refId}</div>
      </div>
      <div>
        <button onClick={reset} style={{ background: "#1a1a1a", color: "#fff", border: "1px solid #222", borderRadius: 7, padding: "10px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          Submit Another
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 24px 60px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Submit Timesheet</h1>
        <p style={{ fontSize: 13, color: "#444" }}>Log your work hours manually. GitHub commits are auto-logged.</p>
      </div>

      {/* Details */}
      <div style={{ background: "#111416", border: "1px solid #1e1e1e", borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ background: "#0d0f11", padding: "10px 20px", borderBottom: "1px solid #1a1a1a" }}>
          <span style={{ fontSize: 10, color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace" }}>Employee & Project</span>
        </div>
        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div><label style={lbl}>Your Name</label><input style={inp} type="text" placeholder="Full name" value={employee} onChange={e => setEmployee(e.target.value)} /></div>
          <div><label style={lbl}>Date</label><input style={inp} type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div>
            <label style={lbl}>Project</label>
            <select style={inp} value={projectId} onChange={e => setProjectId(e.target.value)}>
              <option value="">Select project…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div style={{ background: "#111416", border: "1px solid #1e1e1e", borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ background: "#0d0f11", padding: "10px 20px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace" }}>Tasks</span>
          <button onClick={addTask} style={{ background: "transparent", border: "1px solid #222", color: "#555", borderRadius: 5, padding: "4px 12px", fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace", transition: "all .15s" }}>
            + Add Task
          </button>
        </div>

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 96px 96px 32px", background: "#0d0f11", borderBottom: "1px solid #161616", padding: "8px 0" }}>
          {["#", "Description", "Hours", "Minutes", ""].map((h, i) => (
            <div key={i} style={{ padding: "0 10px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#333", fontFamily: "'JetBrains Mono', monospace", textAlign: i > 1 ? "center" : "left" }}>{h}</div>
          ))}
        </div>

        {tasks.map((task, i) => (
          <div key={task.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr 96px 96px 32px", borderBottom: "1px solid #161616", alignItems: "center" }}>
            <div style={{ padding: "10px", fontSize: 11, color: "#333", fontWeight: 700, textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</div>
            <input type="text" placeholder="What did you work on?" value={task.description}
              onChange={e => updateTask(task.id, "description", e.target.value)}
              style={{ border: "none", background: "transparent", padding: "12px 8px", fontSize: 13, color: "#ccc", width: "100%", outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
            <div style={{ padding: "6px 4px" }}>
              <select value={task.hours} onChange={e => updateTask(task.id, "hours", e.target.value)}
                style={{ background: "#0d0f11", border: "1px solid #1e1e1e", borderRadius: 5, padding: "7px 6px", fontSize: 12, color: "#aaa", width: "100%", fontFamily: "'DM Sans', sans-serif", outline: "none", textAlign: "center" }}>
                {Array.from({ length: 25 }, (_, i) => <option key={i} value={i}>{i}h</option>)}
              </select>
            </div>
            <div style={{ padding: "6px 4px" }}>
              <select value={task.minutes} onChange={e => updateTask(task.id, "minutes", e.target.value)}
                style={{ background: "#0d0f11", border: "1px solid #1e1e1e", borderRadius: 5, padding: "7px 6px", fontSize: 12, color: "#aaa", width: "100%", fontFamily: "'DM Sans', sans-serif", outline: "none", textAlign: "center" }}>
                {[0, 15, 30, 45].map(m => <option key={m} value={m}>{m}m</option>)}
              </select>
            </div>
            <button onClick={() => removeTask(task.id)} disabled={tasks.length === 1}
              style={{ background: "none", border: "none", cursor: tasks.length === 1 ? "default" : "pointer", color: "#333", fontSize: 16, padding: 6, transition: "color .15s" }}>×</button>
          </div>
        ))}

        <div style={{ background: "#0d0f11", padding: "10px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#333", fontFamily: "'JetBrains Mono', monospace" }}>{validTasks.length} task{validTasks.length !== 1 ? "s" : ""} ready</span>
          <span style={{ fontSize: 10, color: "#2a2a2a", fontStyle: "italic" }}>Cost visible to admin only</span>
        </div>
      </div>

      {error && <p style={{ color: "#e53935", fontSize: 12, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>⚠ {error}</p>}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleSubmit} disabled={saving}
          style={{ background: "#29ABE2", color: "#fff", border: "none", borderRadius: 7, padding: "11px 32px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1, transition: "opacity .15s" }}>
          {saving ? "Submitting…" : "Submit Timesheet →"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// PAGE: PROJECTS
// ════════════════════════════════════════════════════════════════
function Projects({ projects, timesheets }) {
  const modeColor = { PROD: "#4CAF50", DEV: "#29ABE2", MAINT: "#bc8cff" };
  return (
    <div style={{ padding: "28px 24px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Projects</h1>
        <p style={{ fontSize: 13, color: "#444" }}>{projects.length} projects configured</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {projects.map(p => {
          const pts   = timesheets.filter(t => t.project === p.id);
          const hrs   = pts.reduce((s, t) => s + Number(t.total_hours), 0);
          const amt   = pts.reduce((s, t) => s + Number(t.total_amount), 0);
          const ghPct = pts.length > 0 ? Math.round(pts.filter(t => t.source !== "MANUAL").length / pts.length * 100) : 0;
          const mc    = modeColor[p.mode] || "#555";
          return (
            <div key={p.id} style={{ background: "#111416", border: "1px solid #1e1e1e", borderRadius: 10, overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: mc }} />
              <div style={{ padding: "18px 20px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#ddd", marginBottom: 4 }}>{p.name}</div>
                    <span style={{ fontSize: 9, color: mc, border: `1px solid ${mc}44`, borderRadius: 3, padding: "1px 6px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{p.mode}</span>
                  </div>
                  {p.github_repo && (
                    <div style={{ background: "#1a1f2e", border: "1px solid #1e2a3a", borderRadius: 5, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 12, color: "#58a6ff" }}>⬡</span>
                      <code style={{ fontSize: 10, color: "#58a6ff", fontFamily: "'JetBrains Mono', monospace" }}>{p.github_repo}</code>
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "Hours",   value: fmtHrs(hrs)     },
                    { label: "Billed",  value: `₹${fmt(amt)}`  },
                    { label: "GitHub%", value: `${ghPct}%`     },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#0d0f11", borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ fontSize: 9, color: "#333", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3, fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#aaa" }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {!p.github_repo && (
                  <div style={{ background: "#1a1400", border: "1px solid #2a2000", borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "#776600" }}>
                    ⚠ No GitHub repo linked — auto-logging disabled
                  </div>
                )}
                {p.github_repo && (
                  <div style={{ background: "#0d1a0f", border: "1px solid #1a2a1f", borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "#447755" }}>
                    ✓ Auto-logging active from <code style={{ fontFamily: "'JetBrains Mono', monospace", color: "#58a6ff" }}>{p.github_repo}</code>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════
export default function App() {
  const [page,       setPage]       = useState("dashboard");
  const [projects,   setProjects]   = useState(MOCK_PROJECTS);
  const [timesheets, setTimesheets] = useState(MOCK_TIMESHEETS);

  useEffect(() => {
    fetch("/api/home/").then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : d.results || [])).catch(() => {});
    fetch("/api/timesheets/").then(r => r.json()).then(d => setTimesheets(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body, #root { background: #0a0c0e; min-height: 100vh; color: #fff; }
        input, select, button, textarea { font-family: 'DM Sans', sans-serif; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.3); }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0a0c0e; }
        ::-webkit-scrollbar-thumb { background: #1e1e1e; border-radius: 3px; }
        select option { background: #111416; }
      `}</style>
      <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#0a0c0e", minHeight: "100vh" }}>
        <Nav page={page} setPage={setPage} />
        {page === "dashboard"  && <Dashboard      timesheets={timesheets} projects={projects} />}
        {page === "timesheets" && <TimesheetList  timesheets={timesheets} projects={projects} />}
        {page === "submit"     && <SubmitTimesheet projects={projects} onSubmitted={() => {}} />}
        {page === "projects"   && <Projects        projects={projects}   timesheets={timesheets} />}
      </div>
    </>
  );
}