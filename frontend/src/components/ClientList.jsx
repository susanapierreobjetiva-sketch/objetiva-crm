import { useState, useEffect } from "react";
import { api } from "../api";
import ExportButton from "./ExportButton";
import ConfirmModal from "./ConfirmModal";
import { DARK, LIGHT } from "../theme";

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

export default function ClientList({ clients, policies, onRefresh, currentUser, onSelect, theme }) {
  const T = theme === "dark" ? DARK : LIGHT;
  const S = getStyles(T);
  const [search, setSearch]         = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [formData, setFormData]     = useState(emptyClient);
  const [editId, setEditId]         = useState(null);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState("");
  const [filterTipo, setFilterTipo]     = useState("Todos");
  const [filterAgente, setFilterAgente] = useState("Todos");
  const [filterDesde, setFilterDesde]   = useState("");
  const [filterHasta, setFilterHasta]   = useState("");
  const [showFilters, setShowFilters]   = useState(false);
  const [agents, setAgents]             = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name, nPolizas, nSiniestros }

  useEffect(() => {
    if (currentUser.role === "admin") {
      api.getAgents().then(setAgents).catch(() => setAgents([]));
    }
  }, [currentUser.role]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const filtered = clients.filter(c => {
    const matchTipo   = filterTipo === "Todos" || c.tipo === filterTipo;
    const matchAgente = filterAgente === "Todos" || c.assigned_to_id === filterAgente;
    const matchDesde  = !filterDesde || (c.created_at && c.created_at >= filterDesde);
    const matchHasta  = !filterHasta || (c.created_at && c.created_at <= filterHasta + "T23:59:59");
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.dni || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.empresa || "").toLowerCase().includes(search.toLowerCase());
    return matchTipo && matchAgente && matchDesde && matchHasta && matchSearch;
  });

  const activeFilters = (filterTipo !== "Todos" ? 1 : 0) + (filterAgente !== "Todos" ? 1 : 0) +
    (filterDesde ? 1 : 0) + (filterHasta ? 1 : 0);

  const resetFilters = () => {
    setFilterTipo("Todos"); setFilterAgente("Todos");
    setFilterDesde(""); setFilterHasta("");
  };

  const clientPolicyCount   = (id) => policies.filter(p => p.client_id === id).length;
  const clientPrima         = (id) => policies
    .filter(p => p.client_id === id && p.estado_poliza === "Activa")
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

  // Abre el modal con el detalle del impacto
  const askDelete = (c, e) => {
    e.stopPropagation();
    const nPolizas    = clientPolicyCount(c.id);
    const nSiniestros = policies
      .filter(p => p.client_id === c.id)
      .reduce((acc) => acc, 0); // placeholder — usamos claims del store global si disponible
    setConfirmDelete({ id: c.id, name: c.name, nPolizas });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.deleteClient(confirmDelete.id);
      await onRefresh();
      showToast("Cliente eliminado");
    } catch (e) { showToast(e.message || "Error"); }
    setConfirmDelete(null);
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

      {/* Modal de confirmación de borrado */}
      {confirmDelete && (
        <ConfirmModal
          title={`Eliminar a ${confirmDelete.name}`}
          message="Esta acción es irreversible. Se eliminarán permanentemente todos los datos asociados a este cliente."
          detail={[
            { icon: "📋", label: "Pólizas", value: confirmDelete.nPolizas },
            { icon: "⚠️", label: "Siniestros", value: "todos los asociados" },
            { icon: "📎", label: "Documentos", value: "todos los adjuntos" },
            { icon: "📝", label: "Historial", value: "completo" },
          ]}
          confirmLabel="Sí, eliminar todo"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          theme={theme}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        paddingBottom: 20, borderBottom: `0.5px solid ${T.border}`, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={S.eyebrow}>Cartera</div>
          <h1 style={S.title}>Clientes</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <ExportButton
            title="Clientes" filename="clientes" data={filtered}
            columns={[
              { label: "Nombre",    value: r => r.name },
              { label: "Tipo",      value: r => r.tipo },
              { label: "DNI/CIF",   value: r => r.dni },
              { label: "Email",     value: r => r.email },
              { label: "Teléfono",  value: r => r.phone },
              { label: "Dirección", value: r => r.address },
              { label: "Empresa",   value: r => r.empresa },
              { label: "Agente",    value: r => r.assigned_to },
              { label: "Alta",      value: r => r.created_at ? new Date(r.created_at).toLocaleDateString("es-ES") : "" },
            ]}
          />
          <button onClick={() => { setShowForm(true); setEditId(null); setFormData(emptyClient); }} style={S.btn}>
            + Nuevo cliente
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ ...S.searchWrap, flex: 1 }}>
            <Icon d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0" size={15} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, DNI, email, teléfono..." style={S.searchInput} />
          </div>
          <button onClick={() => setShowFilters(o => !o)}
            style={{ ...S.chip, ...(showFilters || activeFilters > 0 ? S.chipActive : {}),
              display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            ⚙ Filtros {activeFilters > 0 && `(${activeFilters})`}
          </button>
          {activeFilters > 0 && (
            <button onClick={resetFilters} style={{ ...S.chip, color: "#E08080", borderColor: "#8B3A3A" }}>
              ✕ Limpiar
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Todos", "Particular", "Empresa"].map(t => (
            <button key={t} onClick={() => setFilterTipo(t)}
              style={{ ...S.chip, ...(filterTipo === t ? S.chipActive : {}) }}>{t}</button>
          ))}
        </div>

        {showFilters && (
          <div style={{ background: T.card, border: `0.5px solid ${T.border}`,
            borderRadius: 8, padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: 16 }}>
            {currentUser.role === "admin" && (
              <div style={{ minWidth: 180, flex: 1 }}>
                <div style={S.filterLabel}>Agente asignado</div>
                <select value={filterAgente} onChange={e => setFilterAgente(e.target.value)} style={S.filterSelect}>
                  <option value="Todos">Todos</option>
                  {agents.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ minWidth: 150, flex: 1 }}>
              <div style={S.filterLabel}>Alta desde</div>
              <input type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)} style={S.filterSelect} />
            </div>
            <div style={{ minWidth: 150, flex: 1 }}>
              <div style={S.filterLabel}>Alta hasta</div>
              <input type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)} style={S.filterSelect} />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
        {[
          { label: "Total clientes", value: clients.length },
          { label: "Total pólizas",  value: policies.length },
          { label: "Prima cartera",  value: `${policies.filter(p => p.estado_poliza === "Activa").reduce((s, p) => s + (p.prima_anual || 0), 0).toLocaleString("es-ES")} €` },
        ].map(k => (
          <div key={k.label} style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.15em", color: T.mute, textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: T.gold, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: T.mute, fontSize: 13, fontFamily: "Plus Jakarta Sans, sans-serif" }}>Sin clientes</div>
        )}
        {filtered.map(c => {
          const nPolizas = clientPolicyCount(c.id);
          const prima    = clientPrima(c.id);
          return (
            <div key={c.id} onClick={() => onSelect(c.id)}
              style={{ background: T.card, border: `0.5px solid ${T.border}`,
                borderRadius: 8, padding: "14px 16px", cursor: "pointer",
                display: "flex", flexDirection: "column", gap: 10, transition: "border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T.goldDim}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.lift,
                  border: `1px solid ${T.goldDim}`, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.gold, flexShrink: 0 }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 16, fontWeight: 600,
                    color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.name}
                  </div>
                  {c.empresa && (
                    <div style={{ fontSize: 13, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.empresa}
                    </div>
                  )}
                  {(c.email || c.phone) && (
                    <div style={{ fontSize: 12, color: T.textSub, marginTop: 2,
                      fontFamily: "Plus Jakarta Sans, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {[c.email, c.phone].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999, background: T.lift,
                  color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em",
                  textTransform: "uppercase", flexShrink: 0 }}>{c.tipo}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 8,
                borderTop: `0.5px solid ${T.border}` }} onClick={e => e.stopPropagation()}>
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.gold, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{nPolizas}</div>
                  <div style={{ fontSize: 10, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>pólizas</div>
                </div>
                {prima > 0 && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: T.gold, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{prima.toLocaleString("es-ES")} €</div>
                    <div style={{ fontSize: 10, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>prima/año</div>
                  </div>
                )}
                {prima === 0 && <div style={{ flex: 1 }} />}
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={e => openEdit(c, e)} style={S.iconBtn} title="Editar">
                    <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={14} />
                  </button>
                  {currentUser.role === "admin" && (
                    <button onClick={e => askDelete(c, e)} style={{ ...S.iconBtn, color: "#8B3A3A" }} title="Eliminar">
                      <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={S.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 20, paddingBottom: 16, borderBottom: `0.5px solid ${T.border}` }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                {editId ? "Editar cliente" : "Nuevo cliente"}
              </span>
              <button onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", color: T.mute, cursor: "pointer", fontSize: 18 }}>✕</button>
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
                    const u = agents.find(u => u.id === e.target.value);
                    set("assigned_to_id", e.target.value);
                    set("assigned_to", u?.name || "");
                  }} style={S.input}>
                    <option value="">Sin asignar</option>
                    {agents.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
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

const getStyles = (T) => ({
  filterLabel:  { fontSize: 10, letterSpacing: "0.15em", color: T.mute, textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 6 },
  filterSelect: { width: "100%", background: T.lift, border: `0.5px solid ${T.border}`, color: T.text, padding: "8px 12px", borderRadius: 6, fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" },
  eyebrow:    { fontSize: 13, letterSpacing: "0.2em", color: T.gold, textTransform: "uppercase", marginBottom: 8, fontFamily: "Plus Jakarta Sans, sans-serif" },
  title:      { fontSize: 40, fontWeight: 700, color: T.text, margin: 0, letterSpacing: "-0.5px", fontFamily: "Plus Jakarta Sans, sans-serif" },
  btn:        { display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: T.gold, color: T.bgApp, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" },
  btnOutline: { padding: "9px 18px", background: "none", color: T.gold, border: `1px solid ${T.goldDim}`, borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" },
  iconBtn:    { background: "none", border: "none", color: T.mute, cursor: "pointer", padding: 6, borderRadius: 4, display: "flex", alignItems: "center" },
  searchWrap: { display: "flex", alignItems: "center", gap: 10, background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "10px 16px" },
  searchInput:{ flex: 1, background: "none", border: "none", color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, outline: "none" },
  chip:       { padding: "5px 14px", borderRadius: 999, border: `0.5px solid ${T.border}`, background: "none", color: T.textSub, cursor: "pointer", fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" },
  chipActive: { border: `0.5px solid ${T.gold}`, color: T.bgApp, background: T.gold, fontWeight: 700 },
  input:      { width: "100%", background: T.lift, border: `0.5px solid ${T.border}`, color: T.text, padding: "10px 14px", borderRadius: 6, fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" },
  formLabel:  { display: "block", fontSize: 11, letterSpacing: "0.2em", color: T.mute, textTransform: "uppercase", marginBottom: 6, fontFamily: "Plus Jakarta Sans, sans-serif" },
  overlay:    { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal:      { background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: 28, width: "min(500px, 95vw)", maxHeight: "90vh", overflow: "auto" },
  toast:      { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: T.card, border: `1px solid ${T.goldDim}`, color: T.gold, padding: "11px 22px", borderRadius: 6, fontSize: 12, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: 1.5, textTransform: "uppercase", zIndex: 200 },
});
