import { useState } from "react";
import { api } from "../api";
import { useIsMobile } from "../useIsMobile";
import ExportButton from "./ExportButton";
import PolicyForm from "./PolicyForm";

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

export default function Pipeline({ policies, clients, onRefresh, theme }) {
  const [dragging, setDragging] = useState(null);
  const [toast, setToast]       = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const isMobile = useIsMobile();

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
  const today   = new Date().toISOString().split("T")[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {toast && <div style={S.toast}>{toast}</div>}

      <div>
        <div style={S.eyebrow}>Ventas</div>
        <h1 style={S.title}>Estado de Pólizas</h1>
      </div>

      <ExportButton
        title="Pólizas" filename="polizas" data={policies}
        columns={[
          { label: "Cliente",        value: r => { const c = clients.find(x => x.id === r.client_id); return c?.name || r.client_id; } },
          { label: "Ramo",           value: r => r.ramo },
          { label: "Aseguradora",    value: r => r.aseguradora },
          { label: "Nº Póliza",      value: r => r.num_poliza },
          { label: "Prima anual",    value: r => r.prima_anual },
          { label: "Fecha efecto",   value: r => r.fecha_efecto },
          { label: "Renovación",     value: r => r.fecha_renovacion },
          { label: "Estado trámite", value: r => r.estado_tramite },
          { label: "Estado póliza",  value: r => r.estado_poliza },
        ]}
      />

      <button
        onClick={() => { setEditando(null); setShowForm(true); }}
        style={{ background: "var(--gold)", border: "none", color: "var(--bgApp)",
          padding: "8px 18px", borderRadius: 6, fontSize: 12,
          fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 700,
          cursor: "pointer", letterSpacing: "0.08em" }}>
        + Nueva póliza
      </button>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {STAGES.map(stage => (
          <div key={stage} style={{ fontSize: 13, color: STAGE_COLORS[stage],
            fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em" }}>
            {stage}: <strong>{byStage(stage).length}</strong>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row",
        gap: 12, overflowX: isMobile ? "visible" : "auto", paddingBottom: 12 }}>
        {STAGES.map(stage => (
          <div key={stage}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(stage)}
            style={{
              minWidth: isMobile ? "100%" : 220, flex: isMobile ? "1 1 auto" : "0 0 220px",
              background: STAGE_BG[stage] || "var(--card)",
              border: "0.5px solid var(--border)",
              borderTop: `2px solid ${STAGE_COLORS[stage]}`,
              borderRadius: 8, padding: 12,
              display: "flex", flexDirection: "column", gap: 8,
            }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase",
                fontFamily: "Plus Jakarta Sans, sans-serif", color: STAGE_COLORS[stage], fontWeight: 700 }}>
                {stage}
              </span>
              <span style={{ fontSize: 14, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                {byStage(stage).length}
              </span>
            </div>
            {byStage(stage).map(p => {
              const client = getClient(p.client_id);
              return (
                <div key={p.id} draggable
                  onDragStart={() => setDragging(p)}
                  onDragEnd={() => setDragging(null)}
                  style={{ background: "var(--card)", border: "0.5px solid var(--border)",
                    borderRadius: 6, padding: "10px 12px", cursor: "grab",
                    opacity: dragging?.id === p.id ? 0.5 : 1,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                  <div style={{ fontSize: 16, color: "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif",
                    fontWeight: 600, marginBottom: 2, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {client?.name || "—"}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif",
                    letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>
                    {p.ramo}
                  </div>
                  {p.aseguradora && (
                    <div style={{ fontSize: 16, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.aseguradora}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    {p.prima_anual > 0
                      ? <span style={{ fontSize: 16, color: "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{p.prima_anual.toLocaleString("es-ES")} €</span>
                      : <span />}
                    {p.fecha_renovacion && p.fecha_renovacion <= today && (
                      <span title={`Renovación: ${p.fecha_renovacion}`} style={{ fontSize: 12 }}>⚠️</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
                    <button onClick={(e) => { e.stopPropagation(); setEditando(p); setShowForm(true); }}
                      style={{ background: "none", border: "0.5px solid var(--border)", color: "var(--gold)",
                        fontSize: 11, padding: "3px 10px", borderRadius: 4, cursor: "pointer",
                        fontFamily: "Plus Jakarta Sans, sans-serif" }}>Editar</button>
                    <button onClick={async (e) => { e.stopPropagation();
                        if (window.confirm("¿Eliminar esta póliza?")) {
                          try { await api.deletePolicy(p.id); await onRefresh(); showToast("Póliza eliminada"); }
                          catch (err) { showToast(err.message || "Error"); }
                        } }}
                      style={{ background: "none", border: "0.5px solid rgba(139,58,58,0.5)", color: "#E08080",
                        fontSize: 11, padding: "3px 10px", borderRadius: 4, cursor: "pointer",
                        fontFamily: "Plus Jakarta Sans, sans-serif" }}>Eliminar</button>
                  </div>
                </div>
              );
            })}
            {byStage(stage).length === 0 && (
              <div style={{ textAlign: "center", color: "var(--mute)", fontSize: 13,
                fontFamily: "Plus Jakarta Sans, sans-serif", padding: "1rem 0", letterSpacing: "0.08em" }}>
                Sin pólizas
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 14, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif",
        textAlign: "center", letterSpacing: "0.08em" }}>
        Arrastra las tarjetas para cambiar de estado
      </div>

      {showForm && (
        <PolicyForm
          policy={editando}
          clients={clients}
          theme={theme}
          onClose={() => setShowForm(false)}
          onSave={async () => {
            setShowForm(false);
            await onRefresh();
            showToast(editando ? "Póliza actualizada" : "Póliza creada");
          }}
        />
      )}
    </div>
  );
}

const S = {
  eyebrow: { fontSize: 12, letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 8, fontFamily: "Plus Jakarta Sans, sans-serif" },
  title:   { fontSize: 40, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.5px", fontFamily: "Plus Jakarta Sans, sans-serif" },
  toast:   { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "var(--card)", border: "1px solid var(--goldDim)", color: "var(--gold)", padding: "11px 22px", borderRadius: 6, fontSize: 12, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: 1.5, textTransform: "uppercase", zIndex: 200 },
};
