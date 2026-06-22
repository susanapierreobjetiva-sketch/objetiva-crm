import { DARK, LIGHT } from "../theme";

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const LogoMark = ({ gold = "#C9A870" }) => (
  <svg viewBox="0 0 32 32" width="32" height="32" fill="none">
    <rect width="32" height="32" rx="6" fill="#1A1208"/>
    <circle cx="16" cy="16" r="12" fill="none" stroke={gold} strokeWidth="0.8"/>
    <text x="16" y="13.5" textAnchor="middle" fontFamily="Georgia,serif" fontWeight="400" fontSize="6.5" fill={gold} letterSpacing="0.3">OBJ</text>
    <line x1="9.5" y1="16" x2="22.5" y2="16" stroke={gold} strokeWidth="0.5" opacity="0.7"/>
    <text x="16" y="20.5" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="300" fontSize="4" fill={gold} letterSpacing="2" opacity="0.8">CRM</text>
  </svg>
);

const NAV = [
  { id: "dashboard",  label: "Panel Principal",    icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { id: "clients",    label: "Clientes",     icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { id: "pipeline",   label: "Estado de pólizas",     icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
  { id: "activities", label: "Renovaciones", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" },
  { id: "claims",     label: "Siniestros",   icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  { id: "tasks",      label: "Tareas",         icon: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  { id: "reports",    label: "Informe diario", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" },
];

export default function Sidebar({ currentUser, view, setView, onLogout, theme, onToggleTheme, sidebarOpen, setSidebarOpen, isMobile, policies, clients, onNavigate }) {
  const T = theme === "dark" ? DARK : LIGHT;

  return (
    <aside style={{
      width: 220, background: T.sidebar,
      borderRight: `1px solid ${T.border}`,
      boxShadow: "6px 0 24px rgba(0,0,0,0.5)",
      display: "flex", flexDirection: "column",
      flexShrink: 0, position: "fixed", top: 0, left: 0, bottom: 0,
      zIndex: isMobile ? 200 : 1,
      transform: isMobile && !sidebarOpen ? "translateX(-100%)" : "translateX(0)",
      transition: "transform 0.25s ease",
      backdropFilter: "none", WebkitBackdropFilter: "none", isolation: "isolate",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 4px", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMark gold={T.gold} />
          <div>
            <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: "0.08em" }}>
              <span style={{ color: T.text }}>OBJ</span><span style={{ color: T.gold }}>CRM</span>
            </div>
            <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 10, letterSpacing: "0.15em",
              color: T.mute, marginTop: 3, textTransform: "uppercase" }}>Gestión de Clientes</div>
          </div>
        </div>
      </div>

      {/* User pill */}
      <div onClick={() => setView("profile")}
        style={{ display: "flex", alignItems: "center", gap: 10,
        margin: "12px 10px", padding: "10px 12px",
        background: T.card, borderRadius: 8, cursor: "pointer",
        border: `0.5px solid ${T.border}`, borderLeft: `3px solid ${T.gold}` }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.lift,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, color: currentUser.color || T.gold, flexShrink: 0 }}>
          {currentUser.avatar}
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, fontWeight: 700,
            color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {currentUser.name}
          </div>
          <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 11, color: T.gold,
            textTransform: "uppercase", marginTop: 2 }}>{currentUser.dept}</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "4px 0", display: "flex", flexDirection: "column" }}>
        {NAV.map(item => (
          <button key={item.id}
            onClick={() => { setView(item.id); if (isMobile) setSidebarOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "7px 14px",
              border: "none",
              borderLeft: view === item.id || (view === "client_detail" && item.id === "clients")
                ? `2px solid ${T.gold}` : "2px solid transparent",
              background: view === item.id || (view === "client_detail" && item.id === "clients")
                ? T.hover : "none",
              color: view === item.id || (view === "client_detail" && item.id === "clients")
                ? T.gold : T.text,
              cursor: "pointer", fontFamily: "Plus Jakarta Sans, sans-serif",
              fontSize: 13, fontWeight: 500, letterSpacing: "0.03em",
              textAlign: "left", width: "100%",
              opacity: view === item.id || (view === "client_detail" && item.id === "clients") ? 1 : 0.65,
            }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
              background: view === item.id ? T.gold : T.goldDim }} />
            <Icon d={item.icon} size={14} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: 10, borderTop: `0.5px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
        <button onClick={onToggleTheme}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
            borderRadius: 5, border: `0.5px solid ${T.goldDim}`, background: "none",
            color: T.goldDim, cursor: "pointer", fontSize: 11,
            fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.1em", width: "100%", textTransform: "uppercase" }}>
          {theme === "dark" ? "☀ Modo claro" : "☾ Modo oscuro"}
        </button>
        <button onClick={onLogout}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
            borderRadius: 5, border: `0.5px solid ${T.goldDim}`, background: "none",
            color: T.goldDim, cursor: "pointer", fontSize: 11,
            fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.1em", width: "100%", textTransform: "uppercase" }}>
          <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={13} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
