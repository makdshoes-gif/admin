import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { BankMovement } from '../../types';
import {
  Landmark,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  X,
  FileSpreadsheet,
  UploadCloud
} from 'lucide-react';
import { BdvFileImportModal } from './BdvFileImportModal';
import { GoogleSheetsSyncModal } from '../common/GoogleSheetsSyncModal';

export const BankReconciliationView: React.FC = () => {
  const { bankMovements, addBankMovement, updateBankMovement, sales, expenses, exchangeRate } = useStore();

  const [isBdvModalOpen, setIsBdvModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Bank reconciliation filters
  const [bankFilter, setBankFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [movSearch, setMovSearch] = useState('');
  const [isNewMovModalOpen, setIsNewMovModalOpen] = useState(false);

  // New Movement Form State
  const todayIso = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(todayIso);
  const [banco, setBanco] = useState('Banco de Venezuela (0102)');
  const [tipo, setTipo] = useState<'credito_ingreso' | 'debito_egreso'>('credito_ingreso');
  const [referencia, setReferencia] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [montoBs, setMontoBs] = useState('');
  const [notas, setNotas] = useState('');

  // Filtered bank movements
  const filteredMovements = useMemo(() => {
    return bankMovements.filter((m) => {
      const matchBank = bankFilter === 'todos' || m.banco.includes(bankFilter);
      const matchStatus = statusFilter === 'todos' || m.estado_conciliacion === statusFilter;
      const term = movSearch.toLowerCase();
      const matchSearch =
        m.referencia.toLowerCase().includes(term) ||
        m.descripcion.toLowerCase().includes(term) ||
        m.banco.toLowerCase().includes(term);
      return matchBank && matchStatus && matchSearch;
    });
  }, [bankMovements, bankFilter, statusFilter, movSearch]);

  // Reconciliation Metrics
  const totalCreditosBs = useMemo(() => {
    return bankMovements
      .filter((m) => m.tipo === 'credito_ingreso')
      .reduce((sum, m) => sum + m.monto_bs, 0);
  }, [bankMovements]);

  const totalDebitosBs = useMemo(() => {
    return bankMovements
      .filter((m) => m.tipo === 'debito_egreso')
      .reduce((sum, m) => sum + m.monto_bs, 0);
  }, [bankMovements]);

  const totalConciliadoBs = useMemo(() => {
    return bankMovements
      .filter((m) => m.estado_conciliacion === 'conciliado')
      .reduce((sum, m) => sum + m.monto_bs, 0);
  }, [bankMovements]);

  const totalPendienteBs = useMemo(() => {
    return bankMovements
      .filter((m) => m.estado_conciliacion === 'pendiente')
      .reduce((sum, m) => sum + m.monto_bs, 0);
  }, [bankMovements]);

  // Auto-reconciliation algorithm: match bank movements with POS sales references
  const handleAutoReconcile = () => {
    let reconciledCount = 0;
    bankMovements.forEach((mov) => {
      if (mov.estado_conciliacion === 'pendiente') {
        // Find matching sale by reference
        const matchingSale = sales.find((s) =>
          s.pagos.some((p) => p.referencia && p.referencia.trim() === mov.referencia.trim())
        );

        // Or matching expense by reference
        const matchingExpense = expenses.find(
          (e) => e.comprobante_ref && e.comprobante_ref.trim() === mov.referencia.trim()
        );

        if (matchingSale) {
          updateBankMovement(mov.id, {
            estado_conciliacion: 'conciliado',
            vinculado_tipo: 'venta',
            vinculado_id: matchingSale.id,
            notas: `Conciliado automáticamente con Venta Factura N° ${matchingSale.numero_factura}`,
          });
          reconciledCount++;
        } else if (matchingExpense) {
          updateBankMovement(mov.id, {
            estado_conciliacion: 'conciliado',
            vinculado_tipo: 'gasto',
            vinculado_id: matchingExpense.id,
            notas: `Conciliado automáticamente con Gasto: ${matchingExpense.descripcion}`,
          });
          reconciledCount++;
        }
      }
    });

    if (reconciledCount > 0) {
      alert(`✅ Conciliación completada: Se cruzaron y cuadraron ${reconciledCount} movimiento(s) bancario(s).`);
    } else {
      alert('ℹ️ No se encontraron nuevas coincidencias exactas de referencia entre las ventas/gastos y los movimientos pendientes.');
    }
  };

  // Submit new movement
  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(montoBs);
    if (isNaN(monto) || monto <= 0 || !referencia.trim() || !descripcion.trim()) {
      alert('Por favor complete todos los campos requeridos con valores válidos.');
      return;
    }

    const usdVal = Number((monto / exchangeRate).toFixed(2));

    addBankMovement({
      fecha,
      banco,
      tipo,
      referencia: referencia.trim(),
      descripcion: descripcion.trim(),
      monto_bs: monto,
      monto_usd: usdVal,
      estado_conciliacion: 'pendiente',
      notas: notas.trim() || undefined,
    });

    setReferencia('');
    setDescripcion('');
    setMontoBs('');
    setNotas('');
    setIsNewMovModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Conciliación Bancaria
            </h1>
            <p className="text-xs text-slate-500">
              Concilia cuentas bancarias (Banco de Venezuela, Banesco, etc.), carga tus estados de cuenta oficiales y cruza pagos automáticamente con tus ventas.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsSheetsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Sheets</span>
          </button>

          <button
            onClick={() => setIsBdvModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Importar Archivo BDV</span>
          </button>

          <button
            onClick={() => setIsNewMovModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </div>

      {/* RECONCILIATION DASHBOARD */}
      <div className="space-y-6">
          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                <span>Créditos / Ingresos Banco</span>
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-slate-900">
                  {totalCreditosBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                ≈ ${(totalCreditosBs / exchangeRate).toFixed(2)} USD
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
                <span>Débitos / Pagos Emitidos</span>
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-md">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-slate-900">
                  {totalDebitosBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                ≈ ${(totalDebitosBs / exchangeRate).toFixed(2)} USD
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold uppercase">
                <span>Total Conciliado</span>
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-emerald-800">
                  {totalConciliadoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                </span>
              </div>
              <p className="text-[11px] text-emerald-600 mt-1">
                Verificados y cuadrados con POS/Gastos
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <div className="flex items-center justify-between text-amber-700 text-xs font-semibold uppercase">
                <span>Pendiente por Conciliar</span>
                <div className="p-1.5 bg-amber-100 text-amber-700 rounded-md">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold text-amber-800">
                  {totalPendienteBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                </span>
              </div>
              <p className="text-[11px] text-amber-600 mt-1">
                Requiere cruce con factura o referencia
              </p>
            </div>
          </div>

          {/* Action Bar & Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px] flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por referencia, banco o descripción..."
                  value={movSearch}
                  onChange={(e) => setMovSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <select
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="todos">Todos los Bancos</option>
                <option value="Venezuela">Banco de Venezuela (BDV)</option>
                <option value="Banesco">Banesco</option>
                <option value="Mercantil">Mercantil</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                <option value="todos">Todos los Estados</option>
                <option value="conciliado">Conciliados</option>
                <option value="pendiente">Pendientes</option>
                <option value="discrepancia">Discrepancias</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsBdvModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Subir archivo o pegar estado de cuenta de Banco de Venezuela (0102)"
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Subir Formato BDV</span>
              </button>

              <button
                onClick={() => setIsSheetsModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Sincronizar conciliación bancaria y balance con Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Google Sheets</span>
              </button>

              <button
                onClick={handleAutoReconcile}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Cruce automático de referencias con las ventas registradas"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Conciliar</span>
              </button>

              <button
                onClick={() => setIsNewMovModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Registrar Manual</span>
              </button>
            </div>
          </div>

          {/* Movements Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Fecha</th>
                    <th className="py-3 px-4 font-semibold">Banco</th>
                    <th className="py-3 px-4 font-semibold">Tipo</th>
                    <th className="py-3 px-4 font-semibold">Referencia</th>
                    <th className="py-3 px-4 font-semibold">Descripción & Cruce</th>
                    <th className="py-3 px-4 font-semibold text-right">Monto (Bs)</th>
                    <th className="py-3 px-4 font-semibold text-right">Equiv. (USD)</th>
                    <th className="py-3 px-4 font-semibold text-center">Estado</th>
                    <th className="py-3 px-4 font-semibold text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No hay movimientos bancarios que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((mov) => {
                      const isIngreso = mov.tipo === 'credito_ingreso';
                      const isConciliado = mov.estado_conciliacion === 'conciliado';
                      return (
                        <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                            {mov.fecha}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                            {mov.banco}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              isIngreso ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {isIngreso ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              <span>{isIngreso ? 'Crédito / Abono' : 'Débito / Cargo'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                            {mov.referencia}
                          </td>
                          <td className="py-3 px-4 max-w-[240px]">
                            <p className="font-medium text-slate-800 truncate" title={mov.descripcion}>
                              {mov.descripcion}
                            </p>
                            {mov.notas && (
                              <p className="text-[11px] text-emerald-600 truncate" title={mov.notas}>
                                {mov.notas}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                            {isIngreso ? '+' : '-'}{mov.monto_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-500 whitespace-nowrap">
                            ${mov.monto_usd ? mov.monto_usd.toFixed(2) : (mov.monto_bs / exchangeRate).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isConciliado
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : mov.estado_conciliacion === 'discrepancia'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {isConciliado ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Conciliado</span>
                                </>
                              ) : mov.estado_conciliacion === 'discrepancia' ? (
                                <>
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  <span>Discrepancia</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Pendiente</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                const nextState = isConciliado ? 'pendiente' : 'conciliado';
                                updateBankMovement(mov.id, {
                                  estado_conciliacion: nextState,
                                  notas: nextState === 'conciliado' ? 'Marcado como conciliado manualmente' : undefined
                                });
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                                isConciliado
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {isConciliado ? 'Desmarcar' : 'Validar'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      {/* Modal: Registrar Movimiento Bancario */}
      {isNewMovModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Landmark className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm">Registrar Movimiento Bancario</h3>
              </div>
              <button
                onClick={() => setIsNewMovModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMovement} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Banco</label>
                  <select
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Banco de Venezuela (0102)">Banco de Venezuela (0102)</option>
                    <option value="Banesco (0134)">Banesco (0134)</option>
                    <option value="Mercantil (0105)">Mercantil (0105)</option>
                    <option value="BBVA Provincial (0108)">BBVA Provincial (0108)</option>
                    <option value="Bancaribe (0114)">Bancaribe (0114)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Movimiento</label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as 'credito_ingreso' | 'debito_egreso')}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="credito_ingreso">+ Crédito / Ingreso (Pago Móvil / Abono)</option>
                    <option value="debito_egreso">- Débito / Egreso (Pago / Comisión)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N° Referencia Bancaria *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 481920"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-indigo-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción o Concepto del Banco *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: PAGO MOVIL C2P / TRANSFERENCIA CLIENTE"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monto en Bolívares (Bs) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder="0.00"
                    value={montoBs}
                    onChange={(e) => setMontoBs(e.target.value)}
                    className="w-full text-sm font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg pl-8"
                  />
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">Bs</span>
                </div>
                {parseFloat(montoBs) > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Equivalente: <span className="font-bold text-slate-800">${(parseFloat(montoBs) / exchangeRate).toFixed(2)} USD</span> al cambio BCV ({exchangeRate.toFixed(2)} Bs/USD).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notas internas</label>
                <input
                  type="text"
                  placeholder="Observación opcional..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewMovModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BDV Import Modal */}
      <BdvFileImportModal
        isOpen={isBdvModalOpen}
        onClose={() => setIsBdvModalOpen(false)}
      />

      {/* Google Sheets Sync Modal */}
      <GoogleSheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        periodLabel="Conciliación BDV & Movimientos"
      />
    </div>
  );
};
