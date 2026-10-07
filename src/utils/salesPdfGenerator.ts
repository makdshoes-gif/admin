import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale } from '../types';

export interface ReportPdfOptions {
  sales: Sale[];
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  exchangeRate: number;
  totalRevenueUsd: number;
  totalRevenueBs: number;
  totalCostUsd: number;
  netProfitUsd: number;
  profitMarginPercent: number;
  totalPairsSold: number;
  averageTicketUsd: number;
  paymentBreakdown: Array<{ cuenta: string; montoUsd: number; porcentaje: number }>;
  topSellingShoes: Array<{ nombre: string; marca: string; pares: number; totalUsd: number }>;
  generatedBy?: string;
}

/**
 * Genera un Resumen de Cierre Diario o Reporte de Ventas profesional en PDF usando jsPDF
 */
export function generateSalesReportPdf(options: ReportPdfOptions) {
  const {
    sales,
    periodLabel,
    startDate,
    endDate,
    exchangeRate,
    totalRevenueUsd,
    totalRevenueBs,
    totalCostUsd,
    netProfitUsd,
    profitMarginPercent,
    totalPairsSold,
    averageTicketUsd,
    paymentBreakdown,
    topSellingShoes,
    generatedBy = 'Administración',
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // --- 1. ENCABEZADO CORPORATIVO ---
  // Fondo superior slate-900
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Título de la empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('MAKD SHOP, C.A.', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // #cbd5e1
  doc.text('RIF: J-50491823-1  •  Puerto Ordaz, Alta Vista II Local 163  •  Marcamos tu estilo', margin, 17);
  doc.text('Sistema Administrativo & POS  •  www.makdshop.com', margin, 22);

  // Badge derecho de documento
  doc.setFillColor(67, 56, 202); // #4338ca
  doc.roundedRect(pageWidth - margin - 52, 6, 52, 16, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('REPORTE DE VENTAS', pageWidth - margin - 26, 12, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setTextColor(224, 231, 255);
  doc.text('CIERRE & RESUMEN FINANCIERO', pageWidth - margin - 26, 17, { align: 'center' });

  // --- 2. METADATOS DEL REPORTE ---
  let currentY = 34;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Período: ${periodLabel.toUpperCase()}`, margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const now = new Date();
  const fechaEmision = `${now.toLocaleDateString('es-VE')} - ${now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(`Fecha de emisión: ${fechaEmision}`, pageWidth - margin, currentY, { align: 'right' });

  currentY += 4;
  const dateRangeText = startDate && endDate ? `Rango: ${startDate} al ${endDate}` : `Tasa oficial BCV: ${exchangeRate.toFixed(2)} Bs/USD`;
  doc.text(dateRangeText, margin, currentY);
  doc.text(`Emitido por: ${generatedBy}  •  Total Ventas: ${sales.length}`, pageWidth - margin, currentY, { align: 'right' });

  currentY += 5;

  // --- 3. CAJAS DE MÉTRICAS CLAVE (KPIs) ---
  const boxWidth = (pageWidth - margin * 2 - 9) / 4;
  const boxHeight = 15;

  // Caja 1: Total Ventas USD
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('VENTAS TOTALES (USD)', margin + 3, currentY + 4.5);
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`$${totalRevenueUsd.toFixed(2)}`, margin + 3, currentY + 11);

  // Caja 2: Total Ventas Bs
  const box2X = margin + boxWidth + 3;
  doc.roundedRect(box2X, currentY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL BOLÍVARES (BS)', box2X + 3, currentY + 4.5);
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`${totalRevenueBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs`, box2X + 3, currentY + 11);

  // Caja 3: Utilidad Neta
  const box3X = box2X + boxWidth + 3;
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(box3X, currentY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(4, 120, 87);
  doc.text(`GANANCIA NETA (${profitMarginPercent.toFixed(1)}%)`, box3X + 3, currentY + 4.5);
  doc.setFontSize(11);
  doc.text(`+$${netProfitUsd.toFixed(2)}`, box3X + 3, currentY + 11);

  // Caja 4: Pares y Ticket Promedio
  const box4X = box3X + boxWidth + 3;
  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(box4X, currentY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(67, 56, 202);
  doc.text('PARES VENDIDOS / TICKET', box4X + 3, currentY + 4.5);
  doc.setFontSize(10);
  doc.text(`${totalPairsSold} pares  •  $${averageTicketUsd.toFixed(1)}`, box4X + 3, currentY + 11);

  currentY += boxHeight + 6;

  // --- 4. TABLA DE RECAUDACIÓN POR MÉTODO DE PAGO ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('DESGLOSE DE RECAUDACIÓN POR MÉTODO DE PAGO', margin, currentY);

  currentY += 2;

  const paymentTableRows = paymentBreakdown.map((pm) => {
    const isCashea = pm.cuenta.toLowerCase().includes('cashea');
    const montoBs = pm.montoUsd * exchangeRate;
    return [
      pm.cuenta,
      isCashea ? 'Financiamiento (Por Liquidar)' : 'Ingreso Inmediato en Cuenta',
      `$${pm.montoUsd.toFixed(2)}`,
      `${montoBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs`,
      `${pm.porcentaje.toFixed(1)}%`,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Cuenta / Método', 'Tipo de Fondos', 'Monto (USD)', 'Equivalente (Bs)', 'Participación']],
    body: paymentTableRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { cellWidth: 50 },
      2: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
      3: { halign: 'right', cellWidth: 35 },
      4: { halign: 'center', cellWidth: 25 },
    },
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 6;

  // --- 5. TOP MODELOS VENDIDOS (SI HAY) ---
  if (topSellingShoes && topSellingShoes.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('TOP MODELOS DE CALZADO MÁS VENDIDOS', margin, currentY);
    currentY += 2;

    const topRows = topSellingShoes.slice(0, 5).map((t, idx) => [
      `#${idx + 1}`,
      t.nombre,
      t.marca,
      `${t.pares} ${t.pares === 1 ? 'par' : 'pares'}`,
      `$${t.totalUsd.toFixed(2)}`,
      totalRevenueUsd > 0 ? `${((t.totalUsd / totalRevenueUsd) * 100).toFixed(1)}%` : '0%',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Pos.', 'Modelo de Calzado', 'Marca', 'Pares Vendidos', 'Total Facturado', '% del Total']],
      body: topRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      headStyles: { fillColor: [67, 56, 202], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold', cellWidth: 12 },
        1: { fontStyle: 'bold', cellWidth: 70 },
        2: { cellWidth: 25 },
        3: { halign: 'center', cellWidth: 26 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 27 },
        5: { halign: 'center', cellWidth: 20 },
      },
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 6;
  }

  // --- 6. HISTORIAL DETALLADO DE VENTAS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`REGISTRO DE FACTURAS EMITIDAS (${sales.length} COMPROBANTES)`, margin, currentY);
  currentY += 2;

  const salesTableRows = sales.map((s) => {
    const pares = s.items?.reduce((sum, it) => sum + (it.cantidad || 0), 0) || 0;
    const fecha = new Date(s.fecha).toLocaleDateString('es-VE');
    const cliente = `${s.cliente_nombre || 'Cliente'} ${s.cliente_apellido || ''}`.trim();
    const pagosStr = s.pagos?.map((p) => p.cuenta).join(', ') || 'Efectivo';
    return [
      `#${s.numero_factura}`,
      fecha,
      cliente,
      `${pares}`,
      `$${Number(s.subtotal_usd || s.total_usd).toFixed(2)}`,
      `$${Number(s.total_usd || 0).toFixed(2)}`,
      `${Number(s.total_bs || 0).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs`,
      pagosStr,
      s.estado === 'anulada' ? 'ANULADA' : 'VÁLIDA',
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Factura', 'Fecha', 'Cliente', 'Pares', 'Subtotal', 'Total ($)', 'Total (Bs)', 'Forma de Pago', 'Estado']],
    body: salesTableRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 1.6 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 18 },
      1: { cellWidth: 18 },
      2: { cellWidth: 35 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'right', cellWidth: 18 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 25 },
      7: { cellWidth: 24 },
      8: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
    },
    didDrawPage: (data) => {
      // Pie de página
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `MAKD SHOP POS  •  Página ${doc.getNumberOfPages()}  •  Documento Administrativo de Cierre`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
    },
  });

  // @ts-ignore
  const finalY = doc.lastAutoTable.finalY;

  // Si queda espacio al final de la última página, agregar firmas
  const spaceLeft = pageHeight - finalY;
  if (spaceLeft > 32) {
    const sigY = pageHeight - 20;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.5);

    const sigWidth = 45;
    // Firma 1: Cajera / Operador
    doc.line(margin + 5, sigY, margin + 5 + sigWidth, sigY);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Cajera de Turno', margin + 5 + sigWidth / 2, sigY + 3.5, { align: 'center' });

    // Firma 2: Administración
    const sig2X = pageWidth / 2 - sigWidth / 2;
    doc.line(sig2X, sigY, sig2X + sigWidth, sigY);
    doc.text('Revisado por Administración', pageWidth / 2, sigY + 3.5, { align: 'center' });

    // Firma 3: Gerencia General
    const sig3X = pageWidth - margin - 5 - sigWidth;
    doc.line(sig3X, sigY, sig3X + sigWidth, sigY);
    doc.text('Aprobado / Gerencia', sig3X + sigWidth / 2, sigY + 3.5, { align: 'center' });
  }

  // Guardar archivo PDF con fecha
  const fileDateStr = new Date().toISOString().split('T')[0];
  doc.save(`Reporte_Ventas_Cierre_MAKD_${fileDateStr}.pdf`);
}

/**
 * Genera un Recibo o Factura individual formal en formato PDF usando jsPDF
 */
export function generateIndividualReceiptPdf(sale: Sale, exchangeRate = 68.5) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200], // Formato ticket / comprobante extendido (80mm ancho estándar)
  });

  const pageWidth = 80;
  const margin = 5;
  let y = 8;

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('MAKD SHOP', pageWidth / 2, y, { align: 'center' });

  y += 4;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('marcamos tu estilo', pageWidth / 2, y, { align: 'center' });

  y += 3.5;
  doc.text('RIF: J-50491823-1', pageWidth / 2, y, { align: 'center' });
  y += 3.2;
  doc.text('Puerto Ordaz, Alta Vista II Local 163', pageWidth / 2, y, { align: 'center' });

  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Datos de la factura
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`FACTURA #${sale.numero_factura}`, pageWidth / 2, y, { align: 'center' });

  y += 4;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${new Date(sale.fecha).toLocaleString('es-VE')}`, margin, y);
  y += 3.2;
  doc.text(`Cliente: ${sale.cliente_nombre || 'Cliente General'} ${sale.cliente_apellido || ''}`, margin, y);
  y += 3.2;
  doc.text(`C.I. / RIF: ${sale.cliente_rif || 'V-00000000'}`, margin, y);
  y += 3.2;
  doc.text(`Cajero: ${sale.usuario || 'Caja Principal'}`, margin, y);

  y += 3.5;
  doc.line(margin, y, pageWidth - margin, y);
  y += 2;

  // Tabla de Artículos
  const itemRows = (sale.items || []).map((it) => [
    `${it.cantidad}x ${it.nombre_producto} (T.${it.talla})`,
    `$${(it.cantidad * (it.precio_unitario || (it.subtotal ? it.subtotal / (it.cantidad || 1) : 0))).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Descripción / Talla', 'Total']],
    body: itemRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 6.5, cellPadding: 1.5 },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 20 },
    },
  });

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 3;

  // Totales
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const subtotal = sale.subtotal_usd || sale.total_usd;
  doc.text('Subtotal:', margin + 25, y);
  doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
  y += 3.2;

  if (sale.descuento_usd && sale.descuento_usd > 0) {
    doc.text('Descuento:', margin + 25, y);
    doc.text(`-$${sale.descuento_usd.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 3.2;
  }

  if (sale.aplica_iva && sale.iva_monto_usd && sale.iva_monto_usd > 0) {
    doc.text('IVA (16%):', margin + 25, y);
    doc.text(`+$${sale.iva_monto_usd.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 3.2;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL USD:', margin + 20, y);
  doc.text(`$${sale.total_usd.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
  y += 4;

  const totalBs = sale.total_bs || sale.total_usd * exchangeRate;
  doc.setFontSize(8);
  doc.setTextColor(67, 56, 202);
  doc.text('TOTAL BS:', margin + 20, y);
  doc.text(`${totalBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs`, pageWidth - margin, y, { align: 'right' });
  y += 4;

  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Métodos de Pago
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('MÉTODOS DE PAGO:', margin, y);
  y += 3;

  doc.setFont('helvetica', 'normal');
  (sale.pagos || []).forEach((p) => {
    doc.text(`• ${p.cuenta}:`, margin + 2, y);
    doc.text(`$${p.monto_equivalente_usd.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 3;
  });

  y += 3;
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Políticas
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('¡Gracias por su compra!', pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.text('Garantía: 7 días continuos en empaque original.', pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.text('Calzados usados no tienen cambio.', pageWidth / 2, y, { align: 'center' });

  doc.save(`Recibo_FAC_${sale.numero_factura}.pdf`);
}
