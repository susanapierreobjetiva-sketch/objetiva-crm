import { useState } from "react";
import { api } from "../api";
import ConfirmModal from "./ConfirmModal";
import AIEmailModal from "./AIEmailModal";
import EmailHistory from "./EmailHistory";
import { DARK, LIGHT } from "../theme";

const ESTADO_COLORS = {
  "Abierto":    { bg: "#1A0A0A", color: "#E08080" },
  "En gestión": { bg: "#1A1508", color: "#C9A870" },
  "Cerrado":    { bg: "#0A1A0A", color: "#27ae60" },
};

const RAMOS = ["Hogar","Auto","Vida","Salud","Empresa","Responsabilidad Civil","Decesos","Viaje","Comunidades","Otros"];

export default function ClaimDetail({ claim, client, onBack, onRefresh, currentUser, theme }) {
  const T = theme === "dark" ? DARK : LIGHT;
  const S = getStyles(T);

  const [editing, setEditing]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState("");
  const [confirmModal, setConfirmModal] = useState(null);
  const [showAIEmail, setShowAIEmail] = useState(false);
  const [form, setForm] = useState({
    num_expediente: claim.num_expediente || "",
    fecha_siniestro: claim.fecha_siniestro || "",
    descripcion: claim.descripcion || "",
    estado: claim.estado || "Abierto",
    notas: claim.notas || "",
  });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateClaim(claim.id, {
        ...claim,
        ...form,
      });
      await onRefresh();
      setEditing(false);
      showToast("Siniestro actualizado");
    } catch (e) {
      showToast(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    setConfirmModal({
      title: "Eliminar siniestro",
      message: "Se eliminará este siniestro permanentemente.",
      detail: [
        { icon: "⚠️", label: "Cliente",     value: client?.name || "—" },
        { icon: "📋", label: "Descripción", value: claim.descripcion?.slice(0, 60) || "—" },
      ],
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await api.deleteClaim(claim.id);
          await onRefresh();
          onBack();
        } catch (e) { showToast(e.message || "Error al eliminar"); }
      }
    });
  };

  const estados = ESTADO_COLORS[claim.estado] || { bg: T.lift, color: T.mute };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {toast && <div style={S.toast}>{toast}</div>}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          detail={confirmModal.detail}
          confirmLabel="Sí, eliminar"
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          theme={theme}
        />
      )}
      {showAIEmail && <AIEmailModal onClose={() => setShowAIEmail(false)} entityType="claim" entityId={claim.id} theme={theme} />}

      <button onClick={onBack} style={S.back}>← Volver a siniestros</button>

      {/* Cabecera */}
      <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.15em", color: T.gold, textTransform: "uppercase",
              fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 6 }}>Siniestro</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {claim.descripcion}
            </div>
            <div style={{ fontSize: 13, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 4 }}>
              Cliente: <span style={{ color: T.gold }}>{client?.name || "—"}</span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              {claim.ramo         && <span style={S.meta}>{claim.ramo}</span>}
              {claim.aseguradora  && <span style={S.meta}>{claim.aseguradora}</span>}
              {claim.num_expediente && <span style={S.meta}>Exp: {claim.num_expediente}</span>}
              {claim.fecha_siniestro && <span style={S.meta}>📅 {claim.fecha_siniestro}</span>}
              {claim.importe > 0  && <span style={{ ...S.meta, color: T.gold }}>{claim.importe.toLocaleString("es-ES")} €</span>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
            <span style={{ fontSize: 12, padding: "5px 14px", borderRadius: 999,
              background: estados.bg, color: estados.color,
              fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em" }}>
              {claim.estado}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowAIEmail(true)} style={S.btnAI}>✨ Redactar correo</button>
              <button onClick={() => setEditing(e => !e)} style={S.btnOutline}>
                {editing ? "Cancelar" : "✏️ Editar"}
              </button>
              {currentUser?.role === "admin" && (
                <button onClick={handleDelete} style={S.btnDanger}>🗑 Eliminar</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Formulario edición */}
      {editing && (
        <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "20px 24px" }}>
          <div style={S.sectionTitle}>Editar siniestro</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginTop: 14 }}>
            <div>
              <div style={S.label}>Nº Expediente</div>
              <input value={form.num_expediente} onChange={e => setF("num_expediente", e.target.value)} style={S.input} />
            </div>
            <div>
              <div style={S.label}>Fecha siniestro</div>
              <input type="date" value={form.fecha_siniestro} onChange={e => setF("fecha_siniestro", e.target.value)} style={S.input} />
            </div>
            <div>
              <div style={S.label}>Estado</div>
              <select value={form.estado} onChange={e => setF("estado", e.target.value)} style={S.input}>
                {["Abierto", "En gestión", "Cerrado"].map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={S.label}>Descripción</div>
              <textarea value={form.descripcion} onChange={e => setF("descripcion", e.target.value)}
                rows={3} style={{ ...S.input, resize: "vertical" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={S.label}>Notas</div>
              <textarea value={form.notas} onChange={e => setF("notas", e.target.value)}
                rows={3} style={{ ...S.input, resize: "vertical" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ ...S.btnOutline, background: T.gold, color: "#000", border: "none", fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Guardando..." : "💾 Guardar cambios"}
            </button>
          </div>
        </div>
      )}

      {/* Resolución y notas */}
      {(claim.resolucion || claim.notas) && (
        <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {claim.resolucion && (
            <div>
              <div style={S.sectionTitle}>Resolución</div>
              <div style={{ fontSize: 13, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 8, lineHeight: 1.6 }}>
                {claim.resolucion}
              </div>
            </div>
          )}
          {claim.notas && (
            <div>
              <div style={S.sectionTitle}>Notas</div>
              <div style={{ fontSize: 13, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 8, lineHeight: 1.6 }}>
                {claim.notas}
              </div>
            </div>
          )}
        </div>
      )}
      <EmailHistory entityType="claim" entityId={claim.id} theme={theme} />
    </div>
  );
}

function getStyles(T) {
  return {
    back:        { background: "none", border: "none", color: T.goldDim, cursor: "pointer",
                   fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 11, letterSpacing: "0.12em",
                   textTransform: "uppercase", padding: 0, display: "flex", alignItems: "center", gap: 6 },
    meta:        { fontSize: 12, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif",
                   background: T.lift, padding: "3px 10px", borderRadius: 999 },
    sectionTitle:{ fontSize: 10, letterSpacing: "0.15em", color: T.gold, textTransform: "uppercase",
                   fontFamily: "Plus Jakarta Sans, sans-serif" },
    label:       { fontSize: 10, letterSpacing: "0.12em", color: T.mute, textTransform: "uppercase",
                   fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 5 },
    input:       { width: "100%", background: T.bgApp, border: `0.5px solid ${T.border}`,
                   borderRadius: 6, color: T.text, padding: "8px 12px",
                   fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" },
    btnOutline:  { padding: "7px 16px", borderRadius: 6, border: `0.5px solid ${T.goldDim}`,
                   background: "none", color: T.gold, cursor: "pointer",
                   fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 12, fontWeight: 600 },
    btnDanger:   { padding: "7px 16px", borderRadius: 6, border: "0.5px solid #8B3A3A",
                   background: "none", color: "#E08080", cursor: "pointer",
                   fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 12, fontWeight: 600 },
    btnAI:       { padding: "7px 16px", borderRadius: 6, border: `1px solid ${T.goldDim}`,
                   background: T.lift, color: T.gold, cursor: "pointer",
                   fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 12, fontWeight: 600 },
    toast:       { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
                   background: T.card, border: `1px solid ${T.goldDim}`, color: T.gold,
                   padding: "11px 22px", borderRadius: 6, fontSize: 12, fontFamily: "Plus Jakarta Sans, sans-serif",
                   letterSpacing: 1.5, textTransform: "uppercase", zIndex: 200 },
  };
}