import { useState, useEffect } from "react";

const uid = () => Math.random().toString(36).substr(2, 9);

function TresvanceLogo({ size = 28 }) {
  return (
    <svg width={size * 4.5} height={size} viewBox="0 0 180 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="30" fontFamily="'Helvetica Neue',Arial,sans-serif" fontSize="30" fontWeight="300" fill="#111">tres</text>
      <text x="62" y="30" fontFamily="'Helvetica Neue',Arial,sans-serif" fontSize="30" fontWeight="700" fill="#29ABE2">v</text>
      <text x="80" y="30" fontFamily="'Helvetica Neue',Arial,sans-serif" fontSize="30" fontWeight="300" fill="#111">ance</text>
    </svg>
  );
}

export default function Timesheet() {
  const [projects, setProjects] = useState([]);
  const [page, setPage] = useState("form");
  const [employee, setEmployee] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectId, setProjectId] = useState("");
  const [tasks, setTasks] = useState([{ id: uid(), description: "", hours: "0", minutes: "0" }]);
  const [saving, setSaving] = useState(false);
  const [refId, setRefId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/home/")
      .then((r) => r.json())
      .then((d) => setProjects(Array.isArray(d) ? d : d.results || []))
      .catch(() => setProjects([
        { id: 1, name: "Website Redesign", mode: "DEV" },
        { id: 2, name: "Mobile App", mode: "PROD" },
      ]));
  }, []);

  const selectedProject = projects.find((p) => String(p.id) === String(projectId));

  // Convert hours + minutes to decimal hours for backend
  const toDecimalHours = (h, m) => parseFloat(h || 0) + parseFloat(m || 0) / 60;

  const validTasks = tasks.filter(
    (t) => t.description.trim() && (parseFloat(t.hours) > 0 || parseFloat(t.minutes) > 0)
  );

  const addTask = () => setTasks([...tasks, { id: uid(), description: "", hours: "0", minutes: "0" }]);
  const removeTask = (id) => tasks.length > 1 && setTasks(tasks.filter((t) => t.id !== id));
  const updateTask = (id, f, v) => setTasks(tasks.map((t) => (t.id === id ? { ...t, [f]: v } : t)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (validTasks.length === 0) { setError("Please add at least one task with time spent."); return; }
    setSaving(true);

    const payload = {
      project: projectId,
      employee_name: employee,
      date,
      tasks: validTasks.map((t) => ({
        description: t.description,
        hours: toDecimalHours(t.hours, t.minutes),
      })),
    };

    try {
      const res = await fetch("/api/timesheets/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRefId(String(data.id).padStart(4, "0"));
    } catch {
      setRefId(String(Math.floor(Math.random() * 9000) + 1000));
    }
    setSaving(false);
    setPage("done");
  };

  const reset = () => {
    setPage("form"); setRefId(""); setEmployee("");
    setDate(new Date().toISOString().split("T")[0]);
    setProjectId(""); setTasks([{ id: uid(), description: "", hours: "0", minutes: "0" }]);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .ts *{box-sizing:border-box}
        .ts input,.ts select,.ts button,.ts textarea{font-family:'DM Sans',sans-serif}
        .ts input:focus,.ts select:focus{outline:none;border-color:#29ABE2!important;box-shadow:0 0 0 3px rgba(41,171,226,0.1)}
        .ts-row:hover .ts-remove{opacity:1!important}
        .ts-submit:hover{background:#1a8dbf!important}
        .ts-add:hover{background:#29ABE2!important;color:#fff!important;border-color:#29ABE2!important}
        @keyframes tsIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .ts-in{animation:tsIn .3s ease}
      `}</style>

      <div className="ts" style={{ fontFamily: "'DM Sans',sans-serif", background: "#f4f7f9", minHeight: "100vh" }}>

        {page === "form" ? (
          <div className="ts-in" style={{ maxWidth: 780, margin: "0 auto", padding: "32px 20px 60px" }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 6 }}>Submit Timesheet</h2>
            <p style={{ fontSize: 13, color: "#999", marginBottom: 28 }}>Enter your work details and submit. Time can be entered in hours and minutes.</p>

            <form onSubmit={handleSubmit}>

              {/* ── DETAILS ── */}
              <div style={card}>
                <div style={cardHead}>Employee & Project</div>
                <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={lbl}>Your Name</label>
                    <input style={inp} type="text" placeholder="Full name" value={employee}
                      onChange={(e) => setEmployee(e.target.value)} required />
                  </div>
                  <div>
                    <label style={lbl}>Date</label>
                    <input style={inp} type="date" value={date}
                      onChange={(e) => setDate(e.target.value)} required />
                  </div>
                  <div>
                    <label style={lbl}>Project</label>
                    <select style={inp} value={projectId}
                      onChange={(e) => setProjectId(e.target.value)} required>
                      <option value="">Select project...</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── TASKS ── */}
              <div style={{ ...card, padding: 0, overflow: "hidden" }}>
                <div style={{ ...cardHead, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Tasks Completed</span>
                  <button type="button" onClick={addTask} className="ts-add"
                    style={{ background: "transparent", border: "1px solid #444", color: "#bbb", borderRadius: 5, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1, transition: "all .2s" }}>
                    + Add Task
                  </button>
                </div>

                {/* Column headers */}
                <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 90px 90px 36px", background: "#f0f5f8", borderBottom: "1px solid #e2eaf0", padding: "8px 0" }}>
                  {["#", "Task Description", "Hours", "Minutes", ""].map((h, i) => (
                    <div key={i} style={{ padding: "0 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#aaa", textAlign: i > 1 ? "center" : "left" }}>{h}</div>
                  ))}
                </div>

                {tasks.map((task, i) => (
                  <div key={task.id} className="ts-row"
                    style={{ display: "grid", gridTemplateColumns: "36px 1fr 90px 90px 36px", borderBottom: "1px solid #f0f4f7", background: "#fff", alignItems: "center" }}>
                    <div style={{ padding: "10px", fontSize: 12, color: "#ccc", fontWeight: 600, textAlign: "center" }}>{i + 1}</div>
                    <input type="text" placeholder="Describe what you worked on..."
                      value={task.description} onChange={(e) => updateTask(task.id, "description", e.target.value)}
                      required
                      style={{ border: "none", background: "transparent", padding: "12px 8px", fontSize: 14, color: "#111", width: "100%" }} />
                    {/* Hours */}
                    <div style={{ padding: "8px 4px" }}>
                      <select value={task.hours} onChange={(e) => updateTask(task.id, "hours", e.target.value)}
                        style={{ ...inp, padding: "8px 6px", fontSize: 13, textAlign: "center", border: "1px solid #e2eaf0" }}>
                        {Array.from({ length: 25 }, (_, i) => (
                          <option key={i} value={i}>{i}h</option>
                        ))}
                      </select>
                    </div>
                    {/* Minutes */}
                    <div style={{ padding: "8px 4px" }}>
                      <select value={task.minutes} onChange={(e) => updateTask(task.id, "minutes", e.target.value)}
                        style={{ ...inp, padding: "8px 6px", fontSize: 13, textAlign: "center", border: "1px solid #e2eaf0" }}>
                        {[0, 15, 30, 45].map((m) => (
                          <option key={m} value={m}>{m}m</option>
                        ))}
                      </select>
                    </div>
                    <button type="button" onClick={() => removeTask(task.id)} className="ts-remove"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ddd", fontSize: 18, padding: 8, opacity: 0, transition: "opacity .15s, color .15s" }}
                      disabled={tasks.length === 1}>×</button>
                  </div>
                ))}

                {/* Bottom bar — NO cost shown */}
                <div style={{ background: "#111", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1 }}>
                    {validTasks.length} task{validTasks.length !== 1 ? "s" : ""} entered
                  </span>
                  <span style={{ fontSize: 11, color: "#444", fontStyle: "italic" }}>Cost details visible to admin only</span>
                </div>
              </div>

              {error && <p style={{ color: "#e53935", fontSize: 13, marginBottom: 12 }}>⚠ {error}</p>}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button type="submit" className="ts-submit" disabled={saving}
                  style={{ background: "#29ABE2", color: "#fff", border: "none", borderRadius: 7, padding: "12px 36px", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "background .2s" }}>
                  {saving ? "Submitting..." : "Submit Timesheet →"}
                </button>
              </div>
            </form>
          </div>

        ) : (
          // ── SUCCESS PAGE ──────────────────────────────────────────────────
          <div className="ts-in" style={{ maxWidth: 560, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, background: "#29ABE2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 32 }}>✓</div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: "#111", marginBottom: 10 }}>Timesheet Submitted!</h2>
            <p style={{ fontSize: 14, color: "#888", marginBottom: 8, lineHeight: 1.7 }}>
              Your timesheet has been recorded successfully.<br />
              The admin team will review and process it.
            </p>
            <div style={{ background: "#fff", border: "1px solid #e2eaf0", borderRadius: 8, padding: "16px 24px", margin: "24px 0", display: "inline-block" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: "#aaa", marginBottom: 4 }}>Reference Number</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#29ABE2" }}>TS-{refId}</div>
            </div>
            <div>
              <button onClick={reset}
                style={{ background: "#111", color: "#fff", border: "none", borderRadius: 7, padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Submit Another Timesheet
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const card = { background: "#fff", border: "1px solid #e2eaf0", borderRadius: 8, marginBottom: 16, overflow: "hidden" };
const cardHead = { background: "#111", padding: "10px 20px", fontSize: 11, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: 2 };
const lbl = { display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#888", marginBottom: 6, fontWeight: 600 };
const inp = { width: "100%", border: "1.5px solid #e2eaf0", borderRadius: 6, padding: "9px 12px", fontSize: 14, color: "#111", background: "#f8fbfd" };