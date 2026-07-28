import { DARK, LIGHT } from "../theme";

const STAGE_COLORS = {
  "Nuevo": "#7A6E58", "En seguimiento": "#C9A870",
  "Negociación": "#2A9D6A", "Emitido": "#27ae60", "Anulado": "#8B3A3A",
};

const RAMO_COLORS = ["#C9A870","#2A9D6A","#7A6E58","#27ae60","#8B3A3A","#5B8DB8","#9B6B9B","#D4845A"];

export default function Dashboard({ clients, policies, claims, onNavigate, theme }) {
  const T = theme === "dark" ? DARK : LIGHT;
  const S = getStyles(T);

  const today = new Date().toISOString().split("T")[0];

  // KPIs clientes
  const particulares = clients.filter(c => c.tipo === "Particular").length;
  const empresas = clients.filter(c => c.tipo === "Empresa").length;

  // KPIs pólizas
  const polizasActivas = policies.filter(p => p.estado_poliza === "Activa");
  const primaTotal = polizasActivas.reduce((s, p) => s + (p.prima_anual || 0), 0);

  // KPIs siniestros
  const siniestrosAbiertos = claims.filter(c => c.estado === "Abierto").length;
  const siniestrosCerrados = claims.filter(c => c.estado === "Cerrado").length;

  // Renovaciones
  const renovacionesVencidas = policies.filter(p =>
    p.fecha_renovacion && p.fecha_renovacion <= today &&
    p.estado_tramite !== "Emitido" && p.estado_tramite !== "Anulado"
  );
  const proximas30 = policies.filter(p => {
    if (!p.fecha_renovacion || p.estado_tramite === "Anulado") return false;
    const diff = Math.ceil((new Date(p.fecha_renovacion) - new Date(today)) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff <= 30;
  });
  const proximas60 = policies.filter(p => {
    if (!p.fecha_renovacion || p.estado_tramite === "Anulado") return false;
    const diff = Math.ceil((new Date(p.fecha_renovacion) - new Date(today)) / (1000 * 60 * 60 * 24));
    return diff > 30 && diff <= 60;
  });

  const getClient = (clientId) => clients.find(c => c.id === clientId);

  // Por estado trámite
  const byStage = ["Nuevo","En seguimiento","Negociación","Emitido","Anulado"].map(s => ({
    stage: s,
    count: policies.filter(p => p.estado_tramite === s).length,
    prima: policies.filter(p => p.estado_tramite === s).reduce((a, p) => a + (p.prima_anual || 0), 0),
  }));

  // Por ramo
  const byRamo = [...new Set(policies.map(p => p.ramo).filter(Boolean))].map(r => ({
    ramo: r,
    count: policies.filter(p => p.ramo === r).length,
    prima: policies.filter(p => p.ramo === r).reduce((a, p) => a + (p.prima_anual || 0), 0),
  })).sort((a, b) => b.count - a.count).slice(0, 6);

  // Por aseguradora
  const byAseguradora = [...new Set(policies.map(p => p.aseguradora).filter(Boolean))].map(a => ({
    aseguradora: a,
    count: policies.filter(p => p.aseguradora === a).length,
    prima: policies.filter(p => p.aseguradora === a).reduce((s, p) => s + (p.prima_anual || 0), 0),
  })).sort((a, b) => b.prima - a.prima).slice(0, 6);

  // Siniestros por ramo
  const sinByRamo = [...new Set(claims.map(c => c.ramo).filter(Boolean))].map(r => ({
    ramo: r,
    total: claims.filter(c => c.ramo === r).length,
    abiertos: claims.filter(c => c.ramo === r && c.estado === "Abierto").length,
  })).sort((a, b) => b.total - a.total).slice(0, 6);

  // Clientes recientes (últimos añadidos)
  const clientesRecientes = [...clients]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);

  // Top clientes por prima
  const topClientes = clients.map(c => ({
    ...c,
    prima: policies.filter(p => p.client_id === c.id && p.estado_poliza === "Activa")
                   .reduce((s, p) => s + (p.prima_anual || 0), 0),
    numPolizas: policies.filter(p => p.client_id === c.id).length,
  })).filter(c => c.prima > 0).sort((a, b) => b.prima - a.prima).slice(0, 5);

  const maxPrima = topClientes[0]?.prima || 1;
  const maxAseg = byAseguradora[0]?.prima || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 style={S.title}>Panel Principal</h1>
        
      </div>

      {/* Alerta renovaciones vencidas */}
      {renovacionesVencidas.length > 0 && (
        <div style={{ background: "#2A1A0A", border: "0.5px solid #C9A870", borderRadius: 8, padding: "14px 18px" }}>
          <div style={{ fontSize: 13, letterSpacing: "0.12em", color: "#C9A870", textTransform: "uppercase", marginBottom: 10, fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            ⚠ {renovacionesVencidas.length} renovación{renovacionesVencidas.length > 1 ? "es" : ""} vencida{renovacionesVencidas.length > 1 ? "s" : ""}
          </div>
          {renovacionesVencidas.slice(0, 3).map(p => {
            const client = getClient(p.client_id);
            return (
              <div key={p.id} onClick={() => onNavigate("activities")}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 0", borderBottom: "0.5px solid #3A3420", cursor: "pointer" }}>
                <div>
                  <span style={{ fontSize: 16, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{client?.name}</span>
                  <span style={{ fontSize: 14, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif", marginLeft: 8 }}>{p.ramo} · {p.aseguradora}</span>
                </div>
                <span style={{ fontSize: 13, color: "#C9A870", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{p.fecha_renovacion}</span>
              </div>
            );
          })}
          {renovacionesVencidas.length > 3 && (
            <div onClick={() => onNavigate("activities")}
              style={{ fontSize: 13, color: "#C9A870", cursor: "pointer", textAlign: "right", marginTop: 8, fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Ver todas →
            </div>
          )}
        </div>
      )}

      {/* KPIs fila 1 — Clientes */}
      <div>
        <div style={S.sectionLabel}>Clientes</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          {[
            { label: "Total clientes",   value: clients.length,  color: T.gold },
            { label: "Particulares",     value: particulares,    color: T.gold },
            { label: "Empresas",         value: empresas,        color: "#5B8DB8" },
          ].map(k => <KpiCard key={k.label} {...k} T={T} />)}
        </div>
      </div>

      {/* KPIs fila 2 — Pólizas */}
      <div>
        <div style={S.sectionLabel}>Pólizas</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          {[
            { label: "Total pólizas",     value: policies.length,       color: T.gold },
            { label: "Activas",           value: polizasActivas.length, color: "#27ae60" },
            { label: "Prima cartera/año", value: `${primaTotal.toLocaleString("es-ES")} €`, color: T.gold },
            { label: "Renov. 30 días",    value: proximas30.length,     color: "#C9A870" },
            { label: "Renov. 31-60 días", value: proximas60.length,     color: "#7A6E58" },
          ].map(k => <KpiCard key={k.label} {...k} T={T} />)}
        </div>
      </div>

      {/* KPIs fila 3 — Siniestros */}
      <div>
        <div style={S.sectionLabel}>Siniestros</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
          {[
            { label: "Total siniestros", value: claims.length,          color: T.gold },
            { label: "Abiertos",         value: siniestrosAbiertos,     color: "#E08080" },
            { label: "Cerrados",         value: siniestrosCerrados,     color: "#27ae60" },
          ].map(k => <KpiCard key={k.label} {...k} T={T} />)}
        </div>
      </div>

      {/* Gráficas fila 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>

        {/* Estado trámites */}
        <div style={S.card}>
          <div style={S.cardLabel}>Estado trámites</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {byStage.map(s => (
              <div key={s.stage} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 110, fontSize: 14, color: T.textSub, fontFamily: "Plus Jakarta Sans, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.stage}</div>
                <div style={{ flex: 1, background: T.lift, borderRadius: 4, height: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, width: policies.length ? `${(s.count / policies.length) * 100}%` : "0%", background: STAGE_COLORS[s.stage], transition: "width 0.4s" }} />
                </div>
                <div style={{ width: 20, fontSize: 14, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif", textAlign: "right" }}>{s.count}</div>
                <div style={{ width: 90, fontSize: 14, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif", textAlign: "right" }}>{s.prima ? `${s.prima.toLocaleString("es-ES")} €` : "—"}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Por ramo */}
        <div style={S.card}>
          <div style={S.cardLabel}>Pólizas por ramo</div>
          {byRamo.length === 0
            ? <div style={{ color: T.mute, fontSize: 12 }}>Sin datos</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {byRamo.map((r, i) => (
                  <div key={r.ramo} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 110, fontSize: 14, color: T.textSub, fontFamily: "Plus Jakarta Sans, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.ramo}</div>
                    <div style={{ flex: 1, background: T.lift, borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, width: policies.length ? `${(r.count / policies.length) * 100}%` : "0%", background: RAMO_COLORS[i % RAMO_COLORS.length], transition: "width 0.4s" }} />
                    </div>
                    <div style={{ width: 20, fontSize: 14, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif", textAlign: "right" }}>{r.count}</div>
                    <div style={{ width: 90, fontSize: 14, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif", textAlign: "right" }}>{r.prima ? `${r.prima.toLocaleString("es-ES")} €` : "—"}</div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Por aseguradora — NUEVO */}
        <div style={S.card}>
          <div style={S.cardLabel}>Prima por aseguradora</div>
          {byAseguradora.length === 0
            ? <div style={{ color: T.mute, fontSize: 12 }}>Sin datos</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {byAseguradora.map((a, i) => (
                  <div key={a.aseguradora} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 110, fontSize: 14, color: T.textSub, fontFamily: "Plus Jakarta Sans, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.aseguradora}</div>
                    <div style={{ flex: 1, background: T.lift, borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, width: `${(a.prima / maxAseg) * 100}%`, background: RAMO_COLORS[i % RAMO_COLORS.length], transition: "width 0.4s" }} />
                    </div>
                    <div style={{ width: 20, fontSize: 14, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif", textAlign: "right" }}>{a.count}</div>
                    <div style={{ width: 90, fontSize: 14, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif", textAlign: "right" }}>{a.prima ? `${a.prima.toLocaleString("es-ES")} €` : "—"}</div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Siniestros por ramo — NUEVO */}
        <div style={S.card}>
          <div style={S.cardLabel}>Siniestros por ramo</div>
          {sinByRamo.length === 0
            ? <div style={{ color: T.mute, fontSize: 12 }}>Sin siniestros</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sinByRamo.map((r, i) => (
                  <div key={r.ramo} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 110, fontSize: 14, color: T.textSub, fontFamily: "Plus Jakarta Sans, sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.ramo}</div>
                    <div style={{ flex: 1, background: T.lift, borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, width: claims.length ? `${(r.total / claims.length) * 100}%` : "0%", background: "#E08080", transition: "width 0.4s" }} />
                    </div>
                    <div style={{ width: 20, fontSize: 14, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif", textAlign: "right" }}>{r.total}</div>
                    <div style={{ width: 60, fontSize: 13, color: "#E08080", fontFamily: "Plus Jakarta Sans, sans-serif", textAlign: "right" }}>{r.abiertos} abierto{r.abiertos !== 1 ? "s" : ""}</div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Top clientes por prima — NUEVO */}
      <div style={S.card}>
        <div style={S.cardLabel}>Top clientes por prima activa</div>
        {topClientes.length === 0
          ? <div style={{ color: T.mute, fontSize: 13, textAlign: "center", padding: "2rem" }}>Sin datos</div>
          : topClientes.map(c => (
              <div key={c.id} onClick={() => onNavigate("client_detail", c.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `0.5px solid ${T.border}`, cursor: "pointer" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 2 }}>{c.numPolizas} póliza{c.numPolizas !== 1 ? "s" : ""} · {c.tipo}</div>
                  <div style={{ marginTop: 6, background: T.lift, borderRadius: 4, height: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 4, width: `${(c.prima / maxPrima) * 100}%`, background: T.gold, transition: "width 0.4s" }} />
                  </div>
                </div>
                <div style={{ fontSize: 15, color: T.gold, fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {c.prima.toLocaleString("es-ES")} €/año
                </div>
              </div>
            ))
        }
      </div>

      {/* Clientes recientes — MEJORADO */}
      <div style={S.card}>
        <div style={S.cardLabel}>Clientes recientes</div>
        {clientesRecientes.length === 0
          ? <div style={{ color: T.mute, fontSize: 13, textAlign: "center", padding: "2rem" }}>Sin clientes</div>
          : clientesRecientes.map(c => {
              const cPolicies = policies.filter(p => p.client_id === c.id);
              const cPrima = cPolicies.filter(p => p.estado_poliza === "Activa").reduce((s, p) => s + (p.prima_anual || 0), 0);
              return (
                <div key={c.id} onClick={() => onNavigate("client_detail", c.id)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 0", borderBottom: `0.5px solid ${T.border}`, cursor: "pointer", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 16, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 13, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 2 }}>
                      {c.tipo} · {cPolicies.length} póliza{cPolicies.length !== 1 ? "s" : ""}
                      {c.created_at ? ` · ${new Date(c.created_at).toLocaleDateString("es-ES")}` : ""}
                    </div>
                  </div>
                  {cPrima > 0 && (
                    <span style={{ fontSize: 14, color: T.gold, fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 600 }}>
                      {cPrima.toLocaleString("es-ES")} €/año
                    </span>
                  )}
                </div>
              );
            })
        }
      </div>
    </div>
  );
}

function KpiCard({ label, value, color, T }) {
  return (
    <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "16px 18px" }}>
      <div style={{ fontSize: 12, letterSpacing: "0.12em", color: T.mute, textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{value}</div>
    </div>
  );
}

function getStyles(T) {
  return {
    eyebrow:     { fontSize: 13, letterSpacing: "0.2em", color: T.gold, textTransform: "uppercase", marginBottom: 8, fontFamily: "Plus Jakarta Sans, sans-serif" },
    title:       { fontSize: 40, fontWeight: 700, color: T.text, margin: 0, letterSpacing: "-0.5px", fontFamily: "Plus Jakarta Sans, sans-serif" },
    sectionLabel:{ fontSize: 12, letterSpacing: "0.15em", color: T.mute, textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 10 },
    card:        { background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: 20 },
    cardLabel:   { fontSize: 13, letterSpacing: "0.12em", color: T.mute, textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 16 },
  };
}