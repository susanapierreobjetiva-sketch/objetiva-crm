import { useState, useEffect } from "react";
import { api } from "../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function Reports({ clients, policies, claims }) {
  const [tasks, setTasks]           = useState([]);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast]           = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => { api.getTasks().then(setTasks).catch(() => {}); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const today    = new Date().toISOString().split("T")[0];
  const fecha    = selectedDate;
  const fechaFmt = new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  const esHoy = fecha === today;

  const getClient = (id) => clients.find(c => c.id === id);

  // Gestiones del día seleccionado
  const gestiones = clients.flatMap(c =>
    (c.activities || [])
      .filter(a => a.date?.startsWith(fecha))
      .map(a => ({
        cliente: c.name,
        gestion: a.note,
        usuario: a.user,
        hora: new Date(a.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      }))
  );

  // Renovaciones pendientes a la fecha seleccionada
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

  // Siniestros abiertos
  const siniestrosAbiertos = claims.filter(c => c.estado !== "Cerrado").map(c => ({
    cliente: getClient(c.client_id)?.name || "—",
    expediente: c.num_expediente || "—", ramo: c.ramo,
    aseguradora: c.aseguradora, fecha: c.fecha_siniestro || "—",
    descripcion: c.descripcion, estado: c.estado,
  }));

  // Tareas pendientes a la fecha seleccionada
  const tareasPendientes = tasks.filter(t => t.estado === "Pendiente").map(t => ({
    titulo: t.title, cliente: t.client_name || "—",
    prioridad: t.priority, vencimiento: t.due_date || "—",
    asignado: t.assigned_to || "—", descripcion: t.description || "—",
  }));

  const tareasVencidas = tasks.filter(t =>
    t.estado === "Pendiente" && t.due_date && t.due_date < fecha
  ).length;

  // ── PDF ───────────────────────────────────────────────────
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

      addSection("Gestiones del día", gestiones,
        ["Cliente", "Gestión", "Usuario", "Hora"],
        gestiones.map(g => [g.cliente, g.gestion, g.usuario, g.hora])
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

  // ── EXCEL ─────────────────────────────────────────────────
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
        gestiones.length > 0
          ? gestiones.map(g => [g.cliente, g.gestion, g.usuario, g.hora])
          : empty(`Sin gestiones registradas el ${fecha}`)
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
      </div>

      {/* Selector de fecha + botones */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--mute)", textTransform: "uppercase",
              fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 6 }}>Fecha del informe</div>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ background: "var(--lift)", border: "0.5px solid var(--border)", color: "var(--text)",
                padding: "9px 14px", borderRadius: 6, fontFamily: "Plus Jakarta Sans, sans-serif",
                fontSize: 14, outline: "none", cursor: "pointer" }}
            />
          </div>
          <div style={{ paddingTop: 20 }}>
            <div style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 14, color: "var(--gold)",
              fontWeight: 600, textTransform: "capitalize" }}>
              {fechaFmt}
              {esHoy && <span style={{ marginLeft: 8, fontSize: 11, color: "var(--mute)",
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
          { label: esHoy ? "Gestiones hoy" : "Gestiones del día", value: gestiones.length,          color: "var(--gold)" },
          { label: "Renovaciones pendientes",                       value: renovaciones.length,       color: "#E08080" },
          { label: "Siniestros en curso",                           value: siniestrosAbiertos.length, color: "#C9A870" },
          { label: "Tareas pendientes",                             value: tareasPendientes.length,   color: "var(--gold)" },
          { label: "Tareas vencidas",                               value: tareasVencidas,            color: "#E08080" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "16px 18px" }}>
            <div style={{ fontSize: 13, letterSpacing: "0.12em", color: "var(--mute)", textTransform: "uppercase",
              fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color, fontFamily: "Plus Jakarta Sans, sans-serif" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Preview gestiones */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: 20 }}>
        <div style={{ fontSize: 13, letterSpacing: "0.12em", color: "var(--mute)", textTransform: "uppercase",
          fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 14 }}>
          Gestiones registradas — {fecha}
        </div>
        {gestiones.length === 0
          ? <div style={S.empty}>Sin gestiones registradas este día</div>
          : gestiones.map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "0.5px solid var(--border)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", flexShrink: 0, marginTop: 6 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{g.cliente}</span>
                  <span style={{ fontSize: 13, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{g.hora} · {g.usuario}</span>
                </div>
                <div style={{ fontSize: 15, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 4 }}>{g.gestion}</div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Preview renovaciones */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: 20 }}>
        <div style={{ fontSize: 13, letterSpacing: "0.12em", color: "var(--mute)", textTransform: "uppercase",
          fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: 14 }}>
          Renovaciones pendientes a {fecha}
        </div>
        {renovaciones.length === 0
          ? <div style={S.empty}>✓ Sin renovaciones pendientes</div>
          : renovaciones.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: "0.5px solid var(--border)", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{r.cliente}</div>
                <div style={{ fontSize: 14, color: "var(--mute)", fontFamily: "Plus Jakarta Sans, sans-serif", marginTop: 2 }}>{r.ramo} · {r.aseguradora} · {r.poliza}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 14, color: "#E08080", fontFamily: "Plus Jakarta Sans, sans-serif" }}>⚠ {r.renovacion}</span>
                <span style={{ fontSize: 14, color: "var(--gold)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{r.prima}</span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

const S = {
  eyebrow: { fontSize: 13, letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 8, fontFamily: "Plus Jakarta Sans, sans-serif" },
  title:   { fontSize: 40, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.5px", fontFamily: "Plus Jakarta Sans, sans-serif" },
  btn:     { display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" },
  empty:   { textAlign: "center", color: "var(--mute)", fontSize: 13, fontFamily: "Plus Jakarta Sans, sans-serif", padding: "1.5rem", letterSpacing: "0.08em" },
  toast:   { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "var(--card)", border: "1px solid var(--goldDim)", color: "var(--gold)", padding: "11px 22px", borderRadius: 6, fontSize: 12, fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: 1.5, textTransform: "uppercase", zIndex: 200 },
};
