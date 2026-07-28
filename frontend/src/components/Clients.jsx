import { useState, useEffect } from "react";
import { api } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { DARK, LIGHT } from "../theme";

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Badge = ({ label, color }) => (
  <span style={{
    fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
    fontFamily: "Plus Jakarta Sans, sans-serif", padding: "2px 8px", borderRadius: 4,
    background: color + "22", color, border: `1px solid ${color}55`,
  }}>{label}</span>
);

const prioridadColor = (p, T) =>
  p === "Alta" ? "#E08080" : p === "Media" ? "#C9A870" : T.mute;

const estadoColor = (e, T) => {
  if (!e) return T.mute;
  const m = { "Abierto": "#E08080", "En gestión": "#C9A870", "Pendiente documentación": "#8B9AE0", "Resuelto": "#6BBF8A", "Cerrado": T.mute };
  return m[e] || T.mute;
};

export default function Reports({ clients, policies, claims, currentUser, theme }) {
  const T = theme === "dark" ? DARK : LIGHT;
  const S = getStyles(T);

  const [tasks, setTasks]                         = useState([]);
  const [gestionesLibres, setGestionesLibres]     = useState([]);
  const [generating, setGenerating]               = useState(false);
  const [toast, setToast]                         = useState("");
  const [selectedDate, setSelectedDate]           = useState(new Date().toISOString().split("T")[0]);
  const [selectedGestiones, setSelectedGestiones] = useState(new Set());

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => { api.getTasks().then(setTasks).catch(() => {}); }, []);

  useEffect(() => {
    api.getGestionesLibres(selectedDate)
      .then(setGestionesLibres)
      .catch(() => setGestionesLibres([]));
    setSelectedGestiones(new Set());
  }, [selectedDate]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const today    = new Date().toISOString().split("T")[0];
  const fecha    = selectedDate;
  const fechaFmt = new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  const esHoy = fecha === today;

  const getClient = (id) => clients.find(c => c.id === id);

  const gestionesClientes = clients.flatMap(c =>
    (c.activities || [])
      .filter(a => {
        if (!a.date?.startsWith(fecha)) return false;
        if (isAdmin) return true;
        return a.user === currentUser?.name;
      })
      .map(a => ({
        cliente: c.name,
        gestion: a.note,
        usuario: a.user,
        hora: new Date(a.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      }))
  );

  const gestionesProspectos = gestionesLibres
    .filter(g => isAdmin || g.user === currentUser?.name)
    .map(g => ({
      cliente: g.cliente + " ✦",
      gestion: g.note,
      usuario: g.user,
      hora: new Date(g.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    }));

  const gestiones = [...gestionesClientes, ...gestionesProspectos]
    .sort((a, b) => b.hora.localeCompare(a.hora));

  const gestionesParaExportar = selectedGestiones.size === 0
    ? gestiones
    : gestiones.filter((_, i) => selectedGestiones.has(i));

  const toggleGestion = (i) => {
    setSelectedGestiones(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleTodas = () => {
    if (selectedGestiones.size === gestiones.length) {
      setSelectedGestiones(new Set());
    } else {
      setSelectedGestiones(new Set(gestiones.map((_, i) => i)));
    }
  };

  const todasSeleccionadas = gestiones.length > 0 && selectedGestiones.size === gestiones.length;

  const renovaciones = policies.filter(p =>
    p.fecha_renovacion && p.fecha_renovacion <= fecha &&
    p.estado_tramite !== "Emitido" && p.estado_tramite !== "Anulado"
  ).map(p => ({
    cliente: getClient(p.client_id)?.name || "—",
    ramo: p.ramo, aseguradora: p.aseguradora,
    poliza: p.num_poliza || "—", renovacion: p.fecha_renovacion,
    estado: p.estado_tramite,
    prima: p.prima_anual ? `${p.prima_anual.toLocaleString("es-ES")} €` : "—",
  }));

  const siniestrosAbiertos = claims.filter(c => c.estado !== "Cerrado").map(c => ({
    cliente: getClient(c.client_id)?.name || "—",
    expediente: c.num_expediente || "—", ramo: c.ramo,
    aseguradora: c.aseguradora, fecha: c.fecha_siniestro || "—",
    descripcion: c.descripcion, estado: c.estado,
  }));

  const tareasCompletadasHoy = tasks
    .filter(t => t.estado === "Completada" && t.updated_at?.startsWith(fecha))
    .map(t => ({
      titulo: t.title, cliente: t.client_name || "—",
      prioridad: t.priority, asignado: t.assigned_to || "—",
      descripcion: t.description || "—",
      hora: t.updated_at ? new Date(t.updated_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—",
    }));

  const tareasPendientes = tasks.filter(t => t.estado === "Pendiente").map(t => ({
    titulo: t.title, cliente: t.client_name || "—",
    prioridad: t.priority, vencimiento: t.due_date || "—",
    asignado: t.assigned_to || "—", descripcion: t.description || "—",
  }));

  const tareasVencidas = tasks.filter(t =>
    t.estado === "Pendiente" && t.due_date && t.due_date < fecha
  ).length;

  const generatePDF = () => {
    setGenerating(true);
    try {
      const doc   = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      doc.setFillColor(26, 18, 8);
      doc.rect(0, 0, pageW, 40, "F");
      doc.setTextColor(201, 168, 112);
      doc.setFontSize(20); doc.setFont("helvetica", "bold");
      doc.text("OBJCRM", 14, 18);
      doc.setFontSize(9); doc.setFont("helvetica", "normal");
      doc.text("Objetiva Broker · Gestión de Clientes", 14, 26);
      doc.setFontSize(11); doc.setTextColor(232, 213, 163);
      doc.text(`Informe diario — ${fechaFmt}`, 14, 35);
      if (!isAdmin) {
        doc.setFontSize(9); doc.setTextColor(180, 160, 120);
        doc.text(`Agente: ${currentUser?.name || "—"}`, 14, 43);
      }
      let y = 52;
      const addSection = (label, rows, head, body) => {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setTextColor(26, 18, 8); doc.setFontSize(13); doc.setFont("helvetica", "bold");
        doc.text(`${label} (${rows.length})`, 14, y); y += 6;
        if (rows.length === 0) {
          doc.setFontSize(10); doc.setFont("helvetica", "italic"); doc.setTextColor(120, 100, 80);
          doc.text("Sin registros.", 14, y + 6); y += 16;
        } else {
          autoTable(doc, {
            startY: y, head: [head], body,
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [26, 18, 8], textColor: [201, 168, 112], fontStyle: "bold" },
            alternateRowStyles: { fillColor: [245, 240, 232] },
            margin: { left: 14, right: 14 },
          });
          y = doc.lastAutoTable.finalY + 12;
        }
      };
      addSection("Gestiones del día", gestionesParaExportar,
        ["Cliente", "Gestión", "Usuario", "Hora"],
        gestionesParaExportar.map(g => [g.cliente, g.gestion, g.usuario, g.hora])
      );
      addSection("Tareas completadas hoy", tareasCompletadasHoy,
        ["Título", "Cliente", "Prioridad", "Asignado", "Hora"],
        tareasCompletadasHoy.map(t => [t.titulo, t.cliente, t.prioridad, t.asignado, t.hora])
      );
      addSection("Renovaciones pendientes", renovaciones,
        ["Cliente", "Ramo", "Aseguradora", "Nº Póliza", "Renovación", "Prima/año"],
        renovaciones.map(r => [r.cliente, r.ramo, r.aseguradora, r.poliza, r.renovacion, r.prima])
      );
      addSection("Siniestros en curso", siniestrosAbiertos,
        ["Cliente", "Expediente", "Ramo", "Aseguradora", "Fecha", "Estado"],
        siniestrosAbiertos.map(s => [s.cliente, s.expediente, s.ramo, s.aseguradora, s.fecha, s.estado])
      );
      addSection("Tareas pendientes", tareasPendientes,
        ["Título", "Cliente", "Prioridad", "Vencimiento", "Asignado"],
        tareasPendientes.map(t => [t.titulo, t.cliente, t.prioridad, t.vencimiento, t.asignado])
      );
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150, 130, 100);
        doc.text(`Objetiva Broker · OBJCRM · Página ${i} de ${pageCount}`,
          pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
      }
      doc.save(`informe_diario_${fecha}.pdf`);
      showToast("PDF descargado ✓");
    } catch (e) { showToast("Error generando PDF"); console.error(e); }
    setGenerating(false);
  };

  const generateExcel = async () => {
    setGenerating(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "OBJCRM";
      const headStyle = {
        font: { bold: true, color: { argb: "FFC9A870" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1208" } },
        alignment: { vertical: "middle" },
      };
      const addSheet = (name, columns, rows) => {
        const ws = wb.addWorksheet(name);
        ws.columns = columns.map((c, i) => ({
          header: c, key: String(i),
          width: Math.max(c.length, ...rows.map(r => String(r[i] ?? "").length)) + 2,
        }));
        Object.assign(ws.getRow(1), headStyle);
        ws.getRow(1).commit();
        rows.forEach(r => ws.addRow(r));
      };
      const empty = (msg) => [[msg, "", "", "", ""]];
      addSheet("Gestiones del día",
        ["Cliente", "Gestión", "Usuario", "Hora"],
        gestionesParaExportar.length > 0
          ? gestionesParaExportar.map(g => [g.cliente, g.gestion, g.usuario, g.hora])
          : empty(`Sin gestiones registradas el ${fecha}`)
      );
      addSheet("Tareas completadas",
        ["Título", "Cliente", "Prioridad", "Asignado", "Hora"],
        tareasCompletadasHoy.length > 0
          ? tareasCompletadasHoy.map(t => [t.titulo, t.cliente, t.prioridad, t.asignado, t.hora])
          : empty(`Sin tareas completadas el ${fecha}`)
      );
      addSheet("Renovaciones",
        ["Cliente", "Ramo", "Aseguradora", "Nº Póliza", "Renovación", "Estado", "Prima/año"],
        renovaciones.length > 0
          ? renovaciones.map(r => [r.cliente, r.ramo, r.aseguradora, r.poliza, r.renovacion, r.estado, r.prima])
          : empty("Sin renovaciones pendientes")
      );
      addSheet("Siniestros",
        ["Cliente", "Expediente", "Ramo", "Aseguradora", "Fecha", "Descripción", "Estado"],
        siniestrosAbiertos.length > 0
          ? siniestrosAbiertos.map(s => [s.cliente, s.expediente, s.ramo, s.aseguradora, s.fecha, s.descripcion, s.estado])
          : empty("Sin siniestros abiertos")
      );
      addSheet("Tareas pendientes",
        ["Título", "Cliente", "Prioridad", "Vencimiento", "Asignado", "Descripción"],
        tareasPendientes.length > 0
          ? tareasPendientes.map(t => [t.titulo, t.cliente, t.prioridad, t.vencimiento, t.asignado, t.descripcion])
          : empty("Sin tareas pendientes")
      );
      const buffer = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `informe_diario_${fecha}.xlsx`
      );
      showToast("Excel descargado ✓");
    } catch (e) { showToast("Error generando Excel"); console.error(e); }
    setGenerating(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {toast && <div style={S.toast}>{toast}</div>}

      <div>
        <div style={S.eyebrow}>Exportar</div>
        <h1 style={S.title}>Informe Diario</h1>
        {!isAdmin && (
          <div style={{ fontSize: 13, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 4 }}>
            Actividad de <span style={{ color: T.gold, fontWeight: 600 }}>{currentUser?.name}</span>
          </div>
        )}
      </div>

      {/* Selector de fecha + botones */}
      <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.15em", color: T.mute, textTransform: "uppercase",
              fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 6 }}>Fecha del informe</div>
            <input type="date" value={selectedDate} max={today}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ background: T.lift, border: `0.5px solid ${T.border}`, color: T.text,
                padding: "9px 14px", borderRadius: 6, fontFamily: "Plus Jakarta Sans, sans-serif",
                fontSize: 14, outline: "none", cursor: "pointer" }} />
          </div>
          <div style={{ paddingTop: 20 }}>
            <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 14, color: T.gold,
              fontWeight: 600, textTransform: "capitalize" }}>
              {fechaFmt}
              {esHoy && <span style={{ marginLeft: 8, fontSize: 11, color: T.mute,
                fontWeight: 400, textTransform: "uppercase", letterSpacing: "0.1em" }}>— Hoy</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={generatePDF} disabled={generating}
            style={{ ...S.btn, background: "#8B3A3A", opacity: generating ? 0.7 : 1 }}>
            <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" size={16} />
            {generating ? "Generando..." : "Descargar PDF"}
          </button>
          <button onClick={generateExcel} disabled={generating}
            style={{ ...S.btn, background: "#2A6B3A", opacity: generating ? 0.7 : 1 }}>
            <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h2m4 0h2 M8 17h2m4 0h2" size={16} />
            {generating ? "Generando..." : "Descargar Excel"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {[
          { label: esHoy ? "Gestiones hoy"       : "Gestiones del día",   value: gestiones.length,              color: T.gold },
          { label: esHoy ? "Completadas hoy"      : "Completadas ese día", value: tareasCompletadasHoy.length,   color: "#6BBF8A" },
          { label: "Renovaciones pendientes",                               value: renovaciones.length,           color: "#E08080" },
          { label: "Siniestros en curso",                                   value: siniestrosAbiertos.length,     color: "#C9A870" },
          { label: "Tareas pendientes",                                     value: tareasPendientes.length,       color: T.gold },
          { label: "Tareas vencidas",                                       value: tareasVencidas,                color: "#E08080" },
        ].map(k => (
          <div key={k.label} style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "16px 18px" }}>
            <div style={{ fontSize: 13, letterSpacing: "0.12em", color: T.mute, textTransform: "uppercase",
              fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── GESTIONES CON CHECKBOXES ── */}
      <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {gestiones.length > 0 && (
              <input type="checkbox" checked={todasSeleccionadas} onChange={toggleTodas}
                style={{ width: 15, height: 15, accentColor: T.gold, cursor: "pointer" }} />
            )}
            <div style={{ fontSize: 13, letterSpacing: "0.12em", color: T.mute, textTransform: "uppercase",
              fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {`Gestiones registradas — ${fecha}`}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {selectedGestiones.size > 0 && (
              <span style={{ fontSize: 11, color: T.gold, fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                {selectedGestiones.size} seleccionada{selectedGestiones.size > 1 ? "s" : ""}
              </span>
            )}
            {gestiones.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, background: T.goldDim || "#C9A87022",
                color: T.gold, padding: "2px 10px", borderRadius: 12,
                fontFamily: "Plus Jakarta Sans, sans-serif" }}>{gestiones.length}</span>
            )}
          </div>
        </div>
        {gestiones.length === 0
          ? <div style={S.empty}>Sin gestiones registradas este día</div>
          : <>
              {selectedGestiones.size === 0 && (
                <div style={{ fontSize: 11, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif",
                  marginBottom: 10, fontStyle: "italic" }}>
                  Sin selección — se exportarán todas al PDF/Excel
                </div>
              )}
              {gestiones.map((g, i) => {
                const checked = selectedGestiones.has(i);
                return (
                  <div key={i} onClick={() => toggleGestion(i)}
                    style={{ display: "flex", gap: 12, padding: "10px 0",
                      borderBottom: `0.5px solid ${T.border}`, cursor: "pointer",
                      opacity: selectedGestiones.size > 0 && !checked ? 0.45 : 1,
                      transition: "opacity 0.15s" }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleGestion(i)}
                      onClick={e => e.stopPropagation()}
                      style={{ width: 15, height: 15, accentColor: T.gold, cursor: "pointer", flexShrink: 0, marginTop: 4 }} />
                    <div style={S.dot} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                        <span style={S.nombre}>{g.cliente}</span>
                        <span style={S.meta}>{g.hora} · {g.usuario}</span>
                      </div>
                      <div style={S.desc}>{g.gestion}</div>
                    </div>
                  </div>
                );
              })}
            </>
        }
      </div>

      {/* ── TAREAS COMPLETADAS ── */}
      <PreviewSection T={T}
        title={esHoy ? "Tareas completadas hoy" : `Tareas completadas el ${fecha}`}
        count={tareasCompletadasHoy.length}
        emptyMsg="Sin tareas completadas este día">
        {tareasCompletadasHoy.map((t, i) => (
          <div key={i} style={{ ...S.row, alignItems: "flex-start" }}>
            <div style={{ ...S.dot, background: "#6BBF8A", marginTop: 6 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                <span style={S.nombre}>✓ {t.titulo}</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Badge label={t.prioridad} color={prioridadColor(t.prioridad, T)} />
                  <span style={S.meta}>{t.hora}</span>
                </div>
              </div>
              <div style={S.meta}>
                {t.cliente !== "—" && <span>{t.cliente} · </span>}
                {t.asignado !== "—" && <span>{t.asignado}</span>}
              </div>
              {t.descripcion !== "—" && <div style={{ ...S.desc, marginTop: 4 }}>{t.descripcion}</div>}
            </div>
          </div>
        ))}
      </PreviewSection>

      {/* ── RENOVACIONES ── */}
      <PreviewSection T={T} title={`Renovaciones pendientes a ${fecha}`} count={renovaciones.length} emptyMsg="✓ Sin renovaciones pendientes">
        {renovaciones.map((r, i) => (
          <div key={i} style={{ ...S.row, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={S.nombre}>{r.cliente}</div>
              <div style={S.meta}>{r.ramo} · {r.aseguradora} · {r.poliza}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 14, color: "#E08080", fontFamily: "Plus Jakarta Sans, sans-serif" }}>⚠ {r.renovacion}</span>
              <span style={{ fontSize: 14, color: T.gold, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{r.prima}</span>
            </div>
          </div>
        ))}
      </PreviewSection>

      {/* ── SINIESTROS ── */}
      <PreviewSection T={T} title="Siniestros en curso" count={siniestrosAbiertos.length} emptyMsg="✓ Sin siniestros abiertos">
        {siniestrosAbiertos.map((s, i) => (
          <div key={i} style={{ ...S.row, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
                <span style={S.nombre}>{s.cliente}</span>
                <Badge label={s.estado} color={estadoColor(s.estado, T)} />
              </div>
              <div style={S.meta}>{s.expediente} · {s.ramo} · {s.aseguradora} · {s.fecha}</div>
              {s.descripcion && <div style={{ ...S.desc, marginTop: 4 }}>{s.descripcion}</div>}
            </div>
          </div>
        ))}
      </PreviewSection>

      {/* ── TAREAS PENDIENTES ── */}
      <PreviewSection T={T} title="Tareas pendientes" count={tareasPendientes.length} emptyMsg="✓ Sin tareas pendientes">
        {tareasPendientes.map((t, i) => {
          const vencida = t.vencimiento && t.vencimiento < fecha;
          return (
            <div key={i} style={{ ...S.row, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                  <span style={S.nombre}>{t.titulo}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Badge label={t.prioridad} color={prioridadColor(t.prioridad, T)} />
                    {vencida && <Badge label="Vencida" color="#E08080" />}
                  </div>
                </div>
                <div style={S.meta}>
                  {t.cliente !== "—" && <span>{t.cliente} · </span>}
                  <span style={{ color: vencida ? "#E08080" : T.mute }}>Vence: {t.vencimiento}</span>
                  {t.asignado !== "—" && <span> · {t.asignado}</span>}
                </div>
                {t.descripcion !== "—" && <div style={{ ...S.desc, marginTop: 4 }}>{t.descripcion}</div>}
              </div>
            </div>
          );
        })}
      </PreviewSection>

    </div>
  );
}

function PreviewSection({ title, count, emptyMsg, children, T }) {
  const S = getStyles(T);
  return (
    <div style={{ background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 8, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, letterSpacing: "0.12em", color: T.mute, textTransform: "uppercase",
          fontFamily: "Plus Jakarta Sans, sans-serif" }}>{title}</div>
        {count > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, background: T.goldDim || "#C9A87022",
            color: T.gold, padding: "2px 10px", borderRadius: 12,
            fontFamily: "Plus Jakarta Sans, sans-serif" }}>{count}</span>
        )}
      </div>
      {count === 0 ? <div style={S.empty}>{emptyMsg}</div> : children}
    </div>
  );
}

function getStyles(T) {
  return {
    eyebrow: { fontSize: 13, letterSpacing: "0.2em", color: T.gold, textTransform: "uppercase", marginBottom: 8, fontFamily: "Plus Jakarta Sans, sans-serif" },
    title:   { fontSize: 40, fontWeight: 700, color: T.text, margin: 0, letterSpacing: "-0.5px", fontFamily: "Plus Jakarta Sans, sans-serif" },
    btn:     { display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" },
    empty:   { textAlign: "center", color: T.mute, fontSize: 13, fontFamily: "Plus Jakarta Sans, sans-serif", padding: "1.5rem", letterSpacing: "0.08em" },
    toast:   { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: T.card, border: `1px solid ${T.goldDim}`, color: T.gold, padding: "11px 22px", borderRadius: 6, fontSize: 12, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: 1.5, textTransform: "uppercase", zIndex: 200 },
    row:     { display: "flex", gap: 12, padding: "10px 0", borderBottom: `0.5px solid ${T.border}` },
    dot:     { width: 6, height: 6, borderRadius: "50%", background: T.gold, flexShrink: 0, marginTop: 6 },
    nombre:  { fontSize: 15, fontWeight: 600, color: T.gold, fontFamily: "Plus Jakarta Sans, sans-serif" },
    meta:    { fontSize: 13, color: T.mute, fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 2 },
    desc:    { fontSize: 15, color: T.text, fontFamily: "Plus Jakarta Sans, sans-serif" },
  };
}