import { useState } from "react";
import { api } from "../api";

const emptyTesisPolicy = {
  ramo: "", aseguradora: "", num_poliza: "", prima_anual: 0,
  fecha_efecto: "", fecha_vencimiento: "", estado: "Baja", notas: "",
};

const emptyTesisClaim = {
  ramo: "", aseguradora: "", num_expediente: "", fecha_siniestro: "",
  descripcion: "", resolucion: "", importe: 0, estado: "Cerrado",
};

const RAMOS = ["Hogar", "Auto", "Vida", "Salud", "Empresa", "Responsabilidad Civil", "Decesos", "Viaje", "Otros"];
const ASEGURADORAS = ["Mapfre", "Allianz", "AXA", "Generali", "Zurich", "Mutua Madrileña", "Santalucía", "Caser", "Reale", "Helvetia", "Avant2", "Otras"];
const STAGES = ["Nuevo", "En seguimiento", "Negociación", "Emitido", "Anulado"];
const STAGE_COLORS = {
  "Nuevo": "#7A6E58", "En seguimiento": "#C9A870",
  "Negociación": "#2A9D6A", "Emitido": "#27ae60", "Anulado": "#8B3A3A",
};

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const emptyPolicy = {
  ramo: "Hogar", aseguradora: "", num_poliza: "",
  prima_anual: 0, fecha_efecto: "", fecha_renovacion: "",
  estado_tramite: "Nuevo", estado_poliza: "Activa", notas: "",
};

const emptyClaim = {
  ramo: "", aseguradora: "", num_expediente: "",
  fecha_siniestro: "", descripcion: "",
  estado: "Abierto", resolucion: "", notas: "",
};

