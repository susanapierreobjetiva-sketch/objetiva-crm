// components/ConfirmModal.jsx — Modal de confirmación reutilizable
import { DARK, LIGHT } from "../theme";

export default function ConfirmModal({ title, message, detail, confirmLabel = "Eliminar", onConfirm, onCancel, danger = true, theme }) {
  const T = theme === "dark" ? DARK : LIGHT;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500
    }}>
      <div style={{
        background: T.card, border: `0.5px solid ${danger ? "#8B3A3A" : T.border}`,
        borderRadius: 10, padding: "28px 32px", width: "min(420px, 92vw)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      }}>
        {/* Icono */}
        <div style={{ width: 44, height: 44, borderRadius: "50%",
          background: danger ? "#3A1A1A" : T.lift,
          border: `1.5px solid ${danger ? "#8B3A3A" : T.goldDim}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, marginBottom: 16 }}>
          {danger ? "🗑" : "⚠️"}
        </div>
        {/* Título */}
        <div style={{ fontSize: 17, fontWeight: 700, color: T.text,
          fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 8 }}>
          {title}
        </div>
        {/* Mensaje */}
        <div style={{ fontSize: 13, color: T.mute,
          fontFamily: "Plus Jakarta Sans, sans-serif", lineHeight: 1.6, marginBottom: 16 }}>
          {message}
        </div>
        {/* Detalle del impacto */}
        {detail && (
          <div style={{ background: danger ? "#1A0A0A" : T.lift,
            border: `0.5px solid ${danger ? "#8B3A3A" : T.border}`,
            borderRadius: 6, padding: "10px 14px", marginBottom: 20 }}>
            {detail.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8,
                fontSize: 13, color: danger ? "#E08080" : T.mute,
                fontFamily: "Plus Jakarta Sans, sans-serif",
                marginBottom: i < detail.length - 1 ? 4 : 0 }}>
                <span>{d.icon}</span>
                <span>{d.label}: <strong style={{ color: danger ? "#E08080" : T.text }}>{d.value}</strong></span>
              </div>
            ))}
          </div>
        )}
        {/* Acciones */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: "11px", background: "none",
              border: `0.5px solid ${T.border}`, borderRadius: 6,
              color: T.text, cursor: "pointer",
              fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 12,
              letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, padding: "11px",
              background: danger ? "#8B3A3A" : T.gold,
              border: "none", borderRadius: 6,
              color: danger ? "#fff" : T.bgApp, cursor: "pointer",
              fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 12,
              fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
