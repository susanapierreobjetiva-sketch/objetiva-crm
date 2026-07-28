import { useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DARK, LIGHT } from "../theme";

async function exportExcel(data, columns, filename, title) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "OBJCRM";
  const ws = wb.addWorksheet(title);

  // Cabecera
  ws.columns = columns.map(col => ({
    header: col.label,
    key:    col.label,
    width:  Math.max(
      col.label.length,
      ...data.map(r => String(col.value(r) ?? "").length)
    ) + 2,
  }));

  ws.getRow(1).font      = { bold: true, color: { argb: "FFC9A870" } };
  ws.getRow(1).fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1208" } };
  ws.getRow(1).alignment = { vertical: "middle", horizontal: "left" };

  // Datos
  data.forEach(row => {
    const obj = {};
    columns.forEach(col => { obj[col.label] = col.value(row) ?? ""; });
    ws.addRow(obj);
  });

  // Bordes ligeros en todas las celdas
  ws.eachRow(row => {
    row.eachCell(cell => {
      cell.border = {
        top:    { style: "thin", color: { argb: "FFD8CEB8" } },
        bottom: { style: "thin", color: { argb: "FFD8CEB8" } },
        left:   { style: "thin", color: { argb: "FFD8CEB8" } },
        right:  { style: "thin", color: { argb: "FFD8CEB8" } },
      };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${filename}.xlsx`);
}

function exportPDF(data, columns, filename, title) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Exportado el ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })} · OBJCRM`, 14, 23);
  autoTable(doc, {
    startY: 28,
    head:   [columns.map(c => c.label)],
    body:   data.map(row => columns.map(col => col.value(row) ?? "")),
    styles:           { fontSize: 8, cellPadding: 3, font: "helvetica" },
    headStyles:       { fillColor: [42, 32, 16], textColor: [201, 168, 112], fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 244, 238] },
    margin: { left: 14, right: 14 },
  });
  doc.save(`${filename}.pdf`);
}

export default function ExportButton({ data, columns, filename, title, theme }) {
  const T = theme === "dark" ? DARK : LIGHT;

  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleExcel = async () => {
    setLoading(true);
    setOpen(false);
    try { await exportExcel(data, columns, filename, title); }
    catch (e) { console.error("Error exportando Excel:", e); }
    setLoading(false);
  };

  const handlePDF = () => {
    setOpen(false);
    try { exportPDF(data, columns, filename, title); }
    catch (e) { console.error("Error exportando PDF:", e); }
  };

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} disabled={loading}
        style={{ display: "flex", alignItems: "center", gap: 6,
          padding: "9px 16px", background: "none",
          border: `0.5px solid ${T.goldDim}`, borderRadius: 6,
          color: T.gold, cursor: loading ? "not-allowed" : "pointer",
          fontSize: 11, fontWeight: 700, opacity: loading ? 0.7 : 1,
          fontFamily: "Plus Jakarta Sans, sans-serif",
          letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {loading ? "Generando..." : "↓ Exportar"}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: T.card, border: `0.5px solid ${T.border}`,
          borderRadius: 8, overflow: "hidden", zIndex: 100,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)", minWidth: 160 }}>
          <button onClick={handleExcel}
            style={{ display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "12px 16px", background: "none",
              border: "none", borderBottom: `0.5px solid ${T.border}`,
              color: T.text, cursor: "pointer",
              fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, textAlign: "left" }}>
            📊 Excel (.xlsx)
          </button>
          <button onClick={handlePDF}
            style={{ display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "12px 16px", background: "none",
              border: "none", color: T.text, cursor: "pointer",
              fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 13, textAlign: "left" }}>
            📄 PDF
          </button>
        </div>
      )}
    </div>
  );
}