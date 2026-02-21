import { useEffect, useState } from "react";
import axios from "axios";
import Timesheet from "./pages/Timesheet";
import QuoteGenerator from "./pages/QuoteGenerator";
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

// -- Shared Header -------------------------------------------------------------
function Header({ activePage, setActivePage }) {
  const NAV = [
    { key: "projects",  label: "Projects",  icon: "🗂" },
    { key: "timesheet", label: "Timesheet", icon: "🕐" },
    { key: "team",      label: "Team",      icon: "👥" },
    { key: "quote",     label: "Quotation", icon: "📄" },
  ];

  const navigate = (key) => {
    setActivePage(key);
    window.history.pushState({}, "", "/" + key);
  };

  return (
    <header style={{ background: "#111", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>
      <div style={{ height: 3, background: "linear-gradient(90deg,#29ABE2,#1a7aad)" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 36px", height: 58 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <TresvanceLogo size={22} />
          <div style={{ width: 1, height: 20, background: "#333" }} />
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 3, color: "#555" }}>Softwares</span>
        </div>
        <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {NAV.map((item) => (
            <button key={item.key}
              onClick={() => navigate(item.key)}
              style={{
                background: activePage === item.key ? "#29ABE2" : "transparent",
                color: activePage === item.key ? "#fff" : "#777",
                border: "none", borderRadius: 6,
                padding: "7px 16px", fontSize: 13, fontWeight: activePage === item.key ? 700 : 500,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                fontFamily: "'DM Sans', sans-serif", transition: "all .2s",
              }}>
              <span style={{ fontSize: 13 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
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

// -- Team Page -----------------------------------------------------------------
function TeamPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/home/")
      .then(res => { setProjects(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const counts = projects.reduce((a, p) => { a[p.mode] = (a[p.mode] || 0) + 1; return a; }, {});

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 60px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111", marginBottom: 6 }}>Team Overview</h1>
      <p style={{ fontSize: 13, color: "#999", marginBottom: 28 }}>Project distribution across all modes</p>

      {loading ? <div style={emptyBox}>Loading...</div> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
            {[
              { label: "Total Projects", val: projects.length,      color: "#111"    },
              { label: "Development",    val: counts["DEV"]  || 0,  color: "#1e40af" },
              { label: "Testing",        val: counts["TEST"] || 0,  color: "#92400e" },
              { label: "Production",     val: counts["PROD"] || 0,  color: "#065f46" },
            ].map((c) => (
              <div key={c.label} style={{ background: "#fff", border: "1px solid #e2eaf0", borderRadius: 10, padding: "22px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 40, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.val}</div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, color: "#aaa", marginTop: 8, fontWeight: 600 }}>{c.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", border: "1px solid #e2eaf0", borderRadius: 10, overflow: "hidden" }}>
            {projects.map((p, i) => (
              <div key={p.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #f0f4f7", background: i % 2 === 0 ? "#fff" : "#fafcfd" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#29ABE2" }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{p.name}</span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#aaa" }}>v{p.version}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "3px 9px", borderRadius: 20,
                    background: p.mode === "DEV" ? "#dbeafe" : p.mode === "TEST" ? "#fef3c7" : "#d1fae5",
                    color:      p.mode === "DEV" ? "#1e40af" : p.mode === "TEST" ? "#92400e" : "#065f46" }}>
                    {p.mode}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// -- Shared Helpers ------------------------------------------------------------
const emptyBox = {
  background: "#fff", border: "1px solid #e2eaf0", borderRadius: 10,
  padding: 48, textAlign: "center", color: "#bbb", fontSize: 15,
};

// -- Quote Login Guard --------------------------------------------------------
const QUOTE_USER = "tresvance";
const QUOTE_PASS = "admin#tresvance";

function QuoteLogin({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleLogin = () => {
    if (username === QUOTE_USER && password === QUOTE_PASS) {
      sessionStorage.setItem("quote_auth", "1");
      onSuccess();
    } else {
      setError("Invalid username or password.");
    }
  };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", border: "1px solid #e2eaf0", borderRadius: 12, padding: "40px 40px 32px", width: 340, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#111" }}>Quotation Access</div>
          <div style={{ fontSize: 13, color: "#999", marginTop: 4 }}>Admin only — sign in to continue</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Username</label>
          <input
            value={username}
            onChange={e => { setUsername(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Enter username"
            style={{ width: "100%", marginTop: 6, padding: "10px 12px", border: "1.5px solid #e2eaf0", borderRadius: 7, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Password</label>
          <div style={{ position: "relative", marginTop: 6 }}>
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Enter password"
              style={{ width: "100%", padding: "10px 40px 10px 12px", border: "1.5px solid #e2eaf0", borderRadius: 7, fontSize: 14, boxSizing: "border-box", outline: "none", fontFamily: "'DM Sans', sans-serif" }}
            />
            <button onClick={() => setShowPass(s => !s)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#aaa" }}>
              {showPass ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: "#fff0f0", border: "1px solid #fcc", borderRadius: 6, padding: "8px 12px", fontSize: 13, color: "#c00", marginBottom: 14 }}>
            ⚠ {error}
          </div>
        )}

        <button onClick={handleLogin}
          style={{ width: "100%", background: "#29ABE2", color: "#fff", border: "none", borderRadius: 7, padding: "11px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          Sign In
        </button>
      </div>
    </div>
  );
}

// -- App -----------------------------------------------------------------------
const VALID_PAGES = ["projects", "timesheet", "team", "quote"];

export default function App() {
  const [activePage, setActivePage] = useState(() => {
    const path = window.location.pathname.replace("/", "").split("/")[0];
    return VALID_PAGES.includes(path) ? path : "projects";
  });

  const [quoteAuthed, setQuoteAuthed] = useState(
    () => sessionStorage.getItem("quote_auth") === "1"
  );

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePop = () => {
      const path = window.location.pathname.replace("/", "").split("/")[0];
      setActivePage(VALID_PAGES.includes(path) ? path : "projects");
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case "projects":  return <ProjectsPage />;
      case "timesheet": return <Timesheet />;
      case "team":      return <TeamPage />;
      case "quote":     return quoteAuthed
                          ? <QuoteGenerator />
                          : <QuoteLogin onSuccess={() => setQuoteAuthed(true)} />;
      default:          return <ProjectsPage />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f9", fontFamily: "'DM Sans', sans-serif" }}>
      <Header activePage={activePage} setActivePage={setActivePage} />
      <main>{renderPage()}</main>
    </div>
  );
}