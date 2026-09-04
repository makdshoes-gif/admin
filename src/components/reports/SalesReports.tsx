import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Download,
  Printer,
  FileSpreadsheet,
  Package,
  Layers,
  Sparkles,
  PieChart,
  BarChart2,
  CheckCircle,
  Eye,
  RefreshCw,
  ShoppingBag,
  Percent,
  ArrowUpRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useStore } from '../../context/StoreContext';
import { Sale, ReportPeriod } from '../../types';
import { ReceiptModal } from '../common/ReceiptModal';
import { DailySalesChart } from './DailySalesChart';
import { GoogleSheetsSyncModal } from '../common/GoogleSheetsSyncModal';

export const SalesReports: React.FC = () => {
  const { sales, exchangeRate, products, bcvInfo, isBcvSyncing, syncBcvRate } = useStore();

  const [period, setPeriod] = useState<ReportPeriod>('este_mes');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [lastGeneratedTime, setLastGeneratedTime] = useState<string>(new Date().toLocaleTimeString());
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Filter sales by selected period
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return sales.filter((sale) => {
      const saleDate = new Date(sale.fecha);
      const saleDateStr = sale.fecha.split('T')[0];

      if (period === 'hoy') {
        return saleDateStr === todayStr;
      }

      if (period === 'ayer') {
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yestStr = yesterday.toISOString().split('T')[0];
        return saleDateStr === yestStr;
      }

      if (period === 'ultimos_7_dias') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        return saleDate >= sevenDaysAgo;
      }

      if (period === 'este_mes') {
        return (
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear()
        );
      }

      if (period === 'mes_anterior') {
        const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return (
          saleDate.getMonth() === prevMonth &&
          saleDate.getFullYear() === prevYear
        );
      }

      if (period === 'personalizado') {
        if (customStartDate && customEndDate) {
          return saleDateStr >= customStartDate && saleDateStr <= customEndDate;
        }
      }

      return true;
    });
  }, [sales, period, customStartDate, customEndDate]);

  // Aggregate Metrics
  const totalRevenueUsd = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.total_usd, 0);
  }, [filteredSales]);

  const totalRevenueBs = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.total_bs, 0);
  }, [filteredSales]);

  const totalCostUsd = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.costo_total_usd, 0);
  }, [filteredSales]);

  const netProfitUsd = totalRevenueUsd - totalCostUsd;
  const profitMarginPercent = totalRevenueUsd > 0 ? (netProfitUsd / totalRevenueUsd) * 100 : 0;

  const totalPairsSold = useMemo(() => {
    return filteredSales.reduce(
      (acc, s) => acc + s.items.reduce((sum, item) => sum + item.cantidad, 0),
      0
    );
  }, [filteredSales]);

  const averageTicketUsd = filteredSales.length > 0 ? totalRevenueUsd / filteredSales.length : 0;

  // Breakdown by Size (Curva de Tallas)
  const sizeDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        map[it.talla] = (map[it.talla] || 0) + it.cantidad;
      });
    });

    return Object.entries(map)
      .map(([talla, pares]) => ({ talla, pares }))
      .sort((a, b) => a.talla.localeCompare(b.talla));
  }, [filteredSales]);

  // Top Selling Shoes
  const topSellingShoes = useMemo(() => {
    const map: Record<string, { nombre: string; marca: string; pares: number; totalUsd: number }> = {};
    filteredSales.forEach((s) => {
      s.items.forEach((it) => {
        if (!map[it.nombre_producto]) {
          map[it.nombre_producto] = {
            nombre: it.nombre_producto,
            marca: it.marca,
            pares: 0,
            totalUsd: 0,
          };
        }
        map[it.nombre_producto].pares += it.cantidad;
        map[it.nombre_producto].totalUsd += it.subtotal;
      });
    });

    return Object.values(map).sort((a, b) => b.totalUsd - a.totalUsd);
  }, [filteredSales]);

  // Breakdown by Payment Method
  const paymentMethodBreakdown = useMemo(() => {
    const map: Record<string, { count: number; montoUsd: number }> = {};
    filteredSales.forEach((s) => {
      s.pagos.forEach((p) => {
        if (!map[p.cuenta]) {
          map[p.cuenta] = { count: 0, montoUsd: 0 };
        }
        map[p.cuenta].count += 1;
        map[p.cuenta].montoUsd += p.monto_equivalente_usd;
      });
    });

    return Object.entries(map).map(([cuenta, data]) => ({
      cuenta,
      montoUsd: data.montoUsd,
      porcentaje: totalRevenueUsd > 0 ? (data.montoUsd / totalRevenueUsd) * 100 : 0,
    }));
  }, [filteredSales, totalRevenueUsd]);

  // Automatic Executive Summary Text
  const executiveSummary = useMemo(() => {
    if (filteredSales.length === 0) {
      return 'No hay registros de ventas para el período seleccionado.';
    }

    const topProduct = topSellingShoes[0];
    const topSize = sizeDistribution.slice().sort((a, b) => b.pares - a.pares)[0];
    const topPayment = paymentMethodBreakdown.slice().sort((a, b) => b.montoUsd - a.montoUsd)[0];

    return `Durante el período analizado se registraron ${filteredSales.length} transacciones por un total de $${totalRevenueUsd.toFixed(2)} (${totalRevenueBs.toFixed(0)} Bs), despachando ${totalPairsSold} pares de calzado. El margen de ganancia neta se ubicó en un saludable ${profitMarginPercent.toFixed(1)}% (+$${netProfitUsd.toFixed(2)} libres de costo de compra). El calzado estrella fue "${topProduct?.nombre || 'N/A'}" con ${topProduct?.pares || 0} pares vendidos. En la curva de tallas, la más demandada fue la talla ${topSize?.talla || 'N/A'} con ${topSize?.pares || 0} pares. El método de pago con mayor volumen fue ${topPayment?.cuenta || 'N/A'} con un ${topPayment?.porcentaje.toFixed(1) || 0}% de los ingresos totales.`;
  }, [filteredSales, totalRevenueUsd, totalRevenueBs, totalPairsSold, profitMarginPercent, netProfitUsd, topSellingShoes, sizeDistribution, paymentMethodBreakdown]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Sales Detail
    const salesData = filteredSales.map((s) => ({
      Factura: s.numero_factura,
      Fecha: new Date(s.fecha).toLocaleString('es-VE'),
      Cliente: `${s.cliente_nombre} ${s.cliente_apellido || ''}`,
      RIF: s.cliente_rif || 'N/A',
      Pares: s.items.reduce((acc, it) => acc + it.cantidad, 0),
      Subtotal_USD: s.subtotal_usd,
      Descuento_USD: s.descuento_usd,
      IVA_USD: s.iva_monto_usd,
      Total_USD: s.total_usd,
      Total_Bs: s.total_bs,
      Costo_Total_USD: s.costo_total_usd,
      Ganancia_Neta_USD: s.ganancia_neta_usd,
      Pagos: s.pagos.map((p) => `${p.cuenta}: ${p.monto} ${p.moneda}`).join(' | '),
      Cajero: s.usuario,
    }));
    const wsSales = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, wsSales, 'Ventas');

    // Sheet 2: KPI Summary
    const summaryData = [
      { Métrica: 'Período', Valor: period.toUpperCase() },
      { Métrica: 'Ventas Totales USD', Valor: totalRevenueUsd },
      { Métrica: 'Ventas Totales Bs', Valor: totalRevenueBs },
      { Métrica: 'Costo Total de Compra (CMV)', Valor: totalCostUsd },
      { Métrica: 'Ganancia Neta USD', Valor: netProfitUsd },
      { Métrica: 'Margen de Ganancia %', Valor: `${profitMarginPercent.toFixed(2)}%` },
      { Métrica: 'Total Pares Vendidos', Valor: totalPairsSold },
      { Métrica: 'Ticket Promedio USD', Valor: averageTicketUsd },
      { Métrica: 'Cantidad de Ventas', Valor: filteredSales.length },
      { Métrica: 'Tasa BCV Aplicada', Valor: exchangeRate },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen_Financiero');

    // Sheet 3: Top Products
    const topData = topSellingShoes.map((p) => ({
      Modelo: p.nombre,
      Marca: p.marca,
      Pares_Vendidos: p.pares,
      Ingresos_USD: p.totalUsd,
    }));
    const wsTop = XLSX.utils.json_to_sheet(topData);
    XLSX.utils.book_append_sheet(wb, wsTop, 'Top_Calzados');

    XLSX.writeFile(wb, `Reporte_Ventas_MAKD_SHOP_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      
      {/* Top Banner with Automatic Refresh & Period Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900">Reportes Automáticos de Ventas</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Auto-Calculado en Vivo
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas de ingresos, utilidades, margen de ganancia, top modelos y curva de tallas generados automáticamente.
          </p>
        </div>

        {/* Action Buttons: Export to Excel & Print */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Real-time BCV Status Pill */}
          <button
            onClick={() => syncBcvRate(false)}
            disabled={isBcvSyncing}
            title="Sincronizar métricas con la última tasa oficial del BCV en tiempo real"
            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-mono font-bold">BCV: {exchangeRate.toFixed(2)} Bs</span>
            <RefreshCw className={`w-3 h-3 text-emerald-600 ${isBcvSyncing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setLastGeneratedTime(new Date().toLocaleTimeString())}
            title="Recalcular métricas"
            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="text-[11px] text-slate-500 hidden sm:inline">{lastGeneratedTime}</span>
          </button>

          <button
            id="export-excel-btn"
            onClick={handleExportExcel}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            id="export-sheets-btn"
            onClick={() => setIsSheetsModalOpen(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Sincronizar y exportar a Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Google Sheets</span>
          </button>

          <button
            id="print-report-btn"
            onClick={handlePrintReport}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Reporte</span>
          </button>
        </div>
      </div>

      {/* Period Filter Selector Pills */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
        <span className="text-xs font-medium text-slate-500 px-2 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Período:
        </span>
        
        {(
          [
            { key: 'hoy', label: 'Hoy' },
            { key: 'ayer', label: 'Ayer' },
            { key: 'ultimos_7_dias', label: 'Últimos 7 Días' },
            { key: 'este_mes', label: 'Este Mes' },
            { key: 'mes_anterior', label: 'Mes Anterior' },
            { key: 'personalizado', label: 'Rango Personalizado' },
          ] as { key: ReportPeriod; label: string }[]
        ).map((item) => (
          <button
            key={item.key}
            onClick={() => setPeriod(item.key)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              period === item.key
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}

        {period === 'personalizado' && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
            />
            <span className="text-slate-400 text-xs">a</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
            />
          </div>
        )}
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Total Revenue */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Ingresos Totales
          </span>
          <div className="text-2xl font-bold text-indigo-600 font-mono mt-1">
            ${totalRevenueUsd.toFixed(2)}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            {totalRevenueBs.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Bs
          </div>
        </div>

        {/* Cost of Goods Sold (CMV) */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Costo Mercancía (CMV)
          </span>
          <div className="text-2xl font-bold text-slate-800 font-mono mt-1">
            ${totalCostUsd.toFixed(2)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Costo de compra al mayor
          </div>
        </div>

        {/* Net Profit & Margin % */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block flex items-center justify-between">
            <span>Ganancia Neta</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 font-bold border border-emerald-200">
              {profitMarginPercent.toFixed(1)}% margen
            </span>
          </span>
          <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">
            +${netProfitUsd.toFixed(2)}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            {(netProfitUsd * exchangeRate).toFixed(0)} Bs de utilidad
          </div>
        </div>

        {/* Pairs Sold */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Pares Vendidos
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
            {totalPairsSold} <span className="text-xs font-normal text-slate-500">pares</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            En {filteredSales.length} ventas confirmadas
          </div>
        </div>

        {/* Average Ticket */}
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Ticket Promedio
          </span>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1">
            ${averageTicketUsd.toFixed(2)}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Gasto promedio por cliente
          </div>
        </div>

      </div>

      {/* Automatic Executive Summary (Diagnóstico Inteligente) */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-900">
            Diagnóstico y Resumen Ejecutivo Automático
          </h3>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          {executiveSummary}
        </p>
      </div>

      {/* Visualización de Datos con Recharts: Volumen Diario de Ventas */}
      <DailySalesChart sales={sales} exchangeRate={exchangeRate} />

      {/* Visual Analytics Grid: Curves & Top Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Curva de Tallas (Size Curve Distribution) - 6 cols */}
        <div className="lg:col-span-6 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">Curva de Tallas Vendidas</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              Total: {totalPairsSold} pares
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Indica la demanda exacta por número de pie para orientar las compras de reposición en la zapatería.
          </p>

          {sizeDistribution.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No hay suficientes datos de tallas en este período.
            </div>
          ) : (
            <div className="space-y-2">
              {sizeDistribution.map((item) => {
                const maxPairs = Math.max(...sizeDistribution.map((s) => s.pares), 1);
                const percent = (item.pares / maxPairs) * 100;
                return (
                  <div key={item.talla} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono font-bold text-slate-800">Talla {item.talla}</span>
                      <span className="font-mono text-indigo-600 font-semibold">
                        {item.pares} {item.pares === 1 ? 'par' : 'pares'}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top 5 Best Selling Shoes - 6 cols */}
        <div className="lg:col-span-6 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm text-slate-900">Top Modelos de Calzado</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">Por facturación</span>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Zapatos con mayor volumen de ventas e ingresos durante el período.
          </p>

          {topSellingShoes.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No hay ventas registradas en este período.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topSellingShoes.slice(0, 5).map((item, idx) => {
                const sharePercent = totalRevenueUsd > 0 ? (item.totalUsd / totalRevenueUsd) * 100 : 0;
                return (
                  <div
                    key={item.nombre}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">{item.nombre}</div>
                        <div className="text-[10px] text-slate-500">
                          {item.marca} • {item.pares} {item.pares === 1 ? 'par vendido' : 'pares vendidos'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-xs text-emerald-600">
                        ${item.totalUsd.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {sharePercent.toFixed(1)}% del total
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Payment Methods Breakdown */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Cobranza por Métodos de Pago</h3>
          </div>
          <span className="text-[11px] text-slate-500">Desglose de liquidez multimoneda</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {paymentMethodBreakdown.map((pm) => (
            <div key={pm.cuenta} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-500 block truncate">
                {pm.cuenta}
              </span>
              <div className="text-base font-bold font-mono text-slate-900 mt-1">
                ${pm.montoUsd.toFixed(2)}
              </div>
              <div className="text-[10px] font-semibold text-indigo-600 mt-0.5">
                {pm.porcentaje.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Sales History Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Historial de Ventas del Período ({filteredSales.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Total recaudado: <span className="font-bold text-indigo-600 font-mono">${totalRevenueUsd.toFixed(2)}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Factura #</th>
                <th className="py-2.5 px-3 font-semibold">Fecha</th>
                <th className="py-2.5 px-4 font-semibold">Cliente</th>
                <th className="py-2.5 px-4 font-semibold">Calzado Comprado</th>
                <th className="py-2.5 px-3 text-right font-semibold">Total ($)</th>
                <th className="py-2.5 px-3 text-right font-semibold">Total (Bs)</th>
                <th className="py-2.5 px-3 text-right font-semibold">Ganancia ($)</th>
                <th className="py-2.5 px-3 font-semibold">Forma de Pago</th>
                <th className="py-2.5 px-4 text-center font-semibold">Recibo</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No hay ventas registradas en el período seleccionado.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">
                      #{sale.numero_factura}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                      {new Date(sale.fecha).toLocaleString('es-VE', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">
                        {sale.cliente_nombre} {sale.cliente_apellido || ''}
                      </div>
                      {sale.cliente_rif && (
                        <div className="text-[10px] text-slate-400">{sale.cliente_rif}</div>
                      )}
                    </td>

                    <td className="py-2.5 px-4">
                      <div className="space-y-0.5">
                        {sale.items.map((it, i) => (
                          <div key={i} className="text-[11px] text-slate-700">
                            {it.cantidad}x {it.nombre_producto} <span className="text-slate-400">(T:{it.talla})</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      ${sale.total_usd.toFixed(2)}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-slate-500 text-[11px]">
                      {sale.total_bs.toFixed(0)} Bs
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">
                      +${sale.ganancia_neta_usd.toFixed(2)}
                    </td>

                    <td className="py-2.5 px-3 text-[11px]">
                      {sale.pagos.map((p, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 mr-1 mb-0.5 font-mono text-[10px] text-slate-700"
                        >
                          {p.cuenta}
                        </span>
                      ))}
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedSaleForReceipt(sale)}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Ver Comprobante / Imprimir"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        sale={selectedSaleForReceipt}
        onClose={() => setSelectedSaleForReceipt(null)}
      />

      {/* Google Sheets Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        periodLabel={`Ventas ${period.toUpperCase()}`}
      />
    </div>
  );
};
