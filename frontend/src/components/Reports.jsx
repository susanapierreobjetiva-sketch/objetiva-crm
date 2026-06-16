import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export default function Reports({ clients, policies, claims }) {
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const today     = new Date().toISOString().split("T")[0];
  const todayFmt  = new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const getClient = (id) => clients.find(c => c.id === id);

  // Datos del informe
  const gestionesHoy = clients.flatMap(c =>
    (c.activities || [])
      .filter(a => a.date?.startsWith(today))
      .map(a => ({ cliente: c.name, gestion: a.note, usuario: a.user, hora: new Date(a.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) }))
  );

  const renovacionesHoy = policies.filter(p =>
    p.fecha_renovacion && p.fecha_renovacion <= today &&
    p.estado_tramite !== "Emitido" && p.estado_tramite !== "Anulado"
  ).map(p => ({
    cliente: getClient(p.client_id)?.name || "—",
    ramo: p.ramo,
    aseguradora: p.aseguradora,
    poliza: p.num_poliza || "—",
    renovacion: p.fecha_renovacion,
    estado: p.estado_tramite,
    prima: p.prima_anual ? `${p.prima_anual.toLocaleString("es-ES")} €` : "—",
  }));

  const siniestrosAbiertos = claims.filter(c => c.estado !== "Cerrado").map(c => ({
    cliente: getClient(c.client_id)?.name || "—",
    expediente: c.num_expediente || "—",
    ramo: c.ramo,
    aseguradora: c.aseguradora,
    fecha: c.fecha_siniestro || "—",
    descripcion: c.descripcion,
    estado: c.estado,
  }));

  // ── PDF ───────────────────────────────────────────────────
  const generatePDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(26, 18, 8);
      doc.rect(0, 0, pageW, 40, "F");
      doc.setTextColor(201, 168, 112);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("OBJCRM", 14, 18);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Objetiva Broker · Gestión de Clientes", 14, 26);
      doc.setFontSize(11);
      doc.setTextColor(232, 213, 163);
      doc.text(`Informe diario — ${todayFmt}`, 14, 35);

      let y = 52;

      // ── Gestiones del día
      doc.setTextColor(26, 18, 8);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(`Gestiones del día (${gestionesHoy.length})`, 14, y);
      y += 6;

      if (gestionesHoy.length === 0) {
        doc.setFontSize(10); doc.setFont("helvetica", "italic");
        doc.setTextColor(120, 100, 80);
        doc.text("Sin gestiones registradas hoy.", 14, y + 6);
        y += 16;
      } else {
        autoTable(doc, {
          startY: y,
          head: [["Cliente", "Gestión", "Usuario", "Hora"]],
          body: gestionesHoy.map(g => [g.cliente, g.gestion, g.usuario, g.hora]),
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [26, 18, 8], textColor: [201, 168, 112], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 240, 232] },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 12;
      }

      // ── Renovaciones vencidas
      doc.setTextColor(26, 18, 8);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(`Renovaciones pendientes (${renovacionesHoy.length})`, 14, y);
      y += 6;

      if (renovacionesHoy.length === 0) {
        doc.setFontSize(10); doc.setFont("helvetica", "italic");
        doc.setTextColor(120, 100, 80);
        doc.text("Sin renovaciones pendientes.", 14, y + 6);
        y += 16;
      } else {
        autoTable(doc, {
          startY: y,
          head: [["Cliente", "Ramo", "Aseguradora", "Nº Póliza", "Renovación", "Prima/año"]],
          body: renovacionesHoy.map(r => [r.cliente, r.ramo, r.aseguradora, r.poliza, r.renovacion, r.prima]),
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [26, 18, 8], textColor: [201, 168, 112], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 240, 232] },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 12;
      }

      // ── Siniestros abiertos
      doc.setTextColor(26, 18, 8);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(`Siniestros en curso (${siniestrosAbiertos.length})`, 14, y);
      y += 6;

      if (siniestrosAbiertos.length === 0) {
        doc.setFontSize(10); doc.setFont("helvetica", "italic");
        doc.setTextColor(120, 100, 80);
        doc.text("Sin siniestros abiertos.", 14, y + 6);
      } else {
        autoTable(doc, {
          startY: y,
          head: [["Cliente", "Expediente", "Ramo", "Aseguradora", "Fecha", "Estado"]],
          body: siniestrosAbiertos.map(s => [s.cliente, s.expediente, s.ramo, s.aseguradora, s.fecha, s.estado]),
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [26, 18, 8], textColor: [201, 168, 112], fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 240, 232] },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 130, 100);
        doc.text(`Objetiva Broker · OBJCRM · Página ${i} de ${pageCount}`, pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
      }

      doc.save(`informe_diario_${today}.pdf`);
      showToast("PDF descargado ✓");
    } catch (e) { showToast("Error generando PDF"); console.error(e); }
    setGenerating(false);
  };

  // ── EXCEL ─────────────────────────────────────────────────
  const generateExcel = () => {
    setGenerating(true);
    try {
      const wb = XLSX.utils.book_new();

      // Hoja 1: Gestiones
      const wsGestiones = XLSX.utils.json_to_sheet(
        gestionesHoy.length > 0 ? gestionesHoy :
        [{ cliente: "Sin gestiones registradas hoy", gestion: "", usuario: "", hora: "" }]
      );
      wsGestiones["!cols"] = [{ wch: 25 }, { wch: 50 }, { wch: 20 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, wsGestiones, "Gestiones del día");

      // Hoja 2: Renovaciones
      const wsRenov = XLSX.utils.json_to_sheet(
        renovacionesHoy.length > 0 ? renovacionesHoy :
        [{ cliente: "Sin renovaciones pendientes", ramo: "", aseguradora: "", poliza: "", renovacion: "", estado: "", prima: "" }]
      );
      wsRenov["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsRenov, "Renovaciones");

      // Hoja 3: Siniestros
      const wsSin = XLSX.utils.json_to_sheet(
        siniestrosAbiertos.length > 0 ? siniestrosAbiertos :
        [{ cliente: "Sin siniestros abiertos", expediente: "", ramo: "", aseguradora: "", fecha: "", descripcion: "", estado: "" }]
      );
      wsSin["!cols"] = [{ wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 14 }, { wch: 40 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, wsSin, "Siniestros");

      XLSX.writeFile(wb, `informe_diario_${today}.xlsx`);
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

      {/* Fecha y botones */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "20px 24px" }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 13, color: "var(--mute)", marginBottom: 6, textTransform: "capitalize" }}>
          {todayFmt}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          <button onClick={generatePDF} disabled={generating} style={{ ...S.btn, background: "#8B3A3A", borderColor: "#8B3A3A" }}>
            <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" size={16} />
            Descargar PDF
          </button>
          <button onClick={generateExcel} disabled={generating} style={{ ...S.btn, background: "#2A6B3A", borderColor: "#2A6B3A" }}>
            <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h2m4 0h2 M8 17h2m4 0h2" size={16} />
            Descargar Excel
          </button>
        </div>
      </div>

      {/* Resumen del día */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {[
          { label: "Gestiones hoy",          value: gestionesHoy.length,       color: "var(--gold)" },
          { label: "Renovaciones pendientes", value: renovacionesHoy.length,    color: "#E08080" },
          { label: "Siniestros en curso",     value: siniestrosAbiertos.length, color: "#C9A870" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.15em", color: "var(--mute)", textTransform: "uppercase", fontFamily: "Syne, sans-serif", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color, fontFamily: "Syne, sans-serif" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Preview gestiones */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--mute)", textTransform: "uppercase", fontFamily: "Syne, sans-serif", marginBottom: 14 }}>
          Gestiones registradas hoy
        </div>
        {gestionesHoy.length === 0
          ? <div style={S.empty}>Sin gestiones registradas hoy</div>
          : gestionesHoy.map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "0.5px solid var(--border)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--gold)", flexShrink: 0, marginTop: 6 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)", fontFamily: "Syne, sans-serif" }}>{g.cliente}</span>
                  <span style={{ fontSize: 11, color: "var(--mute)", fontFamily: "Syne, sans-serif" }}>{g.hora} · {g.usuario}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text)", fontFamily: "Syne, sans-serif", marginTop: 4 }}>{g.gestion}</div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Preview renovaciones */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--mute)", textTransform: "uppercase", fontFamily: "Syne, sans-serif", marginBottom: 14 }}>
          Renovaciones pendientes
        </div>
        {renovacionesHoy.length === 0
          ? <div style={S.empty}>✓ Sin renovaciones pendientes</div>
          : renovacionesHoy.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: "0.5px solid var(--border)", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "Syne, sans-serif" }}>{r.cliente}</div>
                <div style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Syne, sans-serif", marginTop: 2 }}>
                  {r.ramo} · {r.aseguradora} · {r.poliza}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#E08080", fontFamily: "Syne, sans-serif" }}>⚠ {r.renovacion}</span>
                <span style={{ fontSize: 12, color: "var(--gold)", fontFamily: "Syne, sans-serif" }}>{r.prima}</span>
              </div>
            </div>
          ))
        }
      </div>

      {/* Preview siniestros */}
      <div style={{ background: "var(--card)", border: "0.5px solid var(--border)", borderRadius: 8, padding: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.15em", color: "var(--mute)", textTransform: "uppercase", fontFamily: "Syne, sans-serif", marginBottom: 14 }}>
          Siniestros en curso
        </div>
        {siniestrosAbiertos.length === 0
          ? <div style={S.empty}>✓ Sin siniestros abiertos</div>
          : siniestrosAbiertos.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: "0.5px solid var(--border)", flexWrap: "wrap", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "Syne, sans-serif" }}>{s.cliente}</div>
                <div style={{ fontSize: 12, color: "var(--mute)", fontFamily: "Syne, sans-serif", marginTop: 2,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.descripcion}
                </div>
                <div style={{ fontSize: 11, color: "var(--mute)", fontFamily: "Syne, sans-serif", marginTop: 2 }}>
                  {s.ramo} · {s.aseguradora} · Exp: {s.expediente}
                </div>
              </div>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, flexShrink: 0,
                background: s.estado === "Abierto" ? "#1A0A0A" : "#1A1508",
                color: s.estado === "Abierto" ? "#E08080" : "#C9A870",
                fontFamily: "Syne, sans-serif" }}>{s.estado}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

const S = {
  eyebrow: { fontSize: 10, letterSpacing: "0.2em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 8, fontFamily: "Syne, sans-serif" },
  title:   { fontSize: 32, fontWeight: 700, color: "var(--text)", margin: 0, letterSpacing: "-0.5px", fontFamily: "Syne, sans-serif" },
  btn:     { display: "flex", alignItems: "center", gap: 8, padding: "12px 22px", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "Syne, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" },
  empty:   { textAlign: "center", color: "var(--mute)", fontSize: 13, fontFamily: "Syne, sans-serif", padding: "1.5rem", letterSpacing: "0.08em" },
  toast:   { position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: "var(--card)", border: "1px solid var(--goldDim)", color: "var(--gold)", padding: "11px 22px", borderRadius: 6, fontSize: 12, fontFamily: "Syne, sans-serif", letterSpacing: 1.5, textTransform: "uppercase", zIndex: 200 },
};
