const STAGE_COLORS = {
  "Nuevo": "#7A6E58", "En seguimiento": "#C9A870",
  "Negociación": "#2A9D6A", "Emitido": "#27ae60", "Anulado": "#8B3A3A",
};

export default function Dashboard({ clients, policies, claims, onNavigate }) {
  const today = new Date().toISOString().split("T")[0];

  const polizasActivas  = policies.filter(p => p.estado_poliza === "Activa");
  const primaTotal      = polizasActivas.reduce((s, p) => s + (p.prima_anual || 0), 0);
  const siniestrosAbiertos = claims.filter(c => c.estado === "Abierto").length;

  const renovacionesVencidas = policies.filter(p =>
    p.fecha_renovacion && p.fecha_renovacion <= today &&
    p.estado_tramite !== "Emitido" && p.estado_tramite !== "Anulado"
  );

  const proximas30 = policies.filter(p => {
    if (!p.fecha_renovacion || p.estado_tramite === "Anulado") return false;
    const diff = Math.ceil((new Date(p.fecha_renovacion) - new Date(today)) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff <= 30;
  });

  const getClient = (clientId) => clients.find(c => c.id === clientId);

  const byStage = ["Nuevo","En seguimiento","Negociación","Emitido","Anulado"].map(s => ({
    stage: s,
    count: policies.filter(p => p.estado_tramite === s).length,
    prima: policies.filter(p => p.estado_tramite === s).reduce((a, p) => a + (p.prima_anual || 0), 0),
  }));

  const byRamo = [...new Set(policies.map(p => p.ramo).filter(Boolean))].map(r => ({
    ramo: r,
    count: policies.filter(p => p.ramo === r).length,
    prima: policies.filter(p => p.ramo === r).reduce((a, p) => a + (p.prima_anual || 0), 0),
  })).sort((a, b) => b.count - a.count).slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={S.eyebrow}>Panel Principal</div>
        <h1 style={S.title}>Panel Principal</h1>
      </div>

      {/* Alertas renovaciones vencidas */}
      {renovacionesVencidas.length > 0 && (
        <div style={{ background: "#2A1A0A", border: "0.5px solid #C9A870", borderRadius: 8, padding: "14px 18px" }}>
          <div style={{ fontSize: 13, letterSpacing: "0.12em", color: "#C9A870", textTransform: "uppercase",
            marginBottom: 10, fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            ⚠ {renovacionesVencidas.length} renovación{renovacionesVencidas.length > 1 ? "es" : ""} vencida{renovacionesVencidas.length > 1 ? "s" : ""}
          </div>
          {renovacionesVencidas.slice(0, 3).map(p => {
            const client = getClient(p.client_id);
            return (
              <div key={p.id} onClick={() => onNavigate("activities")}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 0", borderBottom: "0.5px solid #3A3420", cursor: "pointer" }}>
                <div>
                  <span style={{ fontSize: 16, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{client?.name}</span>
                  <span style={{ fontSize: 14, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", marginLeft: 8 }}>{p.ramo} · {p.aseguradora}</span>
                </div>
                <span style={{ fontSize: 13, color: "#C9A870", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{p.fecha_renovacion}</span>
              </div>
            );
          })}
          {renovacionesVencidas.length > 3 && (
            <div onClick={() => onNavigate("activities")}
              style={{ fontSize: 13, color: "#C9A870", fontFamily: "Plus Jakarta Sans, sans-serif",
                marginTop: 8, cursor: "pointer", textAlign: "right" }}>
              Ver todas →
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
        {[
          { label: "Clientes",          value: clients.length,         color: "var(--gold)" },
          { label: "Pólizas activas",   value: polizasActivas.length,  color: "#27ae60" },
          { label: "Prima cartera/año", value: `${primaTotal.toLocaleString("es-ES")} €`, color: "var(--gold)" },
          { label: "Siniestros abiertos", value: siniestrosAbiertos,   color: "#E08080" },
          { label: "Renov. próx. 30d",  value: proximas30.length,      color: "#C9A870" },
          { label: "Total pólizas",     value: policies.length,        color: "var(--gold)" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "16px 18px" }}>
            <div style={{ fontSize: 13, letterSpacing: "0.12em", color: "var(--mute)",
              textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {/* Pipeline */}
        <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 13, letterSpacing: "0.12em", color: "var(--mute)",
            textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 16 }}>Estado trámites</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {byStage.map(s => (
              <div key={s.stage} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 110, fontSize: 14, color: "var(--textSub)", fontFamily: "Plus Jakarta Sans, sans-serif",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.stage}</div>
                <div style={{ flex: 1, background: "var(--lift)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4,
                    width: policies.length ? `${(s.count / policies.length) * 100}%` : "0%",
                    background: STAGE_COLORS[s.stage], transition: "width 0.4s" }} />
                </div>
                <div style={{ width: 20, fontSize: 14, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif", textAlign: "right" }}>{s.count}</div>
                <div style={{ width: 90, fontSize: 14, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", textAlign: "right" }}>
                  {s.prima ? `${s.prima.toLocaleString("es-ES")} €` : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Por ramo */}
        <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 13, letterSpacing: "0.12em", color: "var(--mute)",
            textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 16 }}>Por ramo</div>
          {byRamo.length === 0
            ? <div style={{ color: "var(--mute)", fontSize: 12 }}>Sin datos</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {byRamo.map(r => (
                  <div key={r.ramo} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 110, fontSize: 14, color: "var(--textSub)", fontFamily: "Plus Jakarta Sans, sans-serif",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.ramo}</div>
                    <div style={{ flex: 1, background: "var(--lift)", borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4,
                        width: policies.length ? `${(r.count / policies.length) * 100}%` : "0%",
                        background: "var(--gold)", transition: "width 0.4s" }} />
                    </div>
                    <div style={{ width: 20, fontSize: 14, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif", textAlign: "right" }}>{r.count}</div>
                    <div style={{ width: 90, fontSize: 14, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", textAlign: "right" }}>
                      {r.prima ? `${r.prima.toLocaleString("es-ES")} €` : "—"}
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Clientes recientes */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: 20 }}>
        <div style={{ fontSize: 13, letterSpacing: "0.12em", color: "var(--mute)",
          textTransform: "uppercase", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 16 }}>Clientes recientes</div>
        {clients.length === 0
          ? <div style={{ color: "var(--mute)", fontSize: 13, textAlign: "center", padding: "2rem" }}>Sin clientes</div>
          : [...clients].slice(0, 5).map(c => {
              const cPolicies = policies.filter(p => p.client_id === c.id);
              const cPrima    = cPolicies.filter(p => p.estado_poliza === "Activa").reduce((s, p) => s + (p.prima_anual || 0), 0);
              return (
                <div key={c.id} onClick={() => onNavigate("client_detail", c.id)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 0", borderBottom: "0.5px solid var(--border)", cursor: "pointer",
                    flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 16, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 14, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 2 }}>
                      {cPolicies.length} póliza{cPolicies.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {cPrima > 0 && (
                    <span style={{ fontSize: 14, color: "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 600 }}>
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

const S = {
  eyebrow: { fontSize: 13, letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 8, fontFamily: "Plus Jakarta Sans, sans-serif" },
  title:   { fontSize: 40, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.5px", fontFamily: "Plus Jakarta Sans, sans-serif" },
};
