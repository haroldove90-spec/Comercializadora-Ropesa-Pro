
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  columns: string[];
  data: any[][];
  filename: string;
}

export const exportToPDF = ({ title, subtitle, columns, data, filename }: PDFExportOptions) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(14, 165, 233); // Sky-500
  doc.text(title, 14, 22);
  
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 30);
  }

  // Table
  autoTable(doc, {
    startY: subtitle ? 35 : 28,
    head: [columns],
    body: data,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate-900
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 65, 85], // Slate-700
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
    margin: { top: 35 },
  });

  // Footer with Page Numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Pagina ${i} de ${pageCount} - Generado por QualityWater Systems`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
};
