// components/ConfirmModal.jsx — Modal de confirmación reutilizable
export default function ConfirmModal({ title, message, detail, confirmLabel = "Eliminar", onConfirm, onCancel, danger = true }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500
    }}>
      <div style={{
        background: "var(--card)", border: `0.5px solid ${danger ? "#8B3A3A" : "var(--border)"}`,
        borderRadius: 10, padding: "28px 32px", width: "min(420px, 92vw)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      }}>
        {/* Icono */}
        <div style={{ width: 44, height: 44, borderRadius: "50%",
          background: danger ? "#3A1A1A" : "var(--lift)",
          border: `1.5px solid ${danger ? "#8B3A3A" : "var(--goldDim)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, marginBottom: 16 }}>
          {danger ? "🗑" : "⚠️"}
        </div>

        {/* Título */}
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)",
          fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 8 }}>
          {title}
        </div>

        {/* Mensaje */}
        <div style={{ fontSize: 13, color: "var(--mute)",
          fontFamily: "Plus Jakarta Sans, sans-serif", lineHeight: 1.6, marginBottom: 16 }}>
          {message}
        </div>

        {/* Detalle del impacto */}
        {detail && (
          <div style={{ background: danger ? "#1A0A0A" : "var(--lift)",
            border: `0.5px solid ${danger ? "#8B3A3A" : "var(--border)"}`,
            borderRadius: 6, padding: "10px 14px", marginBottom: 20 }}>
            {detail.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8,
                fontSize: 13, color: danger ? "#E08080" : "var(--mute)",
                fontFamily: "Plus Jakarta Sans, sans-serif",
                marginBottom: i < detail.length - 1 ? 4 : 0 }}>
                <span>{d.icon}</span>
                <span>{d.label}: <strong style={{ color: danger ? "#E08080" : "var(--text)" }}>{d.value}</strong></span>
              </div>
            ))}
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: "11px", background: "none",
              border: "0.5px solid var(--border)", borderRadius: 6,
              color: "var(--text)", cursor: "pointer",
              fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 12,
              letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, padding: "11px",
              background: danger ? "#8B3A3A" : "var(--gold)",
              border: "none", borderRadius: 6,
              color: danger ? "#fff" : "var(--bgApp)", cursor: "pointer",
              fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 12,
              fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
