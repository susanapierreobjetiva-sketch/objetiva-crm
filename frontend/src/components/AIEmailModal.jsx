import { useState } from "react";
import { getToken } from "../api";
import { api } from "../api";

const BASE = window.location.hostname === "localhost"
  ? "http://localhost:8002/api"
  : `${window.location.protocol}//${window.location.host}/api`;

export default function AIEmailModal({ onClose, entityType, entityId }) {
  const [contexto, setContexto]   = useState("");
  const [correo, setCorreo]       = useState("");
  const [asunto, setAsunto]       = useState("");
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [copiado, setCopiado]     = useState(false);
  const [guardado, setGuardado]   = useState(false);

  const generar = async () => {
    if (!contexto.trim()) return;
    setLoading(true);
    setError("");
    setCorreo("");
    setAsunto("");
    setGuardado(false);
    try {
      const token = getToken();
      const res = await fetch(`${BASE}/ai/redactar-correo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contexto }),
      });
      if (!res.ok) throw new Error("Error al generar el correo");
      const data = await res.json();
      setCorreo(data.correo);
      // Extraer asunto automáticamente
      const lineas = data.correo.split("\n");
      const asuntoLinea = lineas.find(l => l.toLowerCase().startsWith("asunto:"));
      if (asuntoLinea) setAsunto(asuntoLinea.replace(/asunto:/i, "").trim());
    } catch (e) {
      setError("No se pudo generar el correo. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const guardarEnHistorial = async (textoCorreo, asuntoCorreo) => {
    if (!entityType || !entityId) return;
    if (guardado) return;
    setSaving(true);
    try {
      // Pedir resumen a la IA
      const token = getToken();
      const res = await fetch(`${BASE}/ai/resumir`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ texto: textoCorreo }),
      });
      const data = await res.json();
      const resumen = data.resumen || contexto.slice(0, 120);
      await api.createEmail({
        entity_type: entityType,
        entity_id:   entityId,
        asunto:      asuntoCorreo || "Sin asunto",
        resumen,
        cuerpo:      textoCorreo,
      });
      setGuardado(true);
    } catch (e) {
      console.error("Error al guardar en historial", e);
    } finally {
      setSaving(false);
    }
  };

  const copiar = async () => {
    navigator.clipboard.writeText(correo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
    await guardarEnHistorial(correo, asunto);
  };

  const abrirMailto = async () => {
    const lineas = correo.split("\n");
    const asuntoLinea = lineas.find(l => l.toLowerCase().startsWith("asunto:"));
    const asuntoFinal = asuntoLinea ? asuntoLinea.replace(/asunto:/i, "").trim() : asunto || "Correo Objetiva Broker";
    const cuerpo = lineas.filter(l => !l.toLowerCase().startsWith("asunto:")).join("\n");
    window.location.href = `mailto:?subject=${encodeURIComponent(asuntoFinal)}&body=${encodeURIComponent(cuerpo)}`;
    await guardarEnHistorial(correo, asuntoFinal);
  };

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={styles.titulo}>✨ Redactar correo con IA</span>
          <button style={styles.cerrar} onClick={onClose}>✕</button>
        </div>
        <div style={styles.body}>
          <label style={styles.label}>Describe el contexto del correo</label>
          <textarea
            style={styles.textarea}
            placeholder="Ej: Recordar al cliente que su póliza de hogar vence el próximo mes..."
            value={contexto}
            onChange={(e) => setContexto(e.target.value)}
            rows={4}
          />
          <button
            style={{ ...styles.btnGenerar, opacity: loading || !contexto.trim() ? 0.6 : 1 }}
            onClick={generar}
            disabled={loading || !contexto.trim()}
          >
            {loading ? "Generando..." : "✨ Generar correo"}
          </button>
          {error && <p style={styles.error}>{error}</p>}
          {correo && (
            <>
              <label style={{ ...styles.label, marginTop: "1.2rem" }}>Asunto</label>
              <input
                style={{ ...styles.textarea, resize: "none", padding: "0.6rem 0.75rem" }}
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder="Asunto del correo..."
              />
              <label style={{ ...styles.label, marginTop: "0.8rem" }}>Correo generado</label>
              <textarea
                style={{ ...styles.textarea, minHeight: "200px" }}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                rows={10}
              />
              {guardado && (
                <p style={{ fontSize: "0.8rem", color: "#27ae60", marginTop: "0.4rem" }}>
                  ✅ Guardado en historial de correos
                </p>
              )}
              {saving && (
                <p style={{ fontSize: "0.8rem", color: "var(--mute)", marginTop: "0.4rem" }}>
                  Guardando en historial...
                </p>
              )}
              <div style={styles.acciones}>
                <button style={styles.btnSecundario} onClick={copiar}>
                  {copiado ? "✅ Copiado" : "📋 Copiar"}
                </button>
                <button style={styles.btnSecundario} onClick={abrirMailto}>
                  📧 Abrir en Outlook
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay:      { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:        { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", width: "min(600px, 95vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--lift)" },
  header:       { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.2rem 1.5rem", borderBottom: "1px solid var(--border)" },
  titulo:       { fontSize: "1rem", fontWeight: 600, color: "var(--gold)" },
  cerrar:       { background: "none", border: "none", color: "var(--mute)", fontSize: "1.1rem", cursor: "pointer" },
  body:         { padding: "1.5rem" },
  label:        { display: "block", fontSize: "0.82rem", color: "var(--mute)", marginBottom: "0.5rem" },
  textarea:     { width: "100%", background: "var(--bgApp)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", padding: "0.75rem", fontSize: "0.88rem", resize: "vertical", fontFamily: "Plus Jakarta Sans, sans-serif", boxSizing: "border-box" },
  btnGenerar:   { marginTop: "1rem", width: "100%", padding: "0.75rem", background: "var(--gold)", color: "#000", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" },
  error:        { color: "#e05", fontSize: "0.85rem", marginTop: "0.5rem" },
  acciones:     { display: "flex", gap: "0.75rem", marginTop: "0.75rem" },
  btnSecundario:{ flex: 1, padding: "0.65rem", background: "var(--bgApp)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "0.85rem", cursor: "pointer" },
};
