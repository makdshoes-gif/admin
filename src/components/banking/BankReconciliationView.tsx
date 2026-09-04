import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { BankMovement, NeonTableInfo } from '../../types';
import {
  fetchNeonTablesList,
  fetchNeonTableContent,
  checkNeonDbStatus
} from '../../services/api';
import {
  Landmark,
  Database,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  PlusCircle,
  Table,
  ArrowDownLeft,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  X,
  FileSpreadsheet
} from 'lucide-react';

export const BankReconciliationView: React.FC = () => {
  const { bankMovements, addBankMovement, updateBankMovement, sales, expenses, exchangeRate } = useStore();

  // Navigation subtabs inside reconciliation
  const [activeSubTab, setActiveSubTab] = useState<'reconciliation' | 'neon_explorer'>('reconciliation');

  // Neon DB state
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message: string; databaseName?: string } | null>(null);
  const [tablesList, setTablesList] = useState<NeonTableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<{
    tableName: string;
    rowCount: number;
    columns: string[];
    rows: any[];
  } | null>(null);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

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

  // Load Neon status and tables
  const loadNeonInfo = async () => {
    setIsLoadingTables(true);
    try {
      const status = await checkNeonDbStatus();
      setDbStatus(status);
      const tables = await fetchNeonTablesList();
      setTablesList(tables);
      if (tables.length > 0 && !selectedTable) {
        // Look for bank-related table or first table
        const bankTable = tables.find(t => 
          t.table_name.includes('banc') || 
          t.table_name.includes('concilia') || 
          t.table_name.includes('movim') ||
          t.table_name === 'bank_reconciliations'
        );
        const targetTable = bankTable ? bankTable.table_name : tables[0].table_name;
        setSelectedTable(targetTable);
        loadTableRows(targetTable);
      }
    } catch (err) {
      console.error('Error loading Neon data:', err);
    } finally {
      setIsLoadingTables(false);
    }
  };

  const loadTableRows = async (tableName: string) => {
    if (!tableName) return;
    setIsLoadingData(true);
    try {
      const data = await fetchNeonTableContent(tableName, 50);
      setTableData(data);
    } catch (err) {
      console.error('Error loading rows:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadNeonInfo();
  }, []);

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
              Conciliación Bancaria & Datos de Neon
            </h1>
            <p className="text-xs text-slate-500">
              Visualiza tus tablas previas de Neon, concilia cuentas bancarias (BDV, Banesco) y cruza pagos con tus ventas y gastos.
            </p>
          </div>
        </div>

        {/* Subtabs selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('reconciliation')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors ${
              activeSubTab === 'reconciliation'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Conciliación Bancaria</span>
          </button>
          <button
            onClick={() => {
              setActiveSubTab('neon_explorer');
              if (!tableData && selectedTable) {
                loadTableRows(selectedTable);
              }
            }}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-colors ${
              activeSubTab === 'neon_explorer'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-indigo-600" />
            <span>Explorador de Tablas Neon</span>
            {tablesList.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-indigo-100 text-indigo-700 rounded-full font-bold">
                {tablesList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Connection Info Banner: Explains how it connects to their existing Neon DB */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-xl shadow-xs border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm">¿Cómo se conecta tu información previa de Neon?</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                dbStatus?.connected ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
              }`}>
                {dbStatus?.connected ? 'Conectado a Neon' : 'Modo Local / Fallback'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Tu base de datos en Neon PostgreSQL no se sobreescribe ni se borra. Al colocar tu variable <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300 font-mono text-[11px]">DATABASE_URL</code> en los Secrets o entorno de Vercel, la aplicación lee tus tablas existentes y sincroniza ventas, gastos y conciliaciones en tiempo real.
            </p>
          </div>
        </div>

        <button
          onClick={loadNeonInfo}
          disabled={isLoadingTables}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-700 shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTables ? 'animate-spin' : ''}`} />
          <span>Actualizar Conexión</span>
        </button>
      </div>

      {/* SUBTAB 1: RECONCILIATION DASHBOARD */}
      {activeSubTab === 'reconciliation' && (
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

            <div className="flex items-center space-x-2">
              <button
                onClick={handleAutoReconcile}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="Cruce automático de referencias con las ventas registradas"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Conciliar Automático</span>
              </button>

              <button
                onClick={() => setIsNewMovModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Registrar Movimiento</span>
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
      )}

      {/* SUBTAB 2: NEON DATABASE EXPLORER */}
      {activeSubTab === 'neon_explorer' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span>Explorador de Tablas en tu Base de Datos Neon</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecciona cualquiera de las tablas existentes en tu Neon para consultar sus filas, montos de conciliación y registros guardados.
                </p>
              </div>

              {/* Table Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                  Tabla a consultar:
                </span>
                <select
                  value={selectedTable}
                  onChange={(e) => {
                    setSelectedTable(e.target.value);
                    loadTableRows(e.target.value);
                  }}
                  className="text-xs font-semibold p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  {tablesList.map((t) => (
                    <option key={t.table_name} value={t.table_name}>
                      {t.table_name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => loadTableRows(selectedTable)}
                  disabled={isLoadingData || !selectedTable}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors"
                  title="Recargar filas"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Table Meta Info */}
            {tableData && (
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div>
                  Tabla activa: <span className="font-bold text-indigo-700 font-mono">{tableData.tableName}</span> | Columnas: <span className="font-semibold">{tableData.columns.length}</span>
                </div>
                <div>
                  Registros en Neon: <span className="font-bold text-slate-900">{tableData.rowCount}</span> (mostrando hasta 50 filas)
                </div>
              </div>
            )}

            {/* Table Search */}
            {tableData && tableData.rows.length > 0 && (
              <div className="relative max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar datos en pantalla..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
            )}

            {/* Table Content */}
            {isLoadingData ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                <span>Consultando datos en Neon PostgreSQL...</span>
              </div>
            ) : !tableData || tableData.rows.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                No hay filas registradas aún en la tabla <span className="font-mono font-semibold">{selectedTable}</span>.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[450px] border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      {tableData.columns.map((col) => (
                        <th key={col} className="py-2.5 px-3 font-bold whitespace-nowrap font-mono">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {tableData.rows
                      .filter((r) => {
                        if (!tableSearch) return true;
                        return JSON.stringify(r).toLowerCase().includes(tableSearch.toLowerCase());
                      })
                      .map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          {tableData.columns.map((col) => {
                            const val = row[col];
                            const displayVal =
                              val === null || val === undefined
                                ? '-'
                                : typeof val === 'object'
                                ? JSON.stringify(val)
                                : String(val);
                            return (
                              <td key={col} className="py-2 px-3 whitespace-nowrap max-w-[220px] truncate text-[11px]">
                                {displayVal}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
};
