import { useState, useEffect } from "react";
import { api } from "../api";

export default function Backup() {
  const [backups, setBackups]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [msg, setMsg]           = useState(null);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const loadList = async () => {
    try {
      const data = await api.listBackups();
      setBackups(data.backups || []);
    } catch {
      showMsg("error", "No se pudo cargar la lista de backups");
    }
  };

  useEffect(() => { loadList(); }, []);

  // ── Exportar ─────────────────────────────────────────────────
  const handleExport = async () => {
    setLoading(true);
    try {
      await api.downloadBackup();
      showMsg("ok", "Backup descargado correctamente");
      loadList();
    } catch {
      showMsg("error", "Error al generar el backup");
    } finally {
      setLoading(false);
    }
  };

  // ── Eliminar ──────────────────────────────────────────────────
  const handleDelete = async (filename) => {
    if (!confirm(`¿Eliminar el backup ${filename}?`)) return;
    try {
      await api.deleteBackup(filename);
      showMsg("ok", "Backup eliminado");
      loadList();
    } catch {
      showMsg("error", "No se pudo eliminar el backup");
    }
  };

  // ── Restaurar ─────────────────────────────────────────────────
  const handleRestore = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json.gz")) {
      showMsg("error", "El archivo debe ser .json.gz");
      return;
    }
    if (!confirm("⚠️ ¿Restaurar este backup? Los datos actuales serán sobreescritos.")) return;

    setRestoring(true);
    try {
      const data = await api.restoreBackup(file);
      const counts = Object.entries(data.restored || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      showMsg("ok", `Restauración completada — ${counts}`);
    } catch (err) {
      showMsg("error", err.message || "Error al restaurar el backup");
    } finally {
      setRestoring(false);
      e.target.value = "";
    }
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleString("es-ES", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div style={{ padding: "24px", maxWidth: 800 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Copia de Seguridad
      </h1>
      <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>
        Exporta e importa todos los datos del CRM (clientes, pólizas, siniestros, tareas y documentos).
      </p>

      {msg && (
        <div style={{
          padding: "10px 16px", borderRadius: 8, marginBottom: 20, fontSize: 14,
          background: msg.type === "ok" ? "#d1fae5" : "#fee2e2",
          color:      msg.type === "ok" ? "#065f46" : "#991b1b",
          border: `1px solid ${msg.type === "ok" ? "#6ee7b7" : "#fca5a5"}`,
        }}>
          {msg.type === "ok" ? "✅" : "❌"} {msg.text}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
        <button
          onClick={handleExport}
          disabled={loading}
          style={{
            padding: "10px 20px", borderRadius: 8, border: "none",
            background: loading ? "#9ca3af" : "#1d4ed8",
            color: "#fff", fontWeight: 600, fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "⏳ Generando..." : "⬇️ Descargar backup"}
        </button>

        <label style={{
          padding: "10px 20px", borderRadius: 8,
          border: "2px dashed #d1d5db", background: "#f9fafb",
          color: "#374151", fontWeight: 600, fontSize: 14,
          cursor: restoring ? "not-allowed" : "pointer",
        }}>
          {restoring ? "⏳ Restaurando..." : "⬆️ Restaurar desde archivo"}
          <input
            type="file" accept=".json.gz"
            onChange={handleRestore} disabled={restoring}
            style={{ display: "none" }}
          />
        </label>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
        Backups guardados en el servidor
      </h2>

      {backups.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: 14 }}>
          No hay backups guardados todavía. Genera el primero con el botón de arriba.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {backups.map((b) => (
            <div key={b.filename} style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px", borderRadius: 8,
              border: "1px solid #e5e7eb", background: "#fff", fontSize: 14,
            }}>
              <div>
                <div style={{ fontWeight: 600, color: "#111827" }}>
                  📦 {b.filename}
                </div>
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                  {formatDate(b.created_at)} · {b.size_kb} KB
                </div>
              </div>
              <button
                onClick={() => handleDelete(b.filename)}
                style={{
                  padding: "6px 12px", borderRadius: 6,
                  border: "1px solid #fca5a5", background: "#fff",
                  color: "#dc2626", fontSize: 12, cursor: "pointer", fontWeight: 500,
                }}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
