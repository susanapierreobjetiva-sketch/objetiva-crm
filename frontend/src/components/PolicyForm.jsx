import { useState, useEffect } from "react";
import { api } from "../api";

const RAMOS = [
  "Vida", "Salud", "Autos", "Hogar", "Multirriesgo",
  "Responsabilidad Civil", "Decesos", "Accidentes",
  "Viaje", "Comercio", "Comunidades", "Otros"
];

const ESTADOS_TRAMITE = [
  "Nuevo", "En seguimiento", "Negociación", "Emitido", "Anulado"
];

const EMPTY = {
  client_id: "",
  ramo: "Hogar",
  aseguradora: "",
  num_poliza: "",
  prima_anual: "",
  fecha_efecto: "",
  fecha_renovacion: "",
  estado_tramite: "Nuevo",
  estado_poliza: "",
  observaciones: "",
};

export default function PolicyForm({ policy, clients, onClose, onSave, theme }) {
  const [form, setForm] = useState(EMPTY);
  const [busqueda, setBusqueda] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isDark = theme === "dark";
  const bg      = isDark ? "#1C1611" : "#FFFFFF";
  const bgInput = isDark ? "#0E0C09" : "#F8F4EE";
  const border  = isDark ? "#3A3020" : "#D8D0C4";
  const text    = isDark ? "#EDE8DF" : "#1A1612";
  const mute    = isDark ? "#6A6050" : "#9A9080";
  const gold    = "#C9A870";

  useEffect(() => {
    if (policy) {
      setForm({ ...EMPTY, ...policy, prima_anual: policy.prima_anual?.toString() || "" });
      const client = clients.find(c => c.id === policy.client_id);
      if (client) setBusqueda(client.name || "");
    }
  }, [policy]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.client_id)        { setError("Selecciona un cliente."); return; }
    if (!form.ramo)             { setError("El ramo es obligatorio."); return; }
    if (!form.aseguradora)      { setError("La aseguradora es obligatoria."); return; }
    if (!form.fecha_renovacion) { setError("La fecha de renovación es obligatoria."); return; }
    setLoading(true);
    try {
      const body = { ...form, prima_anual: parseFloat(String(form.prima_anual).replace(",", ".")) || 0 };
      if (policy) { await api.updatePolicy(policy.id, body); }
      else        { await api.createPolicy(body); }
      onSave();
    } catch (e) {
      setError(e.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const clientesFiltrados = clients.filter(c => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  }).slice(0, 8);

  const clienteSeleccionado = clients.find(c => c.id === form.client_id);

  const S = {
    overlay:  { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" },
    modal:    { background: bg, border: `0.5px solid ${border}`, borderRadius: 12, width: 620, maxWidth: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" },
    header:   { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: `0.5px solid ${border}` },
    title:    { fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 16, fontWeight: 700, color: text, margin: 0 },
    btnClose: { background: "none", border: "none", color: mute, fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1 },
    body:     { flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 },
    secTitle: { fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: gold, fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 700, marginBottom: 10, paddingBottom: 6, borderBottom: `0.5px solid ${border}` },
    row:      { display: "flex", gap: 12 },
    group:    { display: "flex", flexDirection: "column", gap: 5, flex: 1, position: "relative" },
    label:    { fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: mute, fontFamily: "Plus Jakarta Sans, sans-serif" },
    input:    { background: bgInput, border: `0.5px solid ${border}`, color: text, padding: "8px 12px", borderRadius: 6, fontSize: 13, fontFamily: "Plus Jakarta Sans, sans-serif", outline: "none", width: "100%", boxSizing: "border-box" },
    select:   { background: bgInput, border: `0.5px solid ${border}`, color: text, padding: "8px 12px", borderRadius: 6, fontSize: 13, fontFamily: "Plus Jakarta Sans, sans-serif", outline: "none", width: "100%", cursor: "pointer" },
    dropdown: { position: "absolute", top: "100%", left: 0, right: 0, background: isDark ? "#141008" : "#FFFFFF", border: `0.5px solid ${border}`, borderRadius: 6, zIndex: 10, maxHeight: 200, overflowY: "auto", marginTop: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" },
    dropItem: { padding: "9px 12px", fontSize: 13, color: text, fontFamily: "Plus Jakarta Sans, sans-serif", cursor: "pointer", borderBottom: `0.5px solid ${border}` },
    clientSel:{ padding: "8px 12px", background: isDark ? "rgba(201,168,112,0.08)" : "rgba(201,168,112,0.12)", border: `0.5px solid ${gold}`, borderRadius: 6, fontSize: 13, color: gold, fontFamily: "Plus Jakarta Sans, sans-serif", display: "flex", justifyContent: "space-between", alignItems: "center" },
    error:    { background: "rgba(224,90,90,0.1)", border: "0.5px solid rgba(224,90,90,0.3)", color: "#E08080", padding: "8px 12px", borderRadius: 6, fontSize: 12, fontFamily: "Plus Jakarta Sans, sans-serif" },
    footer:   { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: `0.5px solid ${border}` },
    btnCan:   { background: "transparent", border: `0.5px solid ${border}`, color: mute, padding: "8px 18px", borderRadius: 6, fontSize: 12, fontFamily: "Plus Jakarta Sans, sans-serif", cursor: "pointer" },
    btnSave:  { background: gold, border: "none", color: "#0E0C09", padding: "8px 22px", borderRadius: 6, fontSize: 12, fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.5 : 1 },
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.header}>
          <h2 style={S.title}>{policy ? "Editar póliza" : "Nueva póliza"}</h2>
          <button style={S.btnClose} onClick={onClose}>✕</button>
        </div>
        <div style={S.body}>

          <div>
            <div style={S.secTitle}>Cliente</div>
            {clienteSeleccionado ? (
              <div style={S.clientSel}>
                <span>{clienteSeleccionado.name}</span>
                <button onClick={() => { setForm(p => ({ ...p, client_id: "" })); setBusqueda(""); }}
                  style={{ background: "none", border: "none", color: mute, cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
            ) : (
              <div style={S.group}>
                <input style={S.input} placeholder="Buscar cliente por nombre..."
                  value={busqueda}
                  onChange={e => { setBusqueda(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)} />
                {showDropdown && busqueda && (
                  <div style={S.dropdown}>
                    {clientesFiltrados.length === 0
                      ? <div style={{ ...S.dropItem, color: mute }}>Sin resultados</div>
                      : clientesFiltrados.map(c => (
                        <div key={c.id} style={S.dropItem}
                          onMouseDown={() => { setForm(p => ({ ...p, client_id: c.id })); setBusqueda(c.name); setShowDropdown(false); }}>
                          {c.name}
                          {c.email && <span style={{ color: mute, fontSize: 11, marginLeft: 8 }}>{c.email}</span>}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div style={S.secTitle}>Identificación</div>
            <div style={{ ...S.row, marginBottom: 12 }}>
              <div style={S.group}>
                <label style={S.label}>Ramo *</label>
                <select name="ramo" value={form.ramo} onChange={handleChange} style={S.select}>
                  {RAMOS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div style={S.group}>
                <label style={S.label}>Aseguradora *</label>
                <input name="aseguradora" value={form.aseguradora} onChange={handleChange}
                  style={S.input} placeholder="Mapfre, Allianz, Santalucía..." />
              </div>
            </div>
            <div style={S.row}>
              <div style={S.group}>
                <label style={S.label}>Número de póliza</label>
                <input name="num_poliza" value={form.num_poliza} onChange={handleChange}
                  style={S.input} placeholder="Ej: HO-2024-123456" />
              </div>
              <div style={S.group}>
                <label style={S.label}>Estado trámite</label>
                <select name="estado_tramite" value={form.estado_tramite} onChange={handleChange} style={S.select}>
                  {ESTADOS_TRAMITE.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <div style={S.secTitle}>Fechas y prima</div>
            <div style={{ ...S.row, marginBottom: 12 }}>
              <div style={S.group}>
                <label style={S.label}>Fecha de efecto</label>
                <input type="date" name="fecha_efecto" value={form.fecha_efecto}
                  onChange={handleChange} style={S.input} />
              </div>
              <div style={S.group}>
                <label style={S.label}>Fecha de renovación *</label>
                <input type="date" name="fecha_renovacion" value={form.fecha_renovacion}
                  onChange={handleChange} style={S.input} />
              </div>
            </div>
            <div style={S.row}>
              <div style={S.group}>
                <label style={S.label}>Prima anual (€)</label>
                <input type="text" inputMode="decimal" name="prima_anual" value={form.prima_anual}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (/^\d*[.,]?\d*$/.test(raw)) {
                      setForm(prev => ({ ...prev, prima_anual: raw }));
                    }
                  }}
                  style={S.input} placeholder="0,00" />
              </div>
              <div style={S.group}>
                <label style={S.label}>Estado póliza</label>
                <input name="estado_poliza" value={form.estado_poliza} onChange={handleChange}
                  style={S.input} placeholder="Activa, Suspendida..." />
              </div>
            </div>
          </div>

          <div style={S.group}>
            <label style={S.label}>Observaciones</label>
            <textarea name="observaciones" value={form.observaciones} onChange={handleChange}
              rows={3} style={{ ...S.input, resize: "vertical", minHeight: 70 }} />
          </div>

          {error && <div style={S.error}>{error}</div>}
        </div>
        <div style={S.footer}>
          <button style={S.btnCan} onClick={onClose}>Cancelar</button>
          <button style={S.btnSave} onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando..." : policy ? "Guardar cambios" : "Crear póliza"}
          </button>
        </div>
      </div>
    </div>
  );
}
