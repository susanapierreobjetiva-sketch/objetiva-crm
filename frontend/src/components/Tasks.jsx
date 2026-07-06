import { useState, useEffect } from "react";
import { api } from "../api";
import ConfirmModal from "./ConfirmModal";

const PRIORITY_COLORS = { "Alta": "#E08080", "Normal": "#C9A870", "Baja": "#7A9E7E" };
const ESTADO_COLORS   = { "Pendiente": "var(--gold)", "Completada": "#27ae60", "Cancelada": "#E08080" };
const ESTADOS_GESTION = ["Pendiente", "Completada", "Cancelada"];

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const emptyTask = {
  title: "", description: "", client_id: "", client_name: "",
  due_date: "", priority: "Normal", assigned_to_id: "", assigned_to: "",
};

const TIPOS_GESTION = ["Llamada", "Email", "Reunión", "WhatsApp", "Otro"];

export default function Tasks({ clients, currentUser }) {
  const [tasks, setTasks]       = useState([]);
  const [agents, setAgents]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(emptyTask);
  const [filterGestion, setFilterGestion] = useState("Todas");
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");
  const [confirmModal, setConfirmModal] = useState(null);

  const [gestionCliente, setGestionCliente] = useState("");
  const [gestionNombre, setGestionNombre]   = useState("");
  const [gestionTipo, setGestionTipo]       = useState("Llamada");
  const [gestionNota, setGestionNota]       = useState("");
  const [savingGestion, setSavingGestion]   = useState(false);
  const [gestionesHoy, setGestionesHoy]     = useState([]);
  const [fechaGestiones, setFechaGestiones] = useState(new Date().toISOString().split("T")[0]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };
  const set = (k, v) => setForm(d => ({ ...d, [k]: v }));

  const loadTasks = async () => {
    setLoading(true);
    try { setTasks(await api.getTasks()); } catch (e) { showToast("Error cargando tareas"); }
    setLoading(false);
  };

  const loadGestionesHoy = async (fecha) => {
    const diaActual = fecha || new Date().toISOString().split("T")[0];
    try {
      const allClients = await api.getClients();
      const gestionesClientes = allClients.flatMap(c =>
        (c.activities || [])
          .filter(a => a.date?.startsWith(diaActual))
          .map(a => ({
            id: a.id,
            client_id: c.id,
            tipo: "cliente",
            cliente: c.name,
            gestion: a.note,
            usuario: a.user,
            estado: a.estado || "Pendiente",
            hora: new Date(a.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
          }))
      );
      const gestionesLibres = await api.getGestionesLibres(diaActual);
      const gestionesProspectos = gestionesLibres.map(g => ({
        id: g.id,
        tipo: "libre",
        cliente: g.cliente + " ✦",
        gestion: g.note,
        usuario: g.user,
        estado: g.estado || "Pendiente",
        hora: new Date(g.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
      }));
      setGestionesHoy([...gestionesClientes, ...gestionesProspectos]
        .sort((a, b) => b.hora.localeCompare(a.hora)));
    } catch (e) {}
  };

  useEffect(() => {
    loadTasks();
    loadGestionesHoy(fechaGestiones);
    api.getAgents().then(setAgents).catch(() => setAgents([]));
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const gestionesFiltradas = gestionesHoy.filter(g => {
    if (filterGestion === "Todas") return true;
    return g.estado === filterGestion;
  });

  const vencidas    = tasks.filter(t => t.estado === "Pendiente" && t.due_date && t.due_date < today).length;
  const pendientes  = tasks.filter(t => t.estado === "Pendiente").length;
  const completadas = tasks.filter(t => t.estado === "Completada").length;

  const handleSave = async () => {
    if (!form.title) return showToast("El título es obligatorio");
    setSaving(true);
    try {
      if (editId) await api.updateTask(editId, form);
      else        await api.createTask(form);
      await loadTasks();
      setShowForm(false); setEditId(null); setForm(emptyTask);
      showToast(editId ? "Tarea actualizada ✓" : "Tarea creada ✓");
    } catch (e) { showToast(e.message || "Error"); }
    setSaving(false);
  };

  const handleComplete = async (task) => {
    try {
      await api.updateTask(task.id, { estado: task.estado === "Completada" ? "Pendiente" : "Completada" });
      await loadTasks();
    } catch (e) { showToast("Error"); }
  };

  const handleDelete = (id) => {
    const task = tasks.find(t => t.id === id);
    setConfirmModal({
      title: "Eliminar tarea",
      message: "Se eliminará esta tarea permanentemente.",
      detail: [{ icon: "✅", label: "Tarea", value: task?.title || id }],
      onConfirm: async () => {
        setConfirmModal(null);
        try { await api.deleteTask(id); await loadTasks(); showToast("Tarea eliminada"); }
        catch (e) { showToast("Error"); }
      }
    });
  };

  const openEdit = (task) => {
    setEditId(task.id);
    setForm({
      title: task.title, description: task.description,
      client_id: task.client_id, client_name: task.client_name,
      due_date: task.due_date, priority: task.priority,
      assigned_to_id: task.assigned_to_id, assigned_to: task.assigned_to,
    });
    setShowForm(true);
  };

  const handleGestion = async () => {
    if (!gestionNota.trim()) return showToast("Escribe una nota");
    const nombreFinal = gestionCliente
      ? clients.find(c => c.id === gestionCliente)?.name || "—"
      : gestionNombre.trim();
    if (!nombreFinal) return showToast("Indica el nombre o selecciona un cliente");
    setSavingGestion(true);
    try {
      const nota = `[${gestionTipo}] ${gestionNota.trim()}`;
      if (gestionCliente) {
        await api.addActivity(gestionCliente, nota);
      } else {
        await api.addGestionLibre(nombreFinal, nota, gestionTipo);
      }
      setGestionNota(""); setGestionCliente(""); setGestionNombre(""); setGestionTipo("Llamada");
      const hoy = new Date().toISOString().split("T")[0];
      setFechaGestiones(hoy);
      await loadGestionesHoy(hoy);
      showToast("Gestión registrada ✓");
    } catch (e) { showToast("Error al registrar gestión"); }
    setSavingGestion(false);
  };

  const handleDeleteGestion = (g) => {
    setConfirmModal({
      title: "Eliminar gestión",
      message: "Se eliminará esta gestión permanentemente.",
      detail: [{ icon: "📋", label: "Cliente", value: g.cliente }],
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          if (g.tipo === "libre") {
            await api.deleteGestionLibre(g.id);
          } else {
            await api.deleteActivity(g.client_id, g.id);
          }
          await loadGestionesHoy(fechaGestiones);
          showToast("Gestión eliminada");
        } catch (e) { showToast("Error al eliminar"); }
      }
    });
  };

  const handleEstadoGestion = async (g, nuevoEstado) => {
    try {
      if (g.tipo === "libre") {
        await api.updateGestionLibre(g.id, nuevoEstado);
      } else {
        await api.updateActivity(g.client_id, g.id, nuevoEstado);
      }
      await loadGestionesHoy(fechaGestiones);
    } catch (e) { showToast("Error al actualizar estado"); }
  };

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
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={S.eyebrow}>Gestión</div>
          <h1 style={S.title}>Tareas</h1>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyTask); }} style={S.btn}>
          + Nueva tarea
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        {[
          { label: "Pendientes",  value: pendientes,  color: "var(--gold)" },
          { label: "Vencidas",    value: vencidas,    color: "#E08080" },
          { label: "Completadas", value: completadas, color: "#27ae60" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--mute)", textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: k.color, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Registro rápido de gestiones */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "18px 20px" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 14 }}>
          Registrar gestión
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={S.formLabel}>Cliente</label>
            <select value={gestionCliente} onChange={e => { setGestionCliente(e.target.value); setGestionNombre(""); }} style={S.input}>
              <option value="">Prospecto / nombre libre</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={S.formLabel}>Tipo</label>
            <select value={gestionTipo} onChange={e => setGestionTipo(e.target.value)} style={S.input}>
              {TIPOS_GESTION.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {!gestionCliente && (
          <div style={{ marginBottom: 10 }}>
            <label style={S.formLabel}>Nombre del prospecto</label>
            <input value={gestionNombre} onChange={e => setGestionNombre(e.target.value)}
              placeholder="Nombre y apellidos..." style={S.input} />
          </div>
        )}
        <div style={{ marginBottom: 10 }}>
          <label style={S.formLabel}>Nota</label>
          <textarea value={gestionNota} onChange={e => setGestionNota(e.target.value)}
            rows={2} placeholder="Describe la gestión realizada..."
            style={{ ...S.input, resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            👤 {currentUser?.name || "—"}
          </span>
          <button onClick={handleGestion} disabled={savingGestion} style={{ ...S.btn, opacity: savingGestion ? 0.7 : 1 }}>
            {savingGestion ? "Guardando..." : "Registrar"}
          </button>
        </div>

        {/* Selector de fecha + filtros + lista gestiones */}
        <div style={{ marginTop: 16, borderTop: "0.5px solid var(--border)", paddingTop: 14 }}>

          {/* Header: label + fecha + botón Hoy */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--mute)", textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Gestiones del día
            </span>
            <input
              type="date"
              value={fechaGestiones}
              onChange={e => { setFechaGestiones(e.target.value); loadGestionesHoy(e.target.value); }}
              style={{ background: "var(--lift)", border: "0.5px solid var(--border)", color: "var(--text)",
                padding: "5px 10px", borderRadius: 6, fontFamily: "Plus Jakarta Sans, sans-serif",
                fontSize: 12, outline: "none", width: "160px", flexShrink: 0 }}
            />
            {fechaGestiones !== today && (
              <button onClick={() => { setFechaGestiones(today); loadGestionesHoy(today); }}
                style={{ ...S.btnOutline, padding: "5px 14px", fontSize: 10 }}>
                Hoy
              </button>
            )}
          </div>

          {/* Filtros de gestiones */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {["Todas", "Pendiente", "Completada", "Cancelada"].map(f => {
              const count = f === "Todas" ? gestionesHoy.length : gestionesHoy.filter(g => g.estado === f).length;
              return (
                <button key={f} onClick={() => setFilterGestion(f)}
                  style={{ ...S.chipSm, ...(filterGestion === f ? S.chipSmActive : {}) }}>
                  {f} <span style={{ opacity: 0.7, marginLeft: 3 }}>{count}</span>
                </button>
              );
            })}
          </div>

          {gestionesFiltradas.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", padding: "8px 0" }}>
              Sin gestiones para este filtro
            </div>
          )}

          {gestionesFiltradas.length > 0 && (
            <>
              <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--mute)", textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 10 }}>
                {gestionesFiltradas.length} gestión{gestionesFiltradas.length !== 1 ? "es" : ""}
              </div>
              {gestionesFiltradas.map((g, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: i < gestionesFiltradas.length - 1 ? "0.5px solid var(--border)" : "none", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{g.cliente}</span>
                    <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif" }}> · {g.gestion}</span>
                    <div style={{ fontSize: 11, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 2 }}>
                      {g.usuario} · {g.hora}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <select
                      value={g.estado}
                      onChange={e => handleEstadoGestion(g, e.target.value)}
                      style={{
                        background: "var(--lift)", border: "0.5px solid var(--border)",
                        color: ESTADO_COLORS[g.estado] || "var(--mute)",
                        padding: "3px 8px", borderRadius: 4, fontSize: 10,
                        fontFamily: "Plus Jakarta Sans, sans-serif", outline: "none",
                        fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer",
                      }}>
                      {ESTADOS_GESTION.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <button onClick={() => handleDeleteGestion(g)}
                      style={{ ...S.iconBtn, color: "#8B3A3A" }} title="Eliminar gestión">
                      <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Sección Tareas dentro de la card */}
        <div style={{ marginTop: 16, borderTop: "0.5px solid var(--border)", paddingTop: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--mute)", textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 12 }}>
            Tareas
          </div>
          {loading && <div style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>Cargando...</div>}
          {!loading && tasks.length === 0 && <div style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>Sin tareas</div>}
          {!loading && tasks.map(task => {
        const isVencida    = task.estado === "Pendiente" && task.due_date && task.due_date < today;
        const isCompletada = task.estado === "Completada";
        return (
          <div key={task.id} style={{ background: "var(--card)",
            border: `0.5px solid ${isVencida ? "#8B3A3A" : "var(--border)"}`,
            borderRadius: 8, padding: "14px 16px", opacity: isCompletada ? 0.6 : 1 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <button onClick={() => handleComplete(task)}
                style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 2,
                  border: `1.5px solid ${isCompletada ? "#27ae60" : "var(--goldDim)"}`,
                  background: isCompletada ? "#27ae60" : "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isCompletada && <span style={{ color: "#fff", fontSize: 12 }}>✓</span>}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif",
                    fontWeight: 600, textDecoration: isCompletada ? "line-through" : "none" }}>
                    {task.title}
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999,
                    background: "var(--lift)", color: PRIORITY_COLORS[task.priority] || "var(--mute)",
                    fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em" }}>
                    {task.priority}
                  </span>
                  {isVencida && <span style={{ fontSize: 10, color: "#E08080", fontFamily: "Plus Jakarta Sans, sans-serif" }}>⚠ Vencida</span>}
                </div>
                {task.description && (
                  <div style={{ fontSize: 13, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 4 }}>
                    {task.description}
                  </div>
                )}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                  {task.client_name && <span style={{ fontSize: 12, color: "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>👤 {task.client_name}</span>}
                  {task.due_date && (
                    <span style={{ fontSize: 12, color: isVencida ? "#E08080" : "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                      📅 {new Date(task.due_date + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  )}
                  {task.assigned_to && <span style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>→ {task.assigned_to}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => openEdit(task)} style={S.iconBtn} title="Editar">
                  <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={14} />
                </button>
                <button onClick={() => handleDelete(task.id)} style={{ ...S.iconBtn, color: "#8B3A3A" }} title="Eliminar">
                  <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
        </div>
      </div>

      {showForm && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={S.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 20, paddingBottom: 16, borderBottom: "0.5px solid var(--border)" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                {editId ? "Editar tarea" : "Nueva tarea"}
              </span>
              <button onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", color: "var(--mute)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={S.formLabel}>Título *</label>
                <input value={form.title} onChange={e => set("title", e.target.value)}
                  placeholder="Título de la tarea" style={S.input} />
              </div>
              <div>
                <label style={S.formLabel}>Descripción</label>
                <textarea value={form.description} onChange={e => set("description", e.target.value)}
                  rows={2} style={{ ...S.input, resize: "vertical" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.formLabel}>Prioridad</label>
                  <select value={form.priority} onChange={e => set("priority", e.target.value)} style={S.input}>
                    <option>Alta</option><option>Normal</option><option>Baja</option>
                  </select>
                </div>
                <div>
                  <label style={S.formLabel}>Fecha límite</label>
                  <input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} style={S.input} />
                </div>
              </div>
              <div>
                <label style={S.formLabel}>Cliente relacionado</label>
                <select value={form.client_id} onChange={e => {
                  const c = clients.find(x => x.id === e.target.value);
                  set("client_id", e.target.value); set("client_name", c?.name || "");
                }} style={S.input}>
                  <option value="">Sin cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={S.formLabel}>Asignar a</label>
                <select value={form.assigned_to_id} onChange={e => {
                  const u = agents.find(x => x.id === e.target.value);
                  set("assigned_to_id", e.target.value); set("assigned_to", u?.name || "");
                }} style={S.input}>
                  <option value="">Sin asignar</option>
                  {agents.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowForm(false)} style={S.btnOutline}>Cancelar</button>
                <button onClick={handleSave} disabled={saving}
                  style={{ ...S.btn, flex: 1, justifyContent: "center", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Guardando..." : editId ? "Guardar cambios" : "Crear tarea"}
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
  btn:        { display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "var(--gold)", color: "var(--bgApp)", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" },
  btnOutline: { padding: "9px 18px", background: "none", color: "var(--gold)", border: "1px solid var(--goldDim)", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" },
  iconBtn:    { background: "none", border: "none", color: "var(--mute)", cursor: "pointer", padding: 6, borderRadius: 4, display: "flex", alignItems: "center" },
  chip:       { padding: "6px 16px", borderRadius: 999, border: "0.5px solid var(--border)", background: "none", color: "var(--textSub)", cursor: "pointer", fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" },
  chipActive: { border: "0.5px solid var(--gold)", color: "var(--bgApp)", background: "var(--gold)", fontWeight: 700 },
  chipSm:     { padding: "4px 12px", borderRadius: 999, border: "0.5px solid var(--border)", background: "none", color: "var(--textSub)", cursor: "pointer", fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" },
  chipSmActive: { border: "0.5px solid var(--gold)", color: "var(--bgApp)", background: "var(--gold)", fontWeight: 700 },
  input:      { width: "100%", background: "var(--lift)", border: "0.5px solid var(--border)", color: "var(--text)", padding: "10px 14px", borderRadius: 6, fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" },
  formLabel:  { display: "block", fontSize: 9, letterSpacing: "0.2em", color: "var(--mute)", textTransform: "uppercase", marginBottom: 6, fontFamily: "Plus Jakarta Sans, sans-serif" },
  overlay:    { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal:      { background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: 28, width: "min(520px, 95vw)", maxHeight: "90vh", overflow: "auto" },
  empty:      { textAlign: "center", color: "var(--mute)", fontSize: 13, fontFamily: "Plus Jakarta Sans, sans-serif", padding: "2rem" },
  toast:      { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "var(--card)", border: "1px solid var(--goldDim)", color: "var(--gold)", padding: "11px 22px", borderRadius: 6, fontSize: 12, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: 1.5, textTransform: "uppercase", zIndex: 200 },
  eyebrow:    { fontSize: 13, letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 8, fontFamily: "Plus Jakarta Sans, sans-serif" },
  title:      { fontSize: 40, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.5px", fontFamily: "Plus Jakarta Sans, sans-serif" },
};
