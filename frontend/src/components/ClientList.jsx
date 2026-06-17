import { useState } from "react";
import { api } from "../api";

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
  name: "", dni: "", email: "", phone: "", address: "",
  birth_date: "", tipo: "Particular", empresa: "",
  notas: "", assigned_to: "", assigned_to_id: "",
};

export default function ClientList({ clients, policies, onRefresh, currentUser, onSelect }) {
  const [search, setSearch]     = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyClient);
  const [editId, setEditId]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const filtered = clients.filter(c => {
    const matchTipo   = filterTipo === "Todos" || c.tipo === filterTipo;
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.dni || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.empresa || "").toLowerCase().includes(search.toLowerCase());
    return matchTipo && matchSearch;
  });

  const clientPolicyCount = (clientId) => policies.filter(p => p.client_id === clientId).length;
  const clientPrima = (clientId) => policies
    .filter(p => p.client_id === clientId && p.estado_poliza === "Activa")
    .reduce((s, p) => s + (p.prima_anual || 0), 0);

  const set = (k, v) => setFormData(d => ({ ...d, [k]: v }));

  const handleSubmit = async () => {
    if (!formData.name) return showToast("El nombre es obligatorio");
    setSaving(true);
    try {
      if (editId) await api.updateClient(editId, formData);
      else        await api.createClient(formData);
      await onRefresh();
      setShowForm(false); setEditId(null); setFormData(emptyClient);
      showToast(editId ? "Cliente actualizado ✓" : "Cliente creado ✓");
    } catch (e) { showToast(e.message || "Error"); }
    setSaving(false);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("¿Eliminar este cliente y todas sus pólizas y siniestros?")) return;
    try { await api.deleteClient(id); await onRefresh(); showToast("Cliente eliminado"); }
    catch (e) { showToast(e.message || "Error"); }
  };

  const openEdit = (c, e) => {
    e.stopPropagation();
    setFormData({ ...emptyClient, ...c });
    setEditId(c.id);
    setShowForm(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {toast && <div style={S.toast}>{toast}</div>}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        paddingBottom: 20, borderBottom: "0.5px solid var(--border)", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={S.eyebrow}>Cartera</div>
          <h1 style={S.title}>Clientes</h1>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setFormData(emptyClient); }} style={S.btn}>
          + Nuevo cliente
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={S.searchWrap}>
          <Icon d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0" size={15} stroke="var(--mute)" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, DNI, email, teléfono..." style={S.searchInput} />
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["Todos", "Particular", "Empresa"].map(t => (
            <button key={t} onClick={() => setFilterTipo(t)}
              style={{ ...S.chip, ...(filterTipo === t ? S.chipActive : {}) }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
        {[
          { label: "Total clientes", value: clients.length },
          { label: "Total pólizas",  value: policies.length },
          { label: "Prima cartera",  value: `${policies.filter(p => p.estado_poliza === "Activa").reduce((s, p) => s + (p.prima_anual || 0), 0).toLocaleString("es-ES")} €` },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--card)", border: "0.5px solid var(--border)",
            borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--mute)",
              textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--mute)",
            fontSize: 13, fontFamily: "Plus Jakarta Sans, sans-serif" }}>Sin clientes</div>
        )}
        {filtered.map(c => {
          const nPolizas = clientPolicyCount(c.id);
          const prima    = clientPrima(c.id);
          return (
            <div key={c.id} onClick={() => onSelect(c.id)}
              style={{ background: "var(--card)", border: "0.5px solid var(--border)",
                borderRadius: 8, padding: "14px 16px", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 12,
                transition: "border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--goldDim)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>

              {/* Avatar */}
              <div style={{ width: 40, height: 40, borderRadius: "50%",
                background: "var(--lift)", border: "1px solid var(--goldDim)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: "var(--gold)", flexShrink: 0 }}>
                {c.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 16, fontWeight: 600,
                  color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.name}
                  {c.empresa && <span style={{ fontSize: 14, color: "var(--mute)", marginLeft: 8 }}>· {c.empresa}</span>}
                </div>
                <div style={{ fontSize: 14, color: "var(--textSub)", marginTop: 2,
                  fontFamily: "Plus Jakarta Sans, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {[c.email, c.phone].filter(Boolean).join(" · ")}
                </div>
              </div>

              {/* Pólizas */}
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{nPolizas}</div>
                <div style={{ fontSize: 11, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>pólizas</div>
              </div>

              {/* Prima */}
              {prima > 0 && (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                    {prima.toLocaleString("es-ES")} €
                  </div>
                  <div style={{ fontSize: 11, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>prima/año</div>
                </div>
              )}

              {/* Tipo */}
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999,
                background: "var(--lift)", color: "var(--mute)",
                fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em",
                textTransform: "uppercase", flexShrink: 0 }}>{c.tipo}</span>

              {/* Acciones */}
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={e => openEdit(c, e)} style={S.iconBtn} title="Editar">
                  <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={14} />
                </button>
                {currentUser.role === "admin" && (
                  <button onClick={e => handleDelete(c.id, e)} style={{ ...S.iconBtn, color: "#8B3A3A" }} title="Eliminar">
                    <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal formulario */}
      {showForm && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={S.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 20, paddingBottom: 16, borderBottom: "0.5px solid var(--border)" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                {editId ? "Editar cliente" : "Nuevo cliente"}
              </span>
              <button onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", color: "var(--mute)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.formLabel}>Tipo</label>
                  <select value={formData.tipo} onChange={e => set("tipo", e.target.value)} style={S.input}>
                    <option>Particular</option>
                    <option>Empresa</option>
                  </select>
                </div>
                {formData.tipo === "Empresa" && (
                  <div>
                    <label style={S.formLabel}>Nombre empresa</label>
                    <input value={formData.empresa} onChange={e => set("empresa", e.target.value)}
                      placeholder="Razón social" style={S.input} />
                  </div>
                )}
              </div>

              {[
                { label: "Nombre completo *", key: "name",       placeholder: "Nombre y apellidos" },
                { label: "DNI / NIF",         key: "dni",        placeholder: "12345678A" },
                { label: "Email",             key: "email",      placeholder: "email@ejemplo.com" },
                { label: "Teléfono",          key: "phone",      placeholder: "+34 600 000 000" },
                { label: "Dirección",         key: "address",    placeholder: "Dirección completa" },
                { label: "Fecha nacimiento",  key: "birth_date", placeholder: "", type: "date" },
              ].map(f => (
                <div key={f.key}>
                  <label style={S.formLabel}>{f.label}</label>
                  <input type={f.type || "text"} value={formData[f.key]}
                    onChange={e => set(f.key, e.target.value)}
                    placeholder={f.placeholder} style={S.input} />
                </div>
              ))}

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
                <textarea value={formData.notas} onChange={e => set("notas", e.target.value)}
                  rows={3} style={{ ...S.input, resize: "vertical" }} />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowForm(false)} style={S.btnOutline}>Cancelar</button>
                <button onClick={handleSubmit} disabled={saving}
                  style={{ ...S.btn, flex: 1, justifyContent: "center", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Guardando..." : editId ? "Guardar cambios" : "Crear cliente"}
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
  eyebrow:    { fontSize: 13, letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 8, fontFamily: "Plus Jakarta Sans, sans-serif" },
  title:      { fontSize: 40, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.5px", fontFamily: "Plus Jakarta Sans, sans-serif" },
  btn:        { display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "var(--gold)", color: "var(--bgApp)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" },
  btnOutline: { padding: "9px 18px", background: "none", color: "var(--gold)", border: "1px solid var(--goldDim)", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" },
  iconBtn:    { background: "none", border: "none", color: "var(--mute)", cursor: "pointer", padding: 6, borderRadius: 4, display: "flex", alignItems: "center" },
  searchWrap: { display: "flex", alignItems: "center", gap: 10, background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "10px 16px" },
  searchInput:{ flex: 1, background: "none", border: "none", color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, outline: "none" },
  chip:       { padding: "5px 14px", borderRadius: 999, border: "0.5px solid var(--border)", background: "none", color: "var(--textSub)", cursor: "pointer", fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" },
  chipActive: { border: "0.5px solid var(--gold)", color: "var(--bgApp)", background: "var(--gold)", fontWeight: 700 },
  input:      { width: "100%", background: "var(--lift)", border: "0.5px solid var(--border)", color: "var(--text)", padding: "10px 14px", borderRadius: 6, fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" },
  formLabel:  { display: "block", fontSize: 11, letterSpacing: "0.2em", color: "var(--mute)", textTransform: "uppercase", marginBottom: 6, fontFamily: "Plus Jakarta Sans, sans-serif" },
  overlay:    { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal:      { background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: 28, width: "min(500px, 95vw)", maxHeight: "90vh", overflow: "auto" },
  toast:      { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "var(--card)", border: "1px solid var(--goldDim)", color: "var(--gold)", padding: "11px 22px", borderRadius: 6, fontSize: 12, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: 1.5, textTransform: "uppercase", zIndex: 200 },
};
