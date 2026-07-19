import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

// -- Tresvance Logo ------------------------------------------------------------
function TresvanceLogo({ size = 24 }) {
  return (
    <svg width={size * 4.5} height={size} viewBox="0 0 180 40" fill="none">
      <text x="0" y="30" fontFamily="'Helvetica Neue',Arial,sans-serif" fontSize="30" fontWeight="300" fill="#fff">tres</text>
      <text x="62" y="30" fontFamily="'Helvetica Neue',Arial,sans-serif" fontSize="30" fontWeight="700" fill="#29ABE2">v</text>
      <text x="80" y="30" fontFamily="'Helvetica Neue',Arial,sans-serif" fontSize="30" fontWeight="300" fill="#fff">ance</text>
    </svg>
  );
}

// -- Shared Header (No Navigation Buttons) -------------------------------------
function Header() {
  return (
    <header style={{ background: "#111", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>
      <div style={{ height: 3, background: "linear-gradient(90deg,#29ABE2,#1a7aad)" }} />
      <div style={{ display: "flex", alignItems: "center", padding: "0 36px", height: 58 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <TresvanceLogo size={22} />
          <div style={{ width: 1, height: 20, background: "#333" }} />
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 3, color: "#555" }}>Softwares</span>
        </div>
      </div>
    </header>
  );
}

// -- Projects Page -------------------------------------------------------------
function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    axios.get("/api/home/")
      .then(res => { setProjects(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.mode?.toLowerCase().includes(search.toLowerCase())
  );

  const modeColor = {
    DEV:  { bg: "#dbeafe", text: "#1e40af" },
    TEST: { bg: "#fef3c7", text: "#92400e" },
    PROD: { bg: "#d1fae5", text: "#065f46" },
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 60px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111", margin: 0 }}>Projects</h1>
          <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>All active projects at Tresvance Softwares</p>
        </div>
        <input
          type="text" placeholder="Search projects..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ border: "1.5px solid #e2eaf0", borderRadius: 7, padding: "9px 14px", fontSize: 13, width: 220, background: "#fff", color: "#111" }}
        />
      </div>

      {loading ? (
        <div style={emptyBox}>Loading projects...</div>
      ) : filtered.length === 0 ? (
        <div style={emptyBox}>No projects found</div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e2eaf0", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 70px 2.5fr 70px 1.5fr", background: "#111" }}>
            {["Project Name", "Mode", "URL", "Version", "Remarks"].map((h) => (
              <div key={h} style={{ padding: "12px 18px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#888" }}>{h}</div>
            ))}
          </div>

          {filtered.map((project, i) => {
            const mc = modeColor[project.mode] || { bg: "#f3f4f6", text: "#374151" };
            return (
              <div key={project.id || i}
                style={{ display: "grid", gridTemplateColumns: "1.2fr 70px 2.5fr 70px 1.5fr", borderBottom: "1px solid #f0f4f7", background: i % 2 === 0 ? "#fff" : "#fafcfd", transition: "background .15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f0f7fc"}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafcfd"}>

                <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#29ABE2", flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{project.name}</span>
                </div>

                <div style={{ padding: "14px 10px", display: "flex", alignItems: "center" }}>
                  <span style={{ background: mc.bg, color: mc.text, borderRadius: 20, padding: "3px 9px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>
                    {project.mode}
                  </span>
                </div>

                <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", overflow: "hidden" }}>
                  {project.url ? (
                    <a href={project.url} target="_blank" rel="noopener noreferrer"
                      title={project.url}
                      style={{ color: "#29ABE2", textDecoration: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 5, minWidth: 0, width: "100%" }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
                      <span style={{ fontSize: 11, flexShrink: 0 }}>🔗</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{project.url}</span>
                    </a>
                  ) : <span style={{ color: "#ccc", fontSize: 13 }}>—</span>}
                </div>

                <div style={{ padding: "14px 10px", display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#888", background: "#f4f4f4", borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>v{project.version}</span>
                </div>

                <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 13, color: "#666", lineHeight: 1.5, wordBreak: "break-word" }}>
                    {project.remarks || <span style={{ color: "#ddd" }}>—</span>}
                  </span>
                </div>
              </div>
            );
          })}

          <div style={{ padding: "10px 18px", background: "#fafcfd", borderTop: "1px solid #f0f4f7", fontSize: 12, color: "#bbb" }}>
            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

const emptyBox = {
  background: "#fff", border: "1px solid #e2eaf0", borderRadius: 10,
  padding: 48, textAlign: "center", color: "#bbb", fontSize: 15,
};

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f9", fontFamily: "'DM Sans', sans-serif" }}>
      <Header />
      <main>
        <ProjectsPage />
      </main>
    </div>
  );
}