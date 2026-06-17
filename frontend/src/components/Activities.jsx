import { useState } from "react";

export default function Activities({ policies, clients, onRefresh }) {
  const [filter, setFilter] = useState("vencidas");

  const getClient = (clientId) => clients.find(c => c.id === clientId);
  const today = new Date().toISOString().split("T")[0];

  const vencidas = policies.filter(p =>
    p.fecha_renovacion && p.fecha_renovacion <= today &&
    p.estado_tramite !== "Emitido" && p.estado_tramite !== "Anulado"
  ).sort((a, b) => a.fecha_renovacion.localeCompare(b.fecha_renovacion));

  const proximas30 = policies.filter(p => {
    if (!p.fecha_renovacion || p.estado_tramite === "Anulado") return false;
    const diff = Math.ceil((new Date(p.fecha_renovacion) - new Date(today)) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff <= 30;
  }).sort((a, b) => a.fecha_renovacion.localeCompare(b.fecha_renovacion));

  const proximas90 = policies.filter(p => {
    if (!p.fecha_renovacion || p.estado_tramite === "Anulado") return false;
    const diff = Math.ceil((new Date(p.fecha_renovacion) - new Date(today)) / (1000 * 60 * 60 * 24));
    return diff > 30 && diff <= 90;
  }).sort((a, b) => a.fecha_renovacion.localeCompare(b.fecha_renovacion));

  const diasRestantes = (fecha) => Math.ceil((new Date(fecha) - new Date(today)) / (1000 * 60 * 60 * 24));

  const STAGE_COLORS = {
    "Nuevo": "#7A6E58", "En seguimiento": "#C9A870",
    "Negociación": "#2A9D6A", "Emitido": "#27ae60", "Anulado": "#8B3A3A",
  };

  const PolicyCard = ({ p, urgente }) => {
    const client = getClient(p.client_id);
    const dias   = p.fecha_renovacion ? diasRestantes(p.fecha_renovacion) : null;
    return (
      <div style={{ background: "var(--card)",
        border: `0.5px solid ${urgente ? "#3A1A1A" : "var(--border)"}`,
        borderRadius: 8, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              {client?.name || "—"}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
              <span style={{ fontSize: 12, color: "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif",
                textTransform: "uppercase", letterSpacing: "0.06em" }}>{p.ramo}</span>
              {p.aseguradora && <span style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{p.aseguradora}</span>}
              {p.num_poliza  && <span style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>Nº {p.num_poliza}</span>}
              {p.prima_anual > 0 && <span style={{ fontSize: 12, color: "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{p.prima_anual.toLocaleString("es-ES")} €/año</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999,
              background: "var(--lift)", color: STAGE_COLORS[p.estado_tramite],
              fontFamily: "Plus Jakarta Sans, sans-serif" }}>{p.estado_tramite}</span>
            {urgente
              ? <span style={{ fontSize: 11, color: "#E08080", fontFamily: "Plus Jakarta Sans, sans-serif" }}>⚠ Vencida el {p.fecha_renovacion}</span>
              : <span style={{ fontSize: 11, color: dias <= 15 ? "#E08080" : "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                  📅 {p.fecha_renovacion} · {dias} días
                </span>
            }
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={S.eyebrow}>Control</div>
        <h1 style={S.title}>Renovaciones</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[
          { id: "vencidas",  label: `Vencidas (${vencidas.length})` },
          { id: "30dias",    label: `Próximos 30 días (${proximas30.length})` },
          { id: "90dias",    label: `Próximos 90 días (${proximas90.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            style={{ ...S.chip, ...(filter === t.id ? S.chipActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {filter === "vencidas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {vencidas.length === 0
            ? <div style={S.empty}>✓ Sin renovaciones vencidas</div>
            : vencidas.map(p => <PolicyCard key={p.id} p={p} urgente={true} />)
          }
        </div>
      )}

      {filter === "30dias" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {proximas30.length === 0
            ? <div style={S.empty}>Sin renovaciones en los próximos 30 días</div>
            : proximas30.map(p => <PolicyCard key={p.id} p={p} urgente={false} />)
          }
        </div>
      )}

      {filter === "90dias" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {proximas90.length === 0
            ? <div style={S.empty}>Sin renovaciones en los próximos 90 días</div>
            : proximas90.map(p => <PolicyCard key={p.id} p={p} urgente={false} />)
          }
        </div>
      )}
    </div>
  );
}

const S = {
  eyebrow:   { fontSize: 10, letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 8, fontFamily: "Plus Jakarta Sans, sans-serif" },
  title:     { fontSize: 32, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.5px", fontFamily: "Plus Jakarta Sans, sans-serif" },
  chip:      { padding: "6px 16px", borderRadius: 999, border: "0.5px solid var(--border)", background: "none", color: "var(--textSub)", cursor: "pointer", fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" },
  chipActive:{ border: "0.5px solid var(--gold)", color: "var(--bgApp)", background: "var(--gold)", fontWeight: 700 },
  empty:     { textAlign: "center", color: "var(--mute)", fontSize: 13, fontFamily: "Plus Jakarta Sans, sans-serif", padding: "3rem", letterSpacing: "0.08em" },
};
