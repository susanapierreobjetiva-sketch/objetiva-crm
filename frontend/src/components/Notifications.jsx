import { useState, useRef, useEffect } from "react";

// IDs leídos en memoria — no necesitan persistir entre sesiones
// (las alertas se recalculan siempre desde los datos frescos)
let _readIds = new Set();

function getAlerts(policies, clients) {
  const today = new Date().toISOString().split("T")[0];
  const getClient = id => clients.find(c => c.id === id);

  const vencidas = policies
    .filter(p => p.fecha_renovacion && p.fecha_renovacion <= today &&
      p.estado_tramite !== "Emitido" && p.estado_tramite !== "Anulado")
    .map(p => ({
      ...p, tipo: "vencida",
      dias: Math.ceil((new Date(p.fecha_renovacion) - new Date(today)) / 86400000),
      client: getClient(p.client_id),
    }));

  const proximas = policies
    .filter(p => {
      if (!p.fecha_renovacion || p.estado_tramite === "Anulado" || p.estado_tramite === "Emitido") return false;
      const diff = Math.ceil((new Date(p.fecha_renovacion) - new Date(today)) / 86400000);
      return diff > 0 && diff <= 30;
    })
    .map(p => ({
      ...p, tipo: "proxima",
      dias: Math.ceil((new Date(p.fecha_renovacion) - new Date(today)) / 86400000),
      client: getClient(p.client_id),
    }))
    .sort((a, b) => a.dias - b.dias);

  return [...vencidas, ...proximas];
}

export default function Notifications({ policies, clients, onNavigate, theme }) {
  const [open, setOpen]   = useState(false);
  const [read, setRead]   = useState(new Set(_readIds));
  const ref = useRef(null);

  const alerts = getAlerts(policies || [], clients || []);
  const unread = alerts.filter(a => !read.has(a.id)).length;

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAll = () => {
    const ids = new Set(alerts.map(a => a.id));
    _readIds = ids;
    setRead(new Set(ids));
  };

  const markOne = (id) => {
    _readIds.add(id);
    setRead(new Set(_readIds));
  };

  const isDark  = theme === "dark";
  const bg      = isDark ? "#1C1611" : "#FFFFFF";
  const border  = isDark ? "#3A3020" : "#E0D8CC";
  const text    = isDark ? "#EDE8DF" : "#2A2010";
  const mute    = isDark ? "#8A8070" : "#9A9080";
  const gold    = "#C9A870";
  const cardBg  = isDark ? "#242015" : "#F8F4EE";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ position: "relative", background: "none", border: "none",
          cursor: "pointer", padding: "6px 8px", borderRadius: 6,
          color: open ? gold : mute, display: "flex", alignItems: "center",
          transition: "color 0.2s" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{ position: "absolute", top: 3, right: 3,
            background: "#E08080", color: "#fff", borderRadius: "50%",
            width: 16, height: 16, fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 340, background: bg, border: `0.5px solid ${border}`,
          borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          zIndex: 1000, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 16px", borderBottom: `0.5px solid ${border}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: text,
              fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.05em" }}>
              Notificaciones {unread > 0 && <span style={{ color: gold }}>({unread})</span>}
            </span>
            {unread > 0 && (
              <button onClick={markAll}
                style={{ fontSize: 11, color: gold, background: "none", border: "none",
                  cursor: "pointer", fontFamily: "Plus Jakarta Sans, sans-serif",
                  letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Marcar todas leídas
              </button>
            )}
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {alerts.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center",
                color: mute, fontSize: 13, fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                ✓ Sin alertas pendientes
              </div>
            ) : alerts.map(a => {
              const isRead    = read.has(a.id);
              const isVencida = a.tipo === "vencida";
              const color     = isVencida ? "#E08080" : a.dias <= 7 ? "#C9A870" : "#7A9E7E";
              const label     = isVencida
                ? `Vencida hace ${Math.abs(a.dias)} día${Math.abs(a.dias) !== 1 ? "s" : ""}`
                : `Vence en ${a.dias} día${a.dias !== 1 ? "s" : ""}`;
              return (
                <div key={a.id}
                  onClick={() => { markOne(a.id); onNavigate("activities"); setOpen(false); }}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "12px 16px", borderBottom: `0.5px solid ${border}`,
                    cursor: "pointer", background: isRead ? "transparent" : cardBg,
                    transition: "background 0.2s" }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%",
                    background: isRead ? "transparent" : color,
                    flexShrink: 0, marginTop: 5 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: text, fontWeight: isRead ? 400 : 600,
                      fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                      {a.client?.name || "Cliente desconocido"}
                    </div>
                    <div style={{ fontSize: 12, color: mute, fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 2 }}>
                      {a.ramo} · {a.aseguradora} · {a.num_poliza || "—"}
                    </div>
                    <div style={{ fontSize: 11, color, fontFamily: "Plus Jakarta Sans, sans-serif",
                      marginTop: 4, fontWeight: 600, letterSpacing: "0.05em" }}>
                      {label}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: mute, fontFamily: "Plus Jakarta Sans, sans-serif",
                    whiteSpace: "nowrap", marginTop: 2 }}>
                    {a.fecha_renovacion}
                  </div>
                </div>
              );
            })}
          </div>
          {alerts.length > 0 && (
            <div onClick={() => { onNavigate("activities"); setOpen(false); }}
              style={{ padding: "10px 16px", textAlign: "center", cursor: "pointer",
                borderTop: `0.5px solid ${border}`, fontSize: 12, color: gold,
                fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em",
                textTransform: "uppercase" }}>
              Ver todas las renovaciones →
            </div>
          )}
        </div>
      )}
    </div>
  );
}