export default function ClientDetail({ client, policies, claims, onRefresh, currentUser, onBack }) {
  const [tab, setTab]               = useState("polizas");
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [showClaimForm, setShowClaimForm]   = useState(false);
  const [policyForm, setPolicyForm] = useState(emptyPolicy);
  const [claimForm, setClaimForm]   = useState(emptyClaim);
  const [editPolicyId, setEditPolicyId] = useState(null);
  const [editClaimId, setEditClaimId]   = useState(null);
  const [newNote, setNewNote]       = useState("");
  const [showTesisPolicyForm, setShowTesisPolicyForm] = useState(false);
  const [showTesisClaimForm, setShowTesisClaimForm]   = useState(false);
  const [tesisPolicyForm, setTesisPolicyForm] = useState(emptyTesisPolicy);
  const [tesisClaimForm, setTesisClaimForm]   = useState(emptyTesisClaim);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const setP = (k, v) => setPolicyForm(d => ({ ...d, [k]: v }));
  const setC = (k, v) => setClaimForm(d => ({ ...d, [k]: v }));

  const today = new Date().toISOString().split("T")[0];

  // Venta cruzada — ramos que no tiene
  const ramosActivos = [...new Set(policies.filter(p => p.estado_poliza === "Activa").map(p => p.ramo))];
  const ramosFaltantes = RAMOS.filter(r => !ramosActivos.includes(r));

  // Pólizas
  const handleSavePolicy = async () => {
    if (!policyForm.aseguradora) return showToast("La aseguradora es obligatoria");
    setSaving(true);
    try {
      if (editPolicyId) await api.updatePolicy(editPolicyId, { ...policyForm, client_id: client.id });
      else              await api.createPolicy({ ...policyForm, client_id: client.id });
      await onRefresh();
      setShowPolicyForm(false); setEditPolicyId(null); setPolicyForm(emptyPolicy);
      showToast(editPolicyId ? "Póliza actualizada ✓" : "Póliza añadida ✓");
    } catch (e) { showToast(e.message || "Error"); }
    setSaving(false);
  };

  const handleDeletePolicy = async (id) => {
    if (!window.confirm("¿Eliminar esta póliza?")) return;
    try { await api.deletePolicy(id); await onRefresh(); showToast("Póliza eliminada"); }
    catch (e) { showToast(e.message || "Error"); }
  };

  // Siniestros
  const handleSaveClaim = async () => {
    if (!claimForm.descripcion) return showToast("La descripción es obligatoria");
    setSaving(true);
    try {
      if (editClaimId) await api.updateClaim(editClaimId, { ...claimForm, client_id: client.id });
      else             await api.createClaim({ ...claimForm, client_id: client.id });
      await onRefresh();
      setShowClaimForm(false); setEditClaimId(null); setClaimForm(emptyClaim);
      showToast(editClaimId ? "Siniestro actualizado ✓" : "Siniestro registrado ✓");
    } catch (e) { showToast(e.message || "Error"); }
    setSaving(false);
  };

  const handleDeleteClaim = async (id) => {
    if (!window.confirm("¿Eliminar este siniestro?")) return;
    try { await api.deleteClaim(id); await onRefresh(); showToast("Siniestro eliminado"); }
    catch (e) { showToast(e.message || "Error"); }
  };

  // Notas
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await api.addActivity(client.id, newNote.trim());
      await onRefresh();
      setNewNote("");
      showToast("Nota añadida ✓");
    } catch (e) { showToast(e.message || "Error"); }
  };

  const handleSaveTesisPolicy = async () => {
    if (!tesisPolicyForm.ramo) return showToast("El ramo es obligatorio");
    setSaving(true);
    try {
      await api.addTesisPolicy(client.id, tesisPolicyForm);
      await onRefresh();
      setShowTesisPolicyForm(false);
      setTesisPolicyForm(emptyTesisPolicy);
      showToast("Póliza histórica añadida ✓");
    } catch (e) { showToast(e.message || "Error"); }
    setSaving(false);
  };

  const handleDeleteTesisPolicy = async (id) => {
    try { await api.deleteTesisPolicy(client.id, id); await onRefresh(); showToast("Eliminada"); }
    catch (e) { showToast(e.message || "Error"); }
  };

  const handleSaveTesisClaim = async () => {
    if (!tesisClaimForm.descripcion) return showToast("La descripción es obligatoria");
    setSaving(true);
    try {
      await api.addTesisClaim(client.id, tesisClaimForm);
      await onRefresh();
      setShowTesisClaimForm(false);
      setTesisClaimForm(emptyTesisClaim);
      showToast("Siniestro histórico añadido ✓");
    } catch (e) { showToast(e.message || "Error"); }
    setSaving(false);
  };

  const handleDeleteTesisClaim = async (id) => {
    try { await api.deleteTesisClaim(client.id, id); await onRefresh(); showToast("Eliminado"); }
    catch (e) { showToast(e.message || "Error"); }
  };

  const prima_total = policies.filter(p => p.estado_poliza === "Activa").reduce((s, p) => s + (p.prima_anual || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {toast && <div style={S.toast}>{toast}</div>}

      {/* Volver */}
      <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--goldDim)",
        cursor: "pointer", fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 11, letterSpacing: "0.12em",
        textTransform: "uppercase", padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
        ← Volver a clientes
      </button>

      {/* Cabecera cliente */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--lift)",
            border: "2px solid var(--goldDim)", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 20, fontWeight: 700, color: "var(--gold)", flexShrink: 0 }}>
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
              {client.name}
            </div>
            {client.empresa && (
              <div style={{ fontSize: 13, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 2 }}>{client.empresa}</div>
            )}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
              {client.email && <span style={S.meta}>✉ {client.email}</span>}
              {client.phone && <span style={S.meta}>📞 {client.phone}</span>}
              {client.dni   && <span style={S.meta}>🪪 {client.dni}</span>}
              {client.address && <span style={S.meta}>📍 {client.address}</span>}
            </div>
          </div>
          {/* KPIs rápidos */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{policies.length}</div>
              <div style={{ fontSize: 9, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>pólizas</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#27ae60", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{claims.length}</div>
              <div style={{ fontSize: 9, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>siniestros</div>
            </div>
            {prima_total > 0 && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{prima_total.toLocaleString("es-ES")} €</div>
                <div style={{ fontSize: 9, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>prima/año</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Venta cruzada */}
      {ramosFaltantes.length > 0 && (
        <div style={{ background: "var(--card)", border: "0.5px solid var(--goldDim)", borderRadius: 8, padding: "14px 18px" }}>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--gold)", textTransform: "uppercase",
            fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 10 }}>💡 Oportunidades de venta cruzada</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ramosFaltantes.map(r => (
              <span key={r} onClick={() => { setP("ramo", r); setShowPolicyForm(true); }}
                style={{ padding: "4px 12px", borderRadius: 999, background: "var(--lift)",
                  border: "0.5px solid var(--goldDim)", color: "var(--gold)",
                  fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 10, cursor: "pointer",
                  letterSpacing: "0.08em", textTransform: "uppercase" }}>
                + {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[
          { id: "polizas",   label: `Pólizas (${policies.length})` },
          { id: "siniestros",label: `Siniestros (${claims.length})` },
          { id: "historial", label: `Historial (${(client.activities || []).length})` },
          { id: "tesis",     label: `Tesis (${(client.tesis_policies || []).length + (client.tesis_claims || []).length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ ...S.chip, ...(tab === t.id ? S.chipActive : {}) }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Pólizas */}
      {tab === "polizas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => { setShowPolicyForm(true); setEditPolicyId(null); setPolicyForm(emptyPolicy); }} style={S.btn}>
              + Nueva póliza
            </button>
          </div>
          {policies.length === 0 && <div style={S.empty}>Sin pólizas registradas</div>}
          {policies.map(p => (
            <div key={p.id} style={{ background: "var(--card)", border: "0.5px solid var(--border)",
              borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{p.ramo}</span>
                    <span style={{ fontSize: 15, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{p.aseguradora}</span>
                    {p.num_poliza && <span style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>Nº {p.num_poliza}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                    {p.prima_anual > 0 && <span style={S.meta}>{p.prima_anual.toLocaleString("es-ES")} €/año</span>}
                    {p.fecha_efecto && <span style={S.meta}>Efecto: {p.fecha_efecto}</span>}
                    {p.fecha_renovacion && (
                      <span style={{ ...S.meta, color: p.fecha_renovacion <= today ? "#E08080" : "var(--mute)" }}>
                        Renovación: {p.fecha_renovacion} {p.fecha_renovacion <= today ? "⚠️" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999,
                    background: "var(--lift)", color: STAGE_COLORS[p.estado_tramite] || "var(--mute)",
                    fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em" }}>{p.estado_tramite}</span>
                  {p.estado_poliza && (
                    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999,
                      background: p.estado_poliza === "Activa" ? "#0A1A0A" : "#1A0A0A",
                      color: p.estado_poliza === "Activa" ? "#27ae60" : "#8B3A3A",
                      fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em" }}>{p.estado_poliza}</span>
                  )}
                  <button onClick={() => { setEditPolicyId(p.id); setPolicyForm({ ...emptyPolicy, ...p }); setShowPolicyForm(true); }}
                    style={S.iconBtn} title="Editar">
                    <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={14} />
                  </button>
                  <button onClick={() => handleDeletePolicy(p.id)} style={{ ...S.iconBtn, color: "#8B3A3A" }} title="Eliminar">
                    <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={14} />
                  </button>
                </div>
              </div>
              {p.notas && <div style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 8 }}>{p.notas}</div>}
            </div>
          ))}
        </div>
      )}

      {/* TAB: Siniestros */}
      {tab === "siniestros" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => { setShowClaimForm(true); setEditClaimId(null); setClaimForm(emptyClaim); }} style={S.btn}>
              + Nuevo siniestro
            </button>
          </div>
          {claims.length === 0 && <div style={S.empty}>Sin siniestros registrados</div>}
          {claims.map(c => (
            <div key={c.id} style={{ background: "var(--card)", border: `0.5px solid ${c.estado === "Abierto" ? "#8B3A3A" : "var(--border)"}`, borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.descripcion}</div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                    {c.ramo && <span style={S.meta}>{c.ramo}</span>}
                    {c.aseguradora && <span style={S.meta}>{c.aseguradora}</span>}
                    {c.num_expediente && <span style={S.meta}>Exp: {c.num_expediente}</span>}
                    {c.fecha_siniestro && <span style={S.meta}>{c.fecha_siniestro}</span>}
                  </div>
                  {c.resolucion && <div style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 6 }}>Resolución: {c.resolucion}</div>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999,
                    background: c.estado === "Abierto" ? "#1A0A0A" : c.estado === "En gestión" ? "#1A1508" : "var(--lift)",
                    color: c.estado === "Abierto" ? "#E08080" : c.estado === "En gestión" ? "#C9A870" : "#27ae60",
                    fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em" }}>{c.estado}</span>
                  <button onClick={() => { setEditClaimId(c.id); setClaimForm({ ...emptyClaim, ...c }); setShowClaimForm(true); }}
                    style={S.iconBtn} title="Editar">
                    <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={14} />
                  </button>
                  <button onClick={() => handleDeleteClaim(c.id)} style={{ ...S.iconBtn, color: "#8B3A3A" }} title="Eliminar">
                    <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Historial */}
      {tab === "historial" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newNote} onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddNote()}
              placeholder="Registrar gestión o nota..."
              style={{ ...S.input, flex: 1 }} />
            <button onClick={handleAddNote} style={S.btn}>Añadir</button>
          </div>
          {(client.activities || []).length === 0 && <div style={S.empty}>Sin historial</div>}
          {[...(client.activities || [])].reverse().map((a, i) => (
            <div key={a.id || i} style={{ background: "var(--card)", border: "0.5px solid var(--border)",
              borderRadius: 8, padding: "12px 16px", display: "flex", gap: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)",
                flexShrink: 0, marginTop: 6 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{a.note}</div>
                <div style={{ fontSize: 10, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 4 }}>
                  {a.user} · {new Date(a.date).toLocaleDateString("es-ES")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Historial Tesis */}
      {tab === "tesis" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "var(--lift)", border: "0.5px solid var(--goldDim)", borderRadius: 8, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <div style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", lineHeight: 1.6 }}>
              Registra aquí el historial previo de este cliente en Tesis. Estos datos son solo de referencia y no afectan al pipeline ni a las renovaciones activas.
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--gold)", textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                Pólizas históricas ({(client.tesis_policies || []).length})
              </div>
              <button onClick={() => { setTesisPolicyForm(emptyTesisPolicy); setShowTesisPolicyForm(true); }} style={S.btn}>+ Añadir póliza</button>
            </div>
            {(client.tesis_policies || []).length === 0
              ? <div style={S.empty}>Sin pólizas históricas registradas</div>
              : (client.tesis_policies || []).map((p, i) => (
                <div key={p.id || i} style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "12px 16px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase" }}>{p.ramo}</span>
                        <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{p.aseguradora}</span>
                        {p.num_poliza && <span style={{ fontSize: 11, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>Nº {p.num_poliza}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                        {p.prima_anual > 0 && <span style={S.meta}>{p.prima_anual.toLocaleString("es-ES")} €/año</span>}
                        {p.fecha_efecto && <span style={S.meta}>Efecto: {p.fecha_efecto}</span>}
                        {p.fecha_vencimiento && <span style={S.meta}>Vencimiento: {p.fecha_vencimiento}</span>}
                        {p.estado && <span style={{ ...S.meta, color: p.estado === "Activa" ? "#27ae60" : "var(--mute)" }}>{p.estado}</span>}
                      </div>
                      {p.notas && <div style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 6 }}>{p.notas}</div>}
                    </div>
                    <button onClick={() => handleDeleteTesisPolicy(p.id)} style={{ ...S.iconBtn, color: "#8B3A3A" }}>
                      <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={14} />
                    </button>
                  </div>
                </div>
              ))
            }
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--gold)", textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                Siniestros históricos ({(client.tesis_claims || []).length})
              </div>
              <button onClick={() => { setTesisClaimForm(emptyTesisClaim); setShowTesisClaimForm(true); }} style={S.btn}>+ Añadir siniestro</button>
            </div>
            {(client.tesis_claims || []).length === 0
              ? <div style={S.empty}>Sin siniestros históricos registrados</div>
              : (client.tesis_claims || []).map((c, i) => (
                <div key={c.id || i} style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "12px 16px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.descripcion}</div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                        {c.ramo && <span style={S.meta}>{c.ramo}</span>}
                        {c.aseguradora && <span style={S.meta}>{c.aseguradora}</span>}
                        {c.num_expediente && <span style={S.meta}>Exp: {c.num_expediente}</span>}
                        {c.fecha_siniestro && <span style={S.meta}>{c.fecha_siniestro}</span>}
                        {c.importe > 0 && <span style={{ ...S.meta, color: "var(--gold)" }}>Indemnización: {c.importe.toLocaleString("es-ES")} €</span>}
                      </div>
                      {c.resolucion && <div style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 6 }}>Resolución: {c.resolucion}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999, background: "var(--lift)", color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{c.estado}</span>
                      <button onClick={() => handleDeleteTesisClaim(c.id)} style={{ ...S.iconBtn, color: "#8B3A3A" }}>
                        <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Modal Póliza */}
      {showPolicyForm && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowPolicyForm(false)}>
          <div style={S.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 20, paddingBottom: 16, borderBottom: "0.5px solid var(--border)" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                {editPolicyId ? "Editar póliza" : "Nueva póliza"}
              </span>
              <button onClick={() => setShowPolicyForm(false)}
                style={{ background: "none", border: "none", color: "var(--mute)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.formLabel}>Ramo</label>
                  <select value={policyForm.ramo} onChange={e => setP("ramo", e.target.value)} style={S.input}>
                    {RAMOS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.formLabel}>Aseguradora *</label>
                  <select value={policyForm.aseguradora} onChange={e => setP("aseguradora", e.target.value)} style={S.input}>
                    <option value="">Seleccionar...</option>
                    {ASEGURADORAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={S.formLabel}>Nº de póliza</label>
                <input value={policyForm.num_poliza} onChange={e => setP("num_poliza", e.target.value)}
                  placeholder="Número de póliza" style={S.input} />
              </div>
              <div>
                <label style={S.formLabel}>Prima anual (€)</label>
                <input type="number" value={policyForm.prima_anual} onChange={e => setP("prima_anual", +e.target.value)} style={S.input} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.formLabel}>Fecha efecto</label>
                  <input type="date" value={policyForm.fecha_efecto || ""} onChange={e => setP("fecha_efecto", e.target.value)} style={S.input} />
                </div>
                <div>
                  <label style={S.formLabel}>Fecha renovación</label>
                  <input type="date" value={policyForm.fecha_renovacion || ""} onChange={e => setP("fecha_renovacion", e.target.value)} style={S.input} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.formLabel}>Estado trámite</label>
                  <select value={policyForm.estado_tramite} onChange={e => setP("estado_tramite", e.target.value)} style={S.input}>
                    {STAGES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.formLabel}>Estado póliza</label>
                  <select value={policyForm.estado_poliza} onChange={e => setP("estado_poliza", e.target.value)} style={S.input}>
                    <option value="">—</option>
                    <option>Activa</option>
                    <option>Baja</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={S.formLabel}>Notas</label>
                <textarea value={policyForm.notas} onChange={e => setP("notas", e.target.value)}
                  rows={2} style={{ ...S.input, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowPolicyForm(false)} style={S.btnOutline}>Cancelar</button>
                <button onClick={handleSavePolicy} disabled={saving}
                  style={{ ...S.btn, flex: 1, justifyContent: "center", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Guardando..." : editPolicyId ? "Guardar cambios" : "Añadir póliza"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Siniestro */}
      {showClaimForm && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowClaimForm(false)}>
          <div style={S.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 20, paddingBottom: 16, borderBottom: "0.5px solid var(--border)" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                {editClaimId ? "Editar siniestro" : "Nuevo siniestro"}
              </span>
              <button onClick={() => setShowClaimForm(false)}
                style={{ background: "none", border: "none", color: "var(--mute)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.formLabel}>Ramo</label>
                  <select value={claimForm.ramo} onChange={e => setC("ramo", e.target.value)} style={S.input}>
                    <option value="">Seleccionar...</option>
                    {RAMOS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.formLabel}>Aseguradora</label>
                  <select value={claimForm.aseguradora} onChange={e => setC("aseguradora", e.target.value)} style={S.input}>
                    <option value="">Seleccionar...</option>
                    {ASEGURADORAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.formLabel}>Nº expediente</label>
                  <input value={claimForm.num_expediente} onChange={e => setC("num_expediente", e.target.value)}
                    placeholder="Nº expediente" style={S.input} />
                </div>
                <div>
                  <label style={S.formLabel}>Fecha siniestro</label>
                  <input type="date" value={claimForm.fecha_siniestro || ""} onChange={e => setC("fecha_siniestro", e.target.value)} style={S.input} />
                </div>
              </div>
              <div>
                <label style={S.formLabel}>Descripción *</label>
                <textarea value={claimForm.descripcion} onChange={e => setC("descripcion", e.target.value)}
                  rows={3} placeholder="Describe el siniestro..." style={{ ...S.input, resize: "vertical" }} />
              </div>
              <div>
                <label style={S.formLabel}>Estado</label>
                <select value={claimForm.estado} onChange={e => setC("estado", e.target.value)} style={S.input}>
                  <option>Abierto</option>
                  <option>En gestión</option>
                  <option>Cerrado</option>
                </select>
              </div>
              <div>
                <label style={S.formLabel}>Resolución</label>
                <input value={claimForm.resolucion} onChange={e => setC("resolucion", e.target.value)}
                  placeholder="Resolución del siniestro" style={S.input} />
              </div>
              <div>
                <label style={S.formLabel}>Notas</label>
                <textarea value={claimForm.notas} onChange={e => setC("notas", e.target.value)}
                  rows={2} style={{ ...S.input, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowClaimForm(false)} style={S.btnOutline}>Cancelar</button>
                <button onClick={handleSaveClaim} disabled={saving}
                  style={{ ...S.btn, flex: 1, justifyContent: "center", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Guardando..." : editClaimId ? "Guardar cambios" : "Registrar siniestro"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tesis Póliza */}
      {showTesisPolicyForm && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowTesisPolicyForm(false)}>
          <div style={S.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "0.5px solid var(--border)" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>Póliza histórica (Tesis)</span>
              <button onClick={() => setShowTesisPolicyForm(false)} style={{ background: "none", border: "none", color: "var(--mute)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.formLabel}>Ramo *</label>
                  <select value={tesisPolicyForm.ramo} onChange={e => setTesisPolicyForm(d => ({...d, ramo: e.target.value}))} style={S.input}>
                    <option value="">Seleccionar...</option>
                    {RAMOS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.formLabel}>Aseguradora</label>
                  <select value={tesisPolicyForm.aseguradora} onChange={e => setTesisPolicyForm(d => ({...d, aseguradora: e.target.value}))} style={S.input}>
                    <option value="">Seleccionar...</option>
                    {ASEGURADORAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={S.formLabel}>Nº de póliza</label>
                <input value={tesisPolicyForm.num_poliza} onChange={e => setTesisPolicyForm(d => ({...d, num_poliza: e.target.value}))} placeholder="Número de póliza" style={S.input} />
              </div>
              <div>
                <label style={S.formLabel}>Prima anual (€)</label>
                <input type="number" value={tesisPolicyForm.prima_anual} onChange={e => setTesisPolicyForm(d => ({...d, prima_anual: +e.target.value}))} style={S.input} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.formLabel}>Fecha efecto</label>
                  <input type="date" value={tesisPolicyForm.fecha_efecto} onChange={e => setTesisPolicyForm(d => ({...d, fecha_efecto: e.target.value}))} style={S.input} />
                </div>
                <div>
                  <label style={S.formLabel}>Fecha vencimiento</label>
                  <input type="date" value={tesisPolicyForm.fecha_vencimiento} onChange={e => setTesisPolicyForm(d => ({...d, fecha_vencimiento: e.target.value}))} style={S.input} />
                </div>
              </div>
              <div>
                <label style={S.formLabel}>Estado</label>
                <select value={tesisPolicyForm.estado} onChange={e => setTesisPolicyForm(d => ({...d, estado: e.target.value}))} style={S.input}>
                  <option>Activa</option>
                  <option>Baja</option>
                  <option>Anulada</option>
                </select>
              </div>
              <div>
                <label style={S.formLabel}>Notas</label>
                <textarea value={tesisPolicyForm.notas} onChange={e => setTesisPolicyForm(d => ({...d, notas: e.target.value}))} rows={2} style={{ ...S.input, resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowTesisPolicyForm(false)} style={S.btnOutline}>Cancelar</button>
                <button onClick={handleSaveTesisPolicy} disabled={saving} style={{ ...S.btn, flex: 1, justifyContent: "center", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Guardando..." : "Añadir póliza histórica"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tesis Siniestro */}
      {showTesisClaimForm && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowTesisClaimForm(false)}>
          <div style={S.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottom: "0.5px solid var(--border)" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>Siniestro histórico (Tesis)</span>
              <button onClick={() => setShowTesisClaimForm(false)} style={{ background: "none", border: "none", color: "var(--mute)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.formLabel}>Ramo</label>
                  <select value={tesisClaimForm.ramo} onChange={e => setTesisClaimForm(d => ({...d, ramo: e.target.value}))} style={S.input}>
                    <option value="">Seleccionar...</option>
                    {RAMOS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.formLabel}>Aseguradora</label>
                  <select value={tesisClaimForm.aseguradora} onChange={e => setTesisClaimForm(d => ({...d, aseguradora: e.target.value}))} style={S.input}>
                    <option value="">Seleccionar...</option>
                    {ASEGURADORAS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={S.formLabel}>Nº expediente</label>
                  <input value={tesisClaimForm.num_expediente} onChange={e => setTesisClaimForm(d => ({...d, num_expediente: e.target.value}))} placeholder="Nº expediente Tesis" style={S.input} />
                </div>
                <div>
                  <label style={S.formLabel}>Fecha siniestro</label>
                  <input type="date" value={tesisClaimForm.fecha_siniestro} onChange={e => setTesisClaimForm(d => ({...d, fecha_siniestro: e.target.value}))} style={S.input} />
                </div>
              </div>
              <div>
                <label style={S.formLabel}>Descripción *</label>
                <textarea value={tesisClaimForm.descripcion} onChange={e => setTesisClaimForm(d => ({...d, descripcion: e.target.value}))} rows={3} placeholder="Describe el siniestro..." style={{ ...S.input, resize: "vertical" }} />
              </div>
              <div>
                <label style={S.formLabel}>Resolución</label>
                <input value={tesisClaimForm.resolucion} onChange={e => setTesisClaimForm(d => ({...d, resolucion: e.target.value}))} placeholder="Resolución del siniestro" style={S.input} />
              </div>
              <div>
                <label style={S.formLabel}>Importe indemnización (€)</label>
                <input type="number" value={tesisClaimForm.importe} onChange={e => setTesisClaimForm(d => ({...d, importe: +e.target.value}))} style={S.input} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setShowTesisClaimForm(false)} style={S.btnOutline}>Cancelar</button>
                <button onClick={handleSaveTesisClaim} disabled={saving} style={{ ...S.btn, flex: 1, justifyContent: "center", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Guardando..." : "Añadir siniestro histórico"}
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
  input:      { width: "100%", background: "var(--lift)", border: "0.5px solid var(--border)", color: "var(--text)", padding: "10px 14px", borderRadius: 6, fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, outline: "none", boxSizing: "border-box" },
  formLabel:  { display: "block", fontSize: 9, letterSpacing: "0.2em", color: "var(--mute)", textTransform: "uppercase", marginBottom: 6, fontFamily: "Plus Jakarta Sans, sans-serif" },
  meta:       { fontSize: 12, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif" },
  overlay:    { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal:      { background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: 28, width: "min(520px, 95vw)", maxHeight: "90vh", overflow: "auto" },
  empty:      { textAlign: "center", color: "var(--mute)", fontSize: 13, fontFamily: "Plus Jakarta Sans, sans-serif", padding: "2rem", letterSpacing: "0.08em" },
  toast:      { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "var(--card)", border: "1px solid var(--goldDim)", color: "var(--gold)", padding: "11px 22px", borderRadius: 6, fontSize: 12, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: 1.5, textTransform: "uppercase", zIndex: 200 },
};
