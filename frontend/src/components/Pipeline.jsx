import { useState } from "react";
import { api } from "../api";

const STAGES = ["Nuevo", "En seguimiento", "Negociación", "Emitido", "Anulado"];
const STAGE_COLORS = {
  "Nuevo":          "#7A6E58",
  "En seguimiento": "#C9A870",
  "Negociación":    "#2A9D6A",
  "Emitido":        "#27ae60",
  "Anulado":        "#8B3A3A",
};
const STAGE_BG = {
  "Nuevo":          "#1A1810",
  "En seguimiento": "#1A1508",
  "Negociación":    "#0A1A12",
  "Emitido":        "#0A1A0A",
  "Anulado":        "#1A0A0A",
};

export default function Pipeline({ policies, clients, onRefresh }) {
  const [dragging, setDragging] = useState(null);
  const [toast, setToast]       = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const getClient = (clientId) => clients.find(c => c.id === clientId);

  const handleDrop = async (stage) => {
    if (!dragging || dragging.estado_tramite === stage) return;
    try {
      await api.updatePolicy(dragging.id, { ...dragging, estado_tramite: stage });
      await onRefresh();
      showToast(`Póliza → ${stage}`);
    } catch (e) { showToast(e.message || "Error"); }
    setDragging(null);
  };

  const byStage = (stage) => policies.filter(p => p.estado_tramite === stage);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {toast && <div style={S.toast}>{toast}</div>}

      <div>
        <div style={S.eyebrow}>Ventas</div>
        <h1 style={S.title}>Pipeline de Pólizas</h1>
      </div>

      {/* Resumen */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {STAGES.map(stage => (
          <div key={stage} style={{ fontSize: 11, color: STAGE_COLORS[stage],
            fontFamily: "Syne, sans-serif", letterSpacing: "0.08em" }}>
            {stage}: <strong>{byStage(stage).length}</strong>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12 }}>
        {STAGES.map(stage => (
          <div key={stage}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(stage)}
            style={{
              minWidth: 220, flex: "0 0 220px",
              background: STAGE_BG[stage] || "var(--card)",
              border: "0.5px solid var(--border)",
              borderTop: `2px solid ${STAGE_COLORS[stage]}`,
              borderRadius: 8, padding: 12,
              display: "flex", flexDirection: "column", gap: 8,
            }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase",
                fontFamily: "Syne, sans-serif", color: STAGE_COLORS[stage], fontWeight: 700 }}>
                {stage}
              </span>
              <span style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Syne, sans-serif" }}>
                {byStage(stage).length}
              </span>
            </div>

            {byStage(stage).map(p => {
              const client = getClient(p.client_id);
              return (
                <div key={p.id} draggable
                  onDragStart={() => setDragging(p)}
                  onDragEnd={() => setDragging(null)}
                  style={{
                    background: "var(--card)", border: "0.5px solid var(--border)",
                    borderRadius: 6, padding: "10px 12px", cursor: "grab",
                    opacity: dragging?.id === p.id ? 0.5 : 1,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}>
                  {/* Cliente */}
                  <div style={{ fontSize: 12, color: "var(--gold)", fontFamily: "Syne, sans-serif",
                    fontWeight: 600, marginBottom: 2, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {client?.name || "—"}
                  </div>
                  {/* Ramo */}
                  <div style={{ fontSize: 10, color: "var(--gold)", fontFamily: "Syne, sans-serif",
                    letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>
                    {p.ramo}
                  </div>
                  {/* Aseguradora */}
                  {p.aseguradora && (
                    <div style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Syne, sans-serif",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.aseguradora}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    {p.prima_anual > 0 ? (
                      <span style={{ fontSize: 12, color: "var(--gold)", fontFamily: "Syne, sans-serif" }}>
                        {p.prima_anual.toLocaleString("es-ES")} €
                      </span>
                    ) : <span />}
                    {p.fecha_renovacion && p.fecha_renovacion <= today && (
                      <span title={`Renovación: ${p.fecha_renovacion}`} style={{ fontSize: 12 }}>⚠️</span>
                    )}
                  </div>
                </div>
              );
            })}

            {byStage(stage).length === 0 && (
              <div style={{ textAlign: "center", color: "var(--mute)", fontSize: 11,
                fontFamily: "Syne, sans-serif", padding: "1rem 0", letterSpacing: "0.08em" }}>
                Sin pólizas
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Syne, sans-serif",
        textAlign: "center", letterSpacing: "0.08em" }}>
        Arrastra las tarjetas para cambiar de estado
      </div>
    </div>
  );
}

const S = {
  eyebrow: { fontSize: 10, letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 8, fontFamily: "Syne, sans-serif" },
  title:   { fontSize: 32, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.5px", fontFamily: "Syne, sans-serif" },
  toast:   { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "var(--card)", border: "1px solid var(--goldDim)", color: "var(--gold)", padding: "11px 22px", borderRadius: 6, fontSize: 12, fontFamily: "Syne, sans-serif", letterSpacing: 1.5, textTransform: "uppercase", zIndex: 200 },
};
