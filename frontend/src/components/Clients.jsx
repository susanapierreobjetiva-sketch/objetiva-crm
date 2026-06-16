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

const RAMOS = ["Hogar", "Auto", "Vida", "Salud", "Empresa", "Responsabilidad Civil", "Decesos", "Viaje", "Otros"];

const ASEGURADORAS = ["Mapfre", "Allianz", "AXA", "Generali", "Zurich", "Mutua Madrileña", "Santalucía", "Caser", "Reale", "Helvetia", "Avant2", "Otras"];

const USERS = [
  { id: "6a1d68ea40b970a912044bda", name: "Javier Arquillo" },
  { id: "6a1d68eb40b970a912044bdc", name: "Javier Segura" },
  { id: "6a1d68eb40b970a912044bdd", name: "Susana Pierre" },
];

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const emptyClient = {
  name: "", email: "", phone: "", address: "", dni: "",
  ramo: "Hogar", aseguradora: "", num_poliza: "",
  prima_anual: 0, fecha_efecto: "", fecha_renovacion: "",
  stage: "Nuevo", estado_poliza: "", assigned_to: "", assigned_to_id: "",
  notes: "", tags: [], contacts: [],
};

export default function Clients({ clients, onRefresh, currentUser, focusId, setFocusId }) {
  const [search, setSearch]           = useState("");
  const [filterStage, setFilterStage] = useState("Todas");
  const [filterRamo, setFilterRamo]   = useState("Todos");
  const [showForm, setShowForm]       = useState(false);
  const [formData, setFormData]       = useState(emptyClient);
  const [editId, setEditId]           = useState(null);
  const [openId, setOpenId]           = useState(focusId || null);
  const [newNote, setNewNote]         = useState("");
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const filtered = clients.filter(c => {
    const matchStage  = filterStage === "Todas" || c.stage === filterStage;
    const matchRamo   = filterRamo === "Todos" || c.ramo === filterRamo;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.aseguradora || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.num_poliza || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase());
    return matchStage && matchRamo && matchSearch;
  });

  const openEdit = (c) => {
    setFormData({ ...emptyClient, ...c });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) return showToast("El nombre es obligatorio");
    setSaving(true);
    try {
      if (editId) await api.updateClient(editId, formData);
      else        await api.createClient(formData);
      await onRefresh();
      setShowForm(false); setEditId(null); setFormData(emptyClient);
      showToast(editId ? "Trámite actualizado ✓" : "Trámite creado ✓");
    } catch (e) { showToast(e.message || "Error"); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este trámite?")) return;
    try { await api.deleteClient(id); await onRefresh(); showToast("Eliminado"); }
    catch (e) { showToast(e.message || "Error"); }
  };

  const handleAddNote = async (clientId) => {
    if (!newNote.trim()) return;
    try {
      await api.addActivity(clientId, newNote.trim());
      await onRefresh();
      setNewNote("");
      showToast("Gestión registrada ✓");
    } catch (e) { showToast(e.message || "Error"); }
  };

  const handleDeleteActivity = async (clientId, actId) => {
    try { await api.deleteActivity(clientId, actId); await onRefresh(); }
    catch (e) { showToast(e.message || "Error"); }
  };

  const set = (k, v) => setFormData(d => ({ ...d, [k]: v }));

  const today = new Date().toISOString().split("T")[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {toast && <div style={S.toast}>{toast}</div>}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        paddingBottom: 20, borderBottom: "0.5px solid var(--border)", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={S.eyebrow}>Correduría de Seguros</div>
          <h1 style={S.title}>Trámites y Clientes</h1>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setFormData(emptyClient); }} style={S.btn}>
          + Nuevo trámite
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={S.searchWrap}>
          <Icon d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0" size={15} stroke="var(--mute)" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, póliza, aseguradora..." style={S.searchInput} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Todas", ...STAGES].map(s => (
            <button key={s} onClick={() => setFilterStage(s)}
              style={{ ...S.chip, ...(filterStage === s ? S.chipActive : {}) }}>{s}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Todos", ...RAMOS].map(r => (
            <button key={r} onClick={() => setFilterRamo(r)}
              style={{ ...S.chip, ...(filterRamo === r ? S.chipActive : {}) }}>{r}</button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--mute)",
            fontSize: 13, fontFamily: "Syne, sans-serif" }}>Sin trámites</div>
        )}
        {filtered.map(c => (
          <div key={c.id} style={{ background: "var(--card)", border: "0.5px solid var(--border)",
            borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
              cursor: "pointer" }} onClick={() => setOpenId(openId === c.id ? null : c.id)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 600,
                  color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--textSub)", marginTop: 2,
                  fontFamily: "Syne, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {[c.ramo, c.aseguradora, c.num_poliza].filter(Boolean).join(" · ")}
                </div>
              </div>
              {c.fecha_renovacion && c.fecha_renovacion <= today && (
                <span title="Renovación vencida" style={{ fontSize: 14 }}>⚠️</span>
              )}
              {c.prima_anual > 0 && (
                <span style={{ fontSize: 11, color: "var(--gold)", fontFamily: "Syne, sans-serif",
                  whiteSpace: "nowrap" }}>{c.prima_anual.toLocaleString("es-ES")} €/año</span>
              )}
              <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999,
                background: "var(--lift)", color: STAGE_COLORS[c.stage] || "var(--mute)",
                fontFamily: "Syne, sans-serif", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
                {c.stage}
              </span>
              <span style={{ fontSize: 10, color: "var(--mute)" }}>{openId === c.id ? "▲" : "▼"}</span>
            </div>

            {openId === c.id && (
              <div style={{ padding: "0 16px 16px", borderTop: "0.5px solid var(--border)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginTop: 14 }}>
                  {[
                    { label: "DNI/NIF",        value: c.dni },
                    { label: "Email",           value: c.email },
                    { label: "Teléfono",        value: c.phone },
                    { label: "Dirección",       value: c.address },
                    { label: "Ramo",            value: c.ramo },
                    { label: "Aseguradora",     value: c.aseguradora },
                    { label: "Nº Póliza",       value: c.num_poliza },
                    { label: "Prima anual",     value: c.prima_anual ? `${c.prima_anual.toLocaleString("es-ES")} €` : null },
                    { label: "Fecha efecto",    value: c.fecha_efecto },
                    { label: "Fecha renovación",value: c.fecha_renovacion },
                    { label: "Asignado a",      value: c.assigned_to },
                    { label: "Estado póliza",   value: c.estado_poliza },
                    { label: "Estado póliza",   value: c.estado_poliza },
                  ].filter(f => f.value).map(f => (
                    <div key={f.label}>
                      <div style={S.fieldLabel}>{f.label}</div>
                      <div style={S.fieldVal}>{f.value}</div>
                    </div>
                  ))}
                </div>

                {c.notes && (
                  <div style={{ marginTop: 12 }}>
                    <div style={S.fieldLabel}>Notas</div>
                    <div style={{ ...S.fieldVal, whiteSpace: "pre-wrap" }}>{c.notes}</div>
                  </div>
                )}

                {/* Historial gestiones */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--mute)",
                    textTransform: "uppercase", fontFamily: "Syne, sans-serif", marginBottom: 10 }}>
                    Historial de gestiones
                  </div>
                  {(c.activities || []).length === 0 && (
                    <div style={{ color: "var(--mute)", fontSize: 12, fontFamily: "Syne, sans-serif" }}>Sin gestiones registradas</div>
                  )}
                  {(c.activities || []).slice().reverse().map(a => (
                    <div key={a.id} style={{ display: "flex", gap: 10, padding: "8px 0",
                      borderBottom: "0.5px solid var(--border)", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: "var(--text)", fontFamily: "Syne, sans-serif" }}>{a.note}</div>
                        <div style={{ fontSize: 10, color: "var(--mute)", marginTop: 3, fontFamily: "Syne, sans-serif" }}>
                          {a.user} · {new Date(a.date).toLocaleDateString("es-ES")}
                        </div>
                      </div>
                      <button onClick={() => handleDeleteActivity(c.id, a.id)}
                        style={{ background: "none", border: "none", color: "#8B3A3A", cursor: "pointer", fontSize: 13 }}>✕</button>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <input value={newNote} onChange={e => setNewNote(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAddNote(c.id)}
                      placeholder="Registrar gestión..."
                      style={{ ...S.input, flex: 1 }} />
                    <button onClick={() => handleAddNote(c.id)} style={S.btn}>Añadir</button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
                  <button onClick={() => openEdit(c)} style={S.btnOutline}>Editar</button>
                  {currentUser.role === "admin" && (
                    <button onClick={() => handleDelete(c.id)} style={S.btnDanger}>Eliminar</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal formulario */}
      {showForm && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={S.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 20, paddingBottom: 16, borderBottom: "0.5px solid var(--border)" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", fontFamily: "Syne, sans-serif" }}>
                {editId ? "Editar trámite" : "Nuevo trámite"}
              </span>
              <button onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", color: "var(--mute)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Datos del tomador */}
              <div style={S.sectionTitle}>Datos del tomador</div>
              {[
                { label: "Nombre completo *", key: "name",    placeholder: "Nombre del cliente" },
                { label: "DNI / NIF",         key: "dni",     placeholder: "12345678A" },
                { label: "Email",             key: "email",   placeholder: "email@ejemplo.com" },
                { label: "Teléfono",          key: "phone",   placeholder: "+34 600 000 000" },
                { label: "Dirección",         key: "address", placeholder: "Dirección completa" },
              ].map(f => (
                <div key={f.key}>
                  <label style={S.formLabel}>{f.label}</label>
                  <input value={formData[f.key]} onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder} style={S.input} />
                </div>
              ))}

              {/* Datos del seguro */}
              <div style={{ ...S.sectionTitle, marginTop: 8 }}>Datos del seguro</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.formLabel}>Ramo</label>
                  <select value={formData.ramo} onChange={e => set("ramo", e.target.value)} style={S.input}>
                    {RAMOS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.formLabel}>Aseguradora</label>
                  <select value={formData.aseguradora} onChange={e => set("aseguradora", e.target.value)} style={S.input}>
                    <option value="">Seleccionar...</option>
                    {ASEGURADORAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={S.formLabel}>Nº de póliza</label>
                <input value={formData.num_poliza} onChange={e => set("num_poliza", e.target.value)}
                  placeholder="Número de póliza" style={S.input} />
              </div>

              <div>
                <label style={S.formLabel}>Prima anual (€)</label>
                <input type="number" value={formData.prima_anual} onChange={e => set("prima_anual", +e.target.value)}
                  style={S.input} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.formLabel}>Fecha de efecto</label>
                  <input type="date" value={formData.fecha_efecto || ""} onChange={e => set("fecha_efecto", e.target.value)}
                    style={S.input} />
                </div>
                <div>
                  <label style={S.formLabel}>Fecha de renovación</label>
                  <input type="date" value={formData.fecha_renovacion || ""} onChange={e => set("fecha_renovacion", e.target.value)}
                    style={S.input} />
                </div>
              </div>

              {/* Gestión */}
              <div style={{ ...S.sectionTitle, marginTop: 8 }}>Gestión</div>
              <div>
                <label style={S.formLabel}>Estado</label>
                <select value={formData.stage} onChange={e => set("stage", e.target.value)} style={S.input}>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              {currentUser.role === "admin" && (
                <div>
                  <label style={S.formLabel}>Asignar a</label>
                  <select value={formData.assigned_to_id} onChange={e => {
                    const u = USERS.find(u => u.id === e.target.value);
                    set("assigned_to_id", e.target.value);
                    set("assigned_to", u?.name || "");
                  }} style={S.input}>
                    <option value="">Sin asignar</option>
                    {USERS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={S.formLabel}>Notas</label>
                <textarea value={formData.notes} onChange={e => set("notes", e.target.value)}
                  rows={3} style={{ ...S.input, resize: "vertical" }} />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowForm(false)} style={S.btnOutline}>Cancelar</button>
                <button onClick={handleSubmit} disabled={saving}
                  style={{ ...S.btn, flex: 1, justifyContent: "center", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Guardando..." : editId ? "Guardar cambios" : "Crear trámite"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  eyebrow:     { fontSize: 10, letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 8, fontFamily: "Syne, sans-serif" },
  title:       { fontSize: 26, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.5px", fontFamily: "Syne, sans-serif" },
  sectionTitle:{ fontSize: 10, letterSpacing: "0.15em", color: "var(--gold)", textTransform: "uppercase", fontFamily: "Syne, sans-serif", fontWeight: 700 },
  btn:         { display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "var(--gold)", color: "var(--bgApp)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "Syne, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" },
  btnOutline:  { padding: "9px 18px", background: "none", color: "var(--gold)", border: "1px solid var(--goldDim)", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "Syne, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" },
  btnDanger:   { padding: "9px 18px", background: "none", color: "#8B3A3A", border: "1px solid #3A1A1A", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "Syne, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" },
  searchWrap:  { display: "flex", alignItems: "center", gap: 10, background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "10px 16px" },
  searchInput: { flex: 1, background: "none", border: "none", color: "var(--text)", fontFamily: "Syne, sans-serif", fontSize: 13, outline: "none" },
  chip:        { padding: "5px 14px", borderRadius: 999, border: "0.5px solid var(--border)", background: "none", color: "var(--textSub)", cursor: "pointer", fontFamily: "Syne, sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" },
  chipActive:  { border: "0.5px solid var(--gold)", color: "var(--bgApp)", background: "var(--gold)", fontWeight: 700 },
  input:       { width: "100%", background: "var(--lift)", border: "0.5px solid var(--border)", color: "var(--text)", padding: "10px 14px", borderRadius: 6, fontFamily: "Syne, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" },
  formLabel:   { display: "block", fontSize: 9, letterSpacing: "0.2em", color: "var(--mute)", textTransform: "uppercase", marginBottom: 6, fontFamily: "Syne, sans-serif" },
  fieldLabel:  { fontSize: 9, letterSpacing: "0.15em", color: "var(--mute)", textTransform: "uppercase", fontFamily: "Syne, sans-serif", marginBottom: 4 },
  fieldVal:    { fontSize: 13, color: "var(--textSub)", fontFamily: "Syne, sans-serif" },
  overlay:     { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal:       { background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: 28, width: "min(520px, 95vw)", maxHeight: "90vh", overflow: "auto" },
  toast:       { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "var(--card)", border: "1px solid var(--goldDim)", color: "var(--gold)", padding: "11px 22px", borderRadius: 6, fontSize: 12, fontFamily: "Syne, sans-serif", letterSpacing: 1.5, textTransform: "uppercase", zIndex: 200 },
};
