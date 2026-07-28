import { useState, useEffect } from "react";
import { api } from "../api";
import { DARK, LIGHT } from "../theme";

export default function EmailHistory({ entityType, entityId, theme }) {
  const T = theme === "dark" ? DARK : LIGHT;
  const S = getStyles(T);

  const [emails, setEmails]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ asunto: "", resumen: "", cuerpo: "" });
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const load = async () => {
    setLoading(true);
    try { setEmails(await api.getEmails(entityType, entityId)); }
    catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [entityType, entityId]);

  const handleSave = async () => {
    if (!form.asunto.trim() || !form.resumen.trim()) return;
    setSaving(true);
    try {
      await api.createEmail({ entity_type: entityType, entity_id: entityId, ...form });
      setForm({ asunto: "", resumen: "", cuerpo: "" });
      setShowForm(false);
      await load();
      showToast("Correo registrado");
    } catch (e) { showToast("Error al guardar"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este correo del historial?")) return;
    try {
      await api.deleteEmail(id);
      await load();
      showToast("Eliminado");
    } catch (e) { showToast("Error al eliminar"); }
  };

  const formatFecha = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }) +
      " · " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {toast && <div style={S.toast}>{toast}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={S.sectionTitle}>📧 Historial de correos</div>
        <button onClick={() => setShowForm(o => !o)} style={S.btnOutline}>
          {showForm ? "Cancelar" : "+ Añadir manualmente"}
        </button>
      </div>

      {showForm && (
        <div style={S.formBox}>
          <div style={S.label}>Asunto *</div>
          <input value={form.asunto} onChange={e => setForm(f => ({ ...f, asunto: e.target.value }))}
            placeholder="Asunto del correo enviado..." style={S.input} />
          <div style={{ ...S.label, marginTop: 10 }}>Resumen *</div>
          <input value={form.resumen} onChange={e => setForm(f => ({ ...f, resumen: e.target.value }))}
            placeholder="Breve descripción de lo que se comunicó..." style={S.input} />
          <div style={{ ...S.label, marginTop: 10 }}>Cuerpo completo (opcional)</div>
          <textarea value={form.cuerpo} onChange={e => setForm(f => ({ ...f, cuerpo: e.target.value }))}
            placeholder="Pega aquí el texto completo del correo enviado..." rows={4}
            style={{ ...S.input, resize: "vertical" }} />
          <button onClick={handleSave} disabled={saving || !form.asunto.trim() || !form.resumen.trim()}
            style={{ ...S.btnGuardar, marginTop: 12, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Guardando..." : "💾 Guardar"}
          </button>
        </div>
      )}

      {loading && <div style={S.empty}>Cargando...</div>}
      {!loading && emails.length === 0 && (
        <div style={S.empty}>Sin correos registrados aún</div>
      )}

      {emails.map(e => (
        <div key={e.id} style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.asunto}>{e.asunto}</div>
              <div style={S.resumen}>{e.resumen}</div>
              <div style={S.meta}>
                📅 {formatFecha(e.fecha)}
                {e.agente && <span style={{ marginLeft: 12 }}>👤 {e.agente}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {e.cuerpo && (
                <button onClick={() => setExpanded(expanded === e.id ? null : e.id)} style={S.btnIcon} title="Ver cuerpo completo">
                  {expanded === e.id ? "▲" : "▼"}
                </button>
              )}
              <button onClick={() => handleDelete(e.id)} style={{ ...S.btnIcon, color: "#8B3A3A" }} title="Eliminar">
                🗑
              </button>
            </div>
          </div>
          {expanded === e.id && e.cuerpo && (
            <div style={S.cuerpo}>{e.cuerpo}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function getStyles(T) {
  return {
    sectionTitle: { fontSize: 10, letterSpacing: "0.15em", color: T.gold, textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif" },
    label:        { fontSize: 10, letterSpacing: "0.12em", color: T.mute, textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 5 },
    input:        { width: "100%", background: T.bgApp, border: `0.5px solid ${T.border}`, borderRadius: 6, color: T.text, padding: "8px 12px", fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" },
    formBox:      { background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "16px 20px" },
    btnOutline:   { padding: "6px 14px", borderRadius: 6, border: `0.5px solid ${T.goldDim}`, background: "none", color: T.gold, cursor: "pointer", fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 11, fontWeight: 600 },
    btnGuardar:   { padding: "8px 20px", borderRadius: 6, background: T.gold, color: "#000", border: "none", cursor: "pointer", fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 12, fontWeight: 700 },
    btnIcon:      { background: "none", border: "none", color: T.mute, cursor: "pointer", fontSize: 13, padding: "4px 6px" },
    card:         { background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "14px 16px" },
    asunto:       { fontSize: 14, fontWeight: 600, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 4 },
    resumen:      { fontSize: 13, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 6 },
    meta:         { fontSize: 11, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif" },
    cuerpo:       { marginTop: 12, padding: "12px", background: T.bgApp, borderRadius: 6, fontSize: 12, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif", whiteSpace: "pre-wrap", lineHeight: 1.6 },
    empty:        { textAlign: "center", color: T.mute, fontSize: 13, fontFamily: "Plus Jakarta Sans, sans-serif", padding: "2rem", letterSpacing: "0.08em" },
    toast:        { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: T.card, border: `1px solid ${T.goldDim}`, color: T.gold, padding: "11px 22px", borderRadius: 6, fontSize: 12, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: 1.5, textTransform: "uppercase", zIndex: 200 },
  };
}