import { useState } from "react";

const ESTADO_COLORS = {
  "Abierto":    { bg: "#1A0A0A", color: "#E08080" },
  "En gestión": { bg: "#1A1508", color: "#C9A870" },
  "Cerrado":    { bg: "#0A1A0A", color: "#27ae60" },
};

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function Claims({ claims, clients, policies, onRefresh, currentUser }) {
  const [filter, setFilter] = useState("Todos");
  const [search, setSearch] = useState("");

  const getClient = (clientId) => clients.find(c => c.id === clientId);

  const filtered = claims.filter(c => {
    const matchFilter = filter === "Todos" || c.estado === filter;
    const client      = getClient(c.client_id);
    const matchSearch = c.descripcion.toLowerCase().includes(search.toLowerCase()) ||
      (client?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.num_expediente || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.aseguradora || "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const abiertos   = claims.filter(c => c.estado === "Abierto").length;
  const enGestion  = claims.filter(c => c.estado === "En gestión").length;
  const cerrados   = claims.filter(c => c.estado === "Cerrado").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={S.eyebrow}>Gestión</div>
        <h1 style={S.title}>Siniestros</h1>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {[
          { label: "Abiertos",    value: abiertos,  color: "#E08080" },
          { label: "En gestión",  value: enGestion, color: "#C9A870" },
          { label: "Cerrados",    value: cerrados,  color: "#27ae60" },
          { label: "Total",       value: claims.length, color: "var(--gold)" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--card)", border: "0.5px solid var(--border)",
            borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "var(--mute)",
              textTransform: "uppercase", fontFamily: "Syne, sans-serif", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: "Syne, sans-serif" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={S.searchWrap}>
          <Icon d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0" size={15} stroke="var(--mute)" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente, expediente, aseguradora..." style={S.searchInput} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Todos", "Abierto", "En gestión", "Cerrado"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...S.chip, ...(filter === f ? S.chipActive : {}) }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && <div style={S.empty}>Sin siniestros</div>}
        {filtered.map(c => {
          const client  = getClient(c.client_id);
          const estados = ESTADO_COLORS[c.estado] || { bg: "var(--lift)", color: "var(--mute)" };
          return (
            <div key={c.id} style={{ background: "var(--card)",
              border: `0.5px solid ${c.estado === "Abierto" ? "#3A1A1A" : "var(--border)"}`,
              borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Cliente */}
                  <div style={{ fontSize: 12, color: "var(--gold)", fontFamily: "Syne, sans-serif",
                    fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>
                    {client?.name || "Cliente desconocido"}
                  </div>
                  {/* Descripción */}
                  <div style={{ fontSize: 15, color: "var(--text)", fontFamily: "Syne, sans-serif",
                    fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.descripcion}
                  </div>
                  {/* Detalles */}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
                    {c.ramo         && <span style={S.meta}>{c.ramo}</span>}
                    {c.aseguradora  && <span style={S.meta}>{c.aseguradora}</span>}
                    {c.num_expediente && <span style={S.meta}>Exp: {c.num_expediente}</span>}
                    {c.fecha_siniestro && <span style={S.meta}>{c.fecha_siniestro}</span>}
                  </div>
                  {c.resolucion && (
                    <div style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Syne, sans-serif", marginTop: 6 }}>
                      Resolución: {c.resolucion}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 10, padding: "4px 12px", borderRadius: 999,
                  background: estados.bg, color: estados.color,
                  fontFamily: "Syne, sans-serif", letterSpacing: "0.08em",
                  whiteSpace: "nowrap", flexShrink: 0 }}>{c.estado}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const S = {
  eyebrow:    { fontSize: 10, letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 8, fontFamily: "Syne, sans-serif" },
  title:      { fontSize: 32, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.5px", fontFamily: "Syne, sans-serif" },
  searchWrap: { display: "flex", alignItems: "center", gap: 10, background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "10px 16px" },
  searchInput:{ flex: 1, background: "none", border: "none", color: "var(--text)", fontFamily: "Syne, sans-serif", fontSize: 13, outline: "none" },
  chip:       { padding: "5px 14px", borderRadius: 999, border: "0.5px solid var(--border)", background: "none", color: "var(--textSub)", cursor: "pointer", fontFamily: "Syne, sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" },
  chipActive: { border: "0.5px solid var(--gold)", color: "var(--bgApp)", background: "var(--gold)", fontWeight: 700 },
  meta:       { fontSize: 12, color: "var(--mute)", fontFamily: "Syne, sans-serif" },
  empty:      { textAlign: "center", color: "var(--mute)", fontSize: 13, fontFamily: "Syne, sans-serif", padding: "3rem", letterSpacing: "0.08em" },
};
