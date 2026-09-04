import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Expense, ExpenseCategory, Currency } from '../../types';
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  PlusCircle,
  Search,
  Filter,
  Trash2,
  Calendar,
  Building,
  Tag,
  CreditCard,
  FileText,
  PieChart,
  Download,
  AlertCircle,
  X,
  CheckCircle2,
  Receipt,
  Scale
} from 'lucide-react';

const CATEGORIES: ExpenseCategory[] = [
  'Alquiler de Local',
  'Nómina y Sueldos',
  'Servicios Públicos (Luz/Agua/Internet)',
  'Fletes y Transporte',
  'Compra de Mercancía / Proveedores',
  'Empaques, Bolsas y Cajas',
  'Publicidad y Redes Sociales',
  'Mantenimiento y Reparaciones',
  'Impuestos y Tasas Municipales',
  'Comisiones y Gastos Bancarios',
  'Otros Gastos Operativos',
];

export const ExpensesManager: React.FC = () => {
  const { expenses, addExpense, deleteExpense, sales, exchangeRate, accounts } = useStore();

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('este_mes'); // 'este_mes' | 'mes_anterior' | 'todo'
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const todayIso = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(todayIso);
  const [categoria, setCategoria] = useState<ExpenseCategory>('Alquiler de Local');
  const [descripcion, setDescripcion] = useState('');
  const [beneficiario, setBeneficiario] = useState('');
  const [cuentaOrigen, setCuentaOrigen] = useState(accounts[0]?.nombre || 'Efectivo USD');
  const [moneda, setMoneda] = useState<Currency>('USD');
  const [montoInput, setMontoInput] = useState('');
  const [comprobanteRef, setComprobanteRef] = useState('');
  const [notas, setNotas] = useState('');
  const [formError, setFormError] = useState('');

  // Month date range helpers
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Filtered sales according to selected period
  const periodSales = useMemo(() => {
    return sales.filter((s) => {
      const saleDate = s.fecha.split('T')[0];
      if (selectedPeriod === 'este_mes') {
        return saleDate.startsWith(currentMonthStr);
      } else if (selectedPeriod === 'mes_anterior') {
        return saleDate.startsWith(lastMonthStr);
      }
      return true;
    });
  }, [sales, selectedPeriod, currentMonthStr, lastMonthStr]);

  // Filtered expenses according to period and search
  const periodExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (selectedPeriod === 'este_mes') {
        return e.fecha.startsWith(currentMonthStr);
      } else if (selectedPeriod === 'mes_anterior') {
        return e.fecha.startsWith(lastMonthStr);
      }
      return true;
    });
  }, [expenses, selectedPeriod, currentMonthStr, lastMonthStr]);

  const displayedExpenses = useMemo(() => {
    return periodExpenses.filter((e) => {
      const matchCat = selectedCategory === 'todas' || e.categoria === selectedCategory;
      const term = searchTerm.toLowerCase();
      const matchSearch =
        e.descripcion.toLowerCase().includes(term) ||
        (e.beneficiario && e.beneficiario.toLowerCase().includes(term)) ||
        (e.comprobante_ref && e.comprobante_ref.toLowerCase().includes(term)) ||
        e.cuenta_origen.toLowerCase().includes(term);
      return matchCat && matchSearch;
    });
  }, [periodExpenses, selectedCategory, searchTerm]);

  // Financial Metrics (Fin de Mes / Profit & Loss)
  const totalIngresosUsd = useMemo(() => {
    return periodSales.reduce((sum, s) => sum + s.total_usd, 0);
  }, [periodSales]);

  const totalIngresosBs = useMemo(() => {
    return periodSales.reduce((sum, s) => sum + s.total_bs, 0);
  }, [periodSales]);

  const costoMercanciaUsd = useMemo(() => {
    return periodSales.reduce((sum, s) => sum + (s.costo_total_usd || 0), 0);
  }, [periodSales]);

  const totalGastosUsd = useMemo(() => {
    return periodExpenses.reduce((sum, e) => sum + e.monto_usd, 0);
  }, [periodExpenses]);

  const totalGastosBs = useMemo(() => {
    return periodExpenses.reduce((sum, e) => sum + e.monto_bs, 0);
  }, [periodExpenses]);

  // Utilidad Bruta = Ingresos - Costo Mercancía
  const utilidadBrutaUsd = totalIngresosUsd - costoMercanciaUsd;
  
  // Utilidad Neta (Cuánto va quedando en fin de mes) = Utilidad Bruta - Gastos Operativos
  const utilidadNetaUsd = utilidadBrutaUsd - totalGastosUsd;
  const utilidadNetaBs = utilidadNetaUsd * exchangeRate;

  const margenNeto = totalIngresosUsd > 0 ? (utilidadNetaUsd / totalIngresosUsd) * 100 : 0;

  // Breakdown by category
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    periodExpenses.forEach((e) => {
      map[e.categoria] = (map[e.categoria] || 0) + e.monto_usd;
    });
    return Object.entries(map)
      .map(([cat, amount]) => ({
        categoria: cat,
        monto_usd: amount,
        porcentaje: totalGastosUsd > 0 ? (amount / totalGastosUsd) * 100 : 0,
      }))
      .sort((a, b) => b.monto_usd - a.monto_usd);
  }, [periodExpenses, totalGastosUsd]);

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const numMonto = parseFloat(montoInput);
    if (isNaN(numMonto) || numMonto <= 0) {
      setFormError('Por favor ingrese un monto numérico válido mayor a cero.');
      return;
    }

    if (!descripcion.trim()) {
      setFormError('La descripción del gasto es obligatoria.');
      return;
    }

    let montoUsd = 0;
    let montoBs = 0;

    if (moneda === 'USD') {
      montoUsd = numMonto;
      montoBs = numMonto * exchangeRate;
    } else {
      montoBs = numMonto;
      montoUsd = numMonto / exchangeRate;
    }

    addExpense({
      fecha,
      categoria,
      descripcion: descripcion.trim(),
      beneficiario: beneficiario.trim() || undefined,
      cuenta_origen: cuentaOrigen,
      moneda,
      monto: numMonto,
      tasa_cambio: exchangeRate,
      monto_usd: Number(montoUsd.toFixed(2)),
      monto_bs: Number(montoBs.toFixed(2)),
      comprobante_ref: comprobanteRef.trim() || undefined,
      registrado_por: 'Admin / Gerencia',
      notas: notas.trim() || undefined,
    });

    // Reset Form
    setDescripcion('');
    setBeneficiario('');
    setMontoInput('');
    setComprobanteRef('');
    setNotas('');
    setIsModalOpen(false);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Fecha', 'Categoría', 'Descripción', 'Beneficiario', 'Cuenta', 'Moneda', 'Monto Original', 'Monto USD', 'Monto Bs', 'Comprobante', 'Notas'];
    const rows = displayedExpenses.map((e) => [
      e.fecha,
      `"${e.categoria}"`,
      `"${e.descripcion.replace(/"/g, '""')}"`,
      `"${(e.beneficiario || '').replace(/"/g, '""')}"`,
      `"${e.cuenta_origen}"`,
      e.moneda,
      e.monto,
      e.monto_usd,
      e.monto_bs,
      `"${e.comprobante_ref || ''}"`,
      `"${(e.notas || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gastos_makd_shop_${selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const periodLabel = selectedPeriod === 'este_mes' 
    ? 'Mes Actual (Septiembre 2026)' 
    : selectedPeriod === 'mes_anterior' 
      ? 'Mes Anterior (Agosto 2026)' 
      : 'Histórico Total';

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-600">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Control de Gastos & Fin de Mes
              </h1>
              <p className="text-xs text-slate-500">
                Registra los costos operativos, nóminas, alquiler y calcula con exactitud cuánto se hizo y cuánto va quedando.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Period Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setSelectedPeriod('este_mes')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedPeriod === 'este_mes'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mes Actual
            </button>
            <button
              onClick={() => setSelectedPeriod('mes_anterior')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedPeriod === 'mes_anterior'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mes Anterior
            </button>
            <button
              onClick={() => setSelectedPeriod('todo')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                selectedPeriod === 'todo'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todo
            </button>
          </div>

          <button
            id="btn-nuevo-gasto"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards: ¿Cuánto se hizo, cuánto se gastó, cuánto va quedando? */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingresos (Ventas) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              1. Cuánto se Hizo (Ventas)
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              ${totalIngresosUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-500 font-medium ml-1">USD</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>{totalIngresosBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</span>
            <span className="text-slate-400">({periodSales.length} ventas)</span>
          </div>
        </div>

        {/* Costo de Calzado Vendido */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              2. Costo Mercancía (COGS)
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">
              ${costoMercanciaUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-500 font-medium ml-1">USD</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>Margen Bruto: ${(totalIngresosUsd - costoMercanciaUsd).toFixed(2)} USD</span>
            <span className="text-amber-600 font-medium">Costo de compra</span>
          </div>
        </div>

        {/* Gastos Operativos Totales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              3. Cuánto se Gastó
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-rose-600">
              ${totalGastosUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-rose-500 font-medium ml-1">USD</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>{totalGastosBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</span>
            <span className="text-rose-600 font-medium">{periodExpenses.length} egresos</span>
          </div>
        </div>

        {/* Utilidad Neta: Cuánto va quedando en fin de mes */}
        <div className={`p-5 rounded-xl border shadow-xs ${
          utilidadNetaUsd >= 0
            ? 'bg-gradient-to-br from-emerald-50 to-teal-50/40 border-emerald-200'
            : 'bg-gradient-to-br from-rose-50 to-orange-50/40 border-rose-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              4. Cuánto va Quedando (Neto)
            </span>
            <div className={`p-2 rounded-lg ${utilidadNetaUsd >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-black ${utilidadNetaUsd >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {utilidadNetaUsd >= 0 ? '+' : ''}${utilidadNetaUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-semibold text-slate-600 ml-1">USD</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs font-medium">
            <span className="text-slate-600">
              {utilidadNetaBs >= 0 ? '+' : ''}{utilidadNetaBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              utilidadNetaUsd >= 0 ? 'bg-emerald-200/60 text-emerald-800' : 'bg-rose-200/60 text-rose-800'
            }`}>
              {utilidadNetaUsd >= 0 ? `Ganancia ${margenNeto.toFixed(1)}%` : 'Déficit temporal'}
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown by Category & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category distribution bar */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Desglose de Gastos por Rubro
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {periodLabel}
            </span>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No hay gastos registrados en este período.
            </div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((item) => (
                <div key={item.categoria} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[170px]" title={item.categoria}>
                      {item.categoria}
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">${item.monto_usd.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 ml-1">({item.porcentaje.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, item.porcentaje)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span>Total Gastos ({periodLabel}):</span>
              <span className="text-rose-600 font-bold">${totalGastosUsd.toFixed(2)} USD</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Tasa oficial aplicada: <span className="font-medium text-slate-800">{exchangeRate.toFixed(2)} Bs/USD</span>
            </p>
          </div>
        </div>

        {/* Expenses Table with Filters */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Listado de Egresos y Gastos ({displayedExpenses.length})
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportCsv}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors"
                title="Descargar lista en CSV / Excel"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Search and Category Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por descripción, beneficiario o ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
              >
                <option value="todas">Todas las categorías</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Fecha</th>
                  <th className="py-2.5 px-3 font-semibold">Rubro / Categoría</th>
                  <th className="py-2.5 px-3 font-semibold">Concepto & Beneficiario</th>
                  <th className="py-2.5 px-3 font-semibold">Cuenta de Origen</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Monto</th>
                  <th className="py-2.5 px-2 font-semibold text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No se encontraron registros de gastos para los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  displayedExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800">
                        {exp.fecha}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {exp.categoria}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-[200px]">
                        <p className="font-semibold text-slate-900 truncate" title={exp.descripcion}>
                          {exp.descripcion}
                        </p>
                        {exp.beneficiario && (
                          <p className="text-[11px] text-slate-500 truncate" title={exp.beneficiario}>
                            Para: {exp.beneficiario}
                          </p>
                        )}
                        {exp.comprobante_ref && (
                          <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1 rounded">
                            Ref: {exp.comprobante_ref}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-slate-700 font-medium">{exp.cuenta_origen}</span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          ${exp.monto_usd.toFixed(2)} USD
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {exp.monto_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Seguro que desea eliminar el gasto "${exp.descripcion}"?`)) {
                              deleteExpense(exp.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Eliminar gasto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Registrar Nuevo Gasto */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-rose-500/20 text-rose-300 rounded-lg">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Registrar Nuevo Gasto Operativo</h3>
                  <p className="text-[11px] text-slate-400">
                    Se deducirá del balance y se guardará en Neon PostgreSQL
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha del Gasto *
                  </label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rubro / Categoría *
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as ExpenseCategory)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción o Concepto del Gasto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pago de alquiler sabana grande / Quincena cajera / Factura luz"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Beneficiario / Proveedor
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Corpoelec / María Pérez / Tealca"
                    value={beneficiario}
                    onChange={(e) => setBeneficiario(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cuenta de Pago (Salida) *
                  </label>
                  <select
                    value={cuentaOrigen}
                    onChange={(e) => setCuentaOrigen(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.nombre}>
                        {acc.nombre} ({acc.moneda})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Monto y Moneda */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Monto a Pagar *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <select
                      value={moneda}
                      onChange={(e) => setMoneda(e.target.value as Currency)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="Bs">Bs (Bolívares)</option>
                    </select>
                  </div>
                  <div className="col-span-2 relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      placeholder="0.00"
                      value={montoInput}
                      onChange={(e) => setMontoInput(e.target.value)}
                      className="w-full text-sm font-bold p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 pl-7"
                    />
                    <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-bold">
                      {moneda === 'USD' ? '$' : 'Bs'}
                    </span>
                  </div>
                </div>

                {/* Equivalencia en tiempo real */}
                {parseFloat(montoInput) > 0 && (
                  <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 flex items-center justify-between">
                    <span>Equivalente al cambio ({exchangeRate.toFixed(2)} Bs/USD):</span>
                    <span className="font-bold text-indigo-700">
                      {moneda === 'USD'
                        ? `${(parseFloat(montoInput) * exchangeRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs`
                        : `$${(parseFloat(montoInput) / exchangeRate).toFixed(2)} USD`}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N° Comprobante / Factura / Ref
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: FAC-9901 / 481920"
                    value={comprobanteRef}
                    onChange={(e) => setComprobanteRef(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notas adicionales
                  </label>
                  <input
                    type="text"
                    placeholder="Observaciones..."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
