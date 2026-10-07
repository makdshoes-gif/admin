import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  FileSpreadsheet,
  Printer,
  Plus,
  Filter,
  Search,
  FileText,
  Edit2,
  Trash2,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRightLeft,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BarChart3,
  BookmarkCheck
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { AccountingRecord, AccountingJournalLine, AccountingOperationType } from '../../types';
import { 
  formatDateDisplay, 
  exportLedgerToExcel, 
  printAccountingVoucher,
  getMesAno,
  formatAsientoNumber
} from '../../utils/accountingUtils';

export const AccountingManager: React.FC = () => {
  const {
    accountingRecords,
    addAccountingRecord,
    updateAccountingRecord,
    deleteAccountingRecord,
    sales,
    expenses,
    layaways,
    exchangeRate,
    addNotification
  } = useStore();

  // Navigation tab inside accounting module: Libro Diario, Libro Mayor, Balances
  const [accountingView, setAccountingView] = useState<'diario' | 'mayor' | 'resumen'>('diario');

  // Filters State
  const [showFilters, setShowFilters] = useState(true);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterAccount, setFilterAccount] = useState('todas');
  const [filterOperation, setFilterOperation] = useState('todas');
  const [filterMesAno, setFilterMesAno] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Quick date presets helper
  const applyDatePreset = (preset: 'hoy' | 'esta_semana' | 'este_mes' | 'mes_anterior' | 'todos') => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'todos') {
      setFilterStartDate('');
      setFilterEndDate('');
      setFilterMesAno('todos');
      return;
    }

    if (preset === 'hoy') {
      setFilterStartDate(todayStr);
      setFilterEndDate(todayStr);
      return;
    }

    if (preset === 'esta_semana') {
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      setFilterStartDate(monday.toISOString().slice(0, 10));
      setFilterEndDate(todayStr);
      return;
    }

    if (preset === 'este_mes') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      setFilterStartDate(`${year}-${month}-01`);
      setFilterEndDate(todayStr);
      return;
    }

    if (preset === 'mes_anterior') {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = prevMonthDate.getFullYear();
      const month = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
      const lastDayOfPrevMonth = new Date(year, prevMonthDate.getMonth() + 1, 0).getDate();
      setFilterStartDate(`${year}-${month}-01`);
      setFilterEndDate(`${year}-${month}-${String(lastDayOfPrevMonth).padStart(2, '0')}`);
      return;
    }
  };

  // Modals
  const [selectedRecord, setSelectedRecord] = useState<AccountingRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AccountingRecord | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Record Form State
  const [newForm, setNewForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    partida: '01',
    cuenta: 'Ventas de mercancía',
    subcuenta: 'Calzado',
    clasificacion: 'Ingresos',
    subclasificacion: 'Ventas gravadas',
    metodo_pago: 'Efectivo USD',
    numero_documento: '',
    tipo_documento: 'FACTURA',
    sujeto: '',
    rif: 'V-',
    moneda: 'USD' as 'USD' | 'Bs',
    monto_total: '',
    operacion_tipo: 'Venta' as AccountingOperationType,
    observaciones: '',
    url_comprobante: '',
  });

  // Extract unique mes_ano options from all records
  const mesAnoOptions = useMemo(() => {
    const set = new Set<string>();
    accountingRecords.forEach((r) => {
      if (r.mes_ano) set.add(r.mes_ano);
    });
    return Array.from(set).sort().reverse();
  }, [accountingRecords]);

  // Extract unique account options
  const accountOptions = useMemo(() => {
    const set = new Set<string>();
    accountingRecords.forEach((r) => {
      if (r.cuenta) set.add(r.cuenta);
    });
    return Array.from(set).sort();
  }, [accountingRecords]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return accountingRecords.filter((r) => {
      // Date range filter
      if (filterStartDate && r.fecha < filterStartDate) return false;
      if (filterEndDate && r.fecha > filterEndDate) return false;

      // Account filter
      if (filterAccount !== 'todas' && r.cuenta.toLowerCase() !== filterAccount.toLowerCase()) return false;

      // Operation filter
      if (filterOperation !== 'todas' && r.operacion_tipo.toLowerCase() !== filterOperation.toLowerCase()) return false;

      // Mes-Año filter
      if (filterMesAno !== 'todos' && r.mes_ano !== filterMesAno) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesAsiento = r.numero_asiento?.toLowerCase().includes(query);
        const matchesDoc = r.numero_documento?.toLowerCase().includes(query);
        const matchesSujeto = r.sujeto?.toLowerCase().includes(query);
        const matchesRif = r.rif?.toLowerCase().includes(query);
        const matchesCuenta = r.cuenta?.toLowerCase().includes(query);
        const matchesSubcuenta = r.subcuenta?.toLowerCase().includes(query);
        const matchesObs = r.observaciones?.toLowerCase().includes(query);
        if (!matchesAsiento && !matchesDoc && !matchesSujeto && !matchesRif && !matchesCuenta && !matchesSubcuenta && !matchesObs) {
          return false;
        }
      }

      return true;
    });
  }, [accountingRecords, filterStartDate, filterEndDate, filterAccount, filterOperation, filterMesAno, searchTerm]);

  // General Totals
  const totals = useMemo(() => {
    let totalDebe = 0;
    let totalHaber = 0;
    let totalVentas = 0;
    let totalGastos = 0;
    let totalCashea = 0;
    let totalApartados = 0;

    filteredRecords.forEach((r) => {
      totalDebe += Number(r.debe || 0);
      totalHaber += Number(r.haber || 0);

      if (r.operacion_tipo === 'Venta') totalVentas += Number(r.haber || r.debe || 0);
      if (r.operacion_tipo === 'Gasto') totalGastos += Number(r.debe || 0);
      if (r.operacion_tipo === 'Cashea') totalCashea += Number(r.debe || 0);
      if (r.operacion_tipo === 'Apartado') totalApartados += Number(r.debe || 0);
    });

    return {
      totalDebe,
      totalHaber,
      isBalanced: Math.abs(totalDebe - totalHaber) < 0.05,
      diff: Math.abs(totalDebe - totalHaber),
      totalVentas,
      totalGastos,
      totalCashea,
      totalApartados,
      count: filteredRecords.length,
    };
  }, [filteredRecords]);

  // Aggregated General Ledger (Libro Mayor por Cuenta)
  const ledgerAccounts = useMemo(() => {
    const map: Record<string, { cuenta: string; clasificacion: string; debe: number; haber: number; movimientos: number }> = {};

    filteredRecords.forEach((r) => {
      // If record has explicit double entry lines, sum them
      if (r.lineas_asiento && r.lineas_asiento.length > 0) {
        r.lineas_asiento.forEach((line) => {
          const key = line.cuenta;
          if (!map[key]) {
            map[key] = {
              cuenta: line.cuenta,
              clasificacion: line.clasificacion || 'General',
              debe: 0,
              haber: 0,
              movimientos: 0,
            };
          }
          map[key].debe += Number(line.debe || 0);
          map[key].haber += Number(line.haber || 0);
          map[key].movimientos += 1;
        });
      } else {
        // Fallback to record's primary account
        const key = r.cuenta;
        if (!map[key]) {
          map[key] = {
            cuenta: r.cuenta,
            clasificacion: r.clasificacion || 'General',
            debe: 0,
            haber: 0,
            movimientos: 0,
          };
        }
        map[key].debe += Number(r.debe || 0);
        map[key].haber += Number(r.haber || 0);
        map[key].movimientos += 1;
      }
    });

    return Object.values(map).sort((a, b) => b.movimientos - a.movimientos);
  }, [filteredRecords]);

  // Copy URL or Reference to clipboard
  const handleCopyLink = (record: AccountingRecord) => {
    const url = record.url_comprobante || `${window.location.origin}/#asiento-${record.numero_asiento}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(record.id);
      addNotification('Enlace Copiado', `Referencia de ${record.numero_asiento} copiada al portapapeles.`, 'info');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Open Edit Modal
  const handleStartEdit = (record: AccountingRecord) => {
    setEditingRecord({ ...record });
    setIsEditing(true);
  };

  // Save Edit
  const handleSaveEdit = () => {
    if (!editingRecord) return;
    updateAccountingRecord(editingRecord.id, editingRecord);
    setIsEditing(false);
    if (selectedRecord?.id === editingRecord.id) {
      setSelectedRecord(editingRecord);
    }
  };

  // Delete Record Confirmation
  const handleDelete = async (record: AccountingRecord) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de que deseas eliminar el asiento ${record.numero_asiento} (${record.numero_documento})?\n\nEsta acción revertirá este registro del Libro Diario.`
    );
    if (confirmDelete) {
      await deleteAccountingRecord(record.id);
      if (selectedRecord?.id === record.id) {
        setSelectedRecord(null);
      }
    }
  };

  // Create New Record Submit
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(newForm.monto_total) || 0;
    if (monto <= 0) {
      alert('Ingresa un monto válido mayor a 0');
      return;
    }

    const docNum = newForm.numero_documento.trim() || `AS-DOC-${Date.now().toString().slice(-4)}`;
    const seqNum = accountingRecords.length + 1;
    const numAsiento = formatAsientoNumber(seqNum);
    const mesAno = getMesAno(newForm.fecha);

    const lineas: AccountingJournalLine[] = [
      {
        id: 'line-1',
        partida: newForm.partida,
        cuenta: newForm.cuenta,
        subcuenta: newForm.subcuenta,
        clasificacion: newForm.clasificacion,
        subclasificacion: newForm.subclasificacion,
        debe: newForm.operacion_tipo === 'Venta' ? 0 : monto,
        haber: newForm.operacion_tipo === 'Venta' ? monto : 0,
        descripcion: newForm.observaciones || `${newForm.operacion_tipo} Doc #${docNum}`,
      },
      {
        id: 'line-2',
        partida: newForm.partida,
        cuenta: newForm.metodo_pago.toLowerCase().includes('efectivo') ? 'Caja Principal' : 'Bancos Nacionales',
        subcuenta: newForm.metodo_pago,
        clasificacion: 'Activo',
        subclasificacion: 'Efectivo y Equivalentes',
        debe: newForm.operacion_tipo === 'Venta' ? monto : 0,
        haber: newForm.operacion_tipo === 'Venta' ? 0 : monto,
        descripcion: `Contrapartida en ${newForm.metodo_pago}`,
      },
    ];

    addAccountingRecord({
      numero_asiento: numAsiento,
      fecha: newForm.fecha,
      partida: newForm.partida,
      cuenta: newForm.cuenta,
      subcuenta: newForm.subcuenta,
      clasificacion: newForm.clasificacion,
      subclasificacion: newForm.subclasificacion,
      mes_ano: mesAno,
      metodo_pago: newForm.metodo_pago,
      numero_documento: docNum,
      tipo_documento: newForm.tipo_documento,
      sujeto: newForm.sujeto || 'Cliente / Proveedor General',
      rif: newForm.rif || 'V-00000000',
      moneda: newForm.moneda,
      debe: monto,
      haber: monto,
      operacion_tipo: newForm.operacion_tipo,
      origen_tipo: 'manual',
      observaciones: newForm.observaciones,
      url_comprobante: newForm.url_comprobante,
      tasa_cambio: exchangeRate,
      lineas_asiento: lineas,
    });

    setIsCreatingNew(false);
    setNewForm({
      fecha: new Date().toISOString().slice(0, 10),
      partida: '01',
      cuenta: 'Ventas de mercancía',
      subcuenta: 'Calzado',
      clasificacion: 'Ingresos',
      subclasificacion: 'Ventas gravadas',
      metodo_pago: 'Efectivo USD',
      numero_documento: '',
      tipo_documento: 'FACTURA',
      sujeto: '',
      rif: 'V-',
      moneda: 'USD',
      monto_total: '',
      operacion_tipo: 'Venta',
      observaciones: '',
      url_comprobante: '',
    });
  };

  // Helper for badge colors based on operation
  const getOpBadge = (op: AccountingOperationType) => {
    switch (op) {
      case 'Venta':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Compra':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Gasto':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Cashea':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Apartado':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Pago':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Patentado V10 Title & Main Controls */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                  CONTABILIDAD
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  PATENTADO V10
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {totals.count} REGISTROS
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Libro Diario Centralizado, Mayor General y Asientos de Doble Partida con enlace comercial y fiscal.
              </p>
            </div>
          </div>

          {/* Quick Action Toolbar requested by user */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCreatingNew(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo registro</span>
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center space-x-1.5 px-3 py-2 border text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                showFilters || filterStartDate || filterEndDate || filterAccount !== 'todas' || filterOperation !== 'todas' || filterMesAno !== 'todos'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filtrar</span>
              {(filterStartDate || filterEndDate || filterAccount !== 'todas' || filterOperation !== 'todas' || filterMesAno !== 'todos') && (
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              )}
            </button>

            <button
              onClick={() => exportLedgerToExcel(filteredRecords)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Descargar archivo Excel con las 19 columnas oficiales"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Imprimir Libro Diario filtrado"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>

            {/* View Switcher: Diario vs Mayor vs Balances */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setAccountingView('diario')}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                  accountingView === 'diario' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Diario
              </button>
              <button
                onClick={() => setAccountingView('mayor')}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                  accountingView === 'mayor' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mayor
              </button>
              <button
                onClick={() => setAccountingView('resumen')}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                  accountingView === 'resumen' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Resumen
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar (Requested by user: Desde, Hasta, Cuenta, Tipo) */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-3">
            {/* Quick date preset buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/60 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Rango rápido:</span>
                <button
                  type="button"
                  onClick={() => applyDatePreset('hoy')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer border ${
                    filterStartDate === new Date().toISOString().slice(0, 10) && filterEndDate === new Date().toISOString().slice(0, 10)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('esta_semana')}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                >
                  Esta Semana
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('este_mes')}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                >
                  Este Mes
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('mes_anterior')}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                >
                  Mes Anterior
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('todos')}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                >
                  Todos los Registros
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Actualización automática en tiempo real</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Desde:
                </label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Hasta:
                </label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Cuenta:
                </label>
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="todas">Todas las cuentas</option>
                  {accountOptions.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Tipo:
                </label>
                <select
                  value={filterOperation}
                  onChange={(e) => setFilterOperation(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="todas">Todos los tipos</option>
                  <option value="Venta">Venta</option>
                  <option value="Compra">Compra</option>
                  <option value="Gasto">Gasto</option>
                  <option value="Pago">Pago</option>
                  <option value="Cashea">Cashea</option>
                  <option value="Apartado">Apartado</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Mes-Año:
                </label>
                <div className="flex gap-2">
                  <select
                    value={filterMesAno}
                    onChange={(e) => setFilterMesAno(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="todos">Todos los meses</option>
                    {mesAnoOptions.map((ma) => (
                      <option key={ma} value={ma}>
                        {ma}
                      </option>
                    ))}
                  </select>
                  {(filterStartDate || filterEndDate || filterAccount !== 'todas' || filterOperation !== 'todas' || filterMesAno !== 'todos' || searchTerm) && (
                    <button
                      onClick={() => {
                        setFilterStartDate('');
                        setFilterEndDate('');
                        setFilterAccount('todas');
                        setFilterOperation('todas');
                        setFilterMesAno('todos');
                        setSearchTerm('');
                      }}
                      className="px-2 py-1.5 text-xs text-slate-500 hover:text-rose-600 bg-white border border-slate-300 rounded-md cursor-pointer font-medium"
                      title="Limpiar filtros"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Search and Metrics Strip */}
        <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por Registro, Documento, RIF, Cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto justify-end">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-medium">Total Debe:</span>
              <strong className="text-slate-900 font-mono font-bold">${totals.totalDebe.toFixed(2)}</strong>
            </div>

            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-medium">Total Haber:</span>
              <strong className="text-slate-900 font-mono font-bold">${totals.totalHaber.toFixed(2)}</strong>
            </div>

            <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border ${
              totals.isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              {totals.isBalanced ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-bold">Cuadrado ✓</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span className="font-bold">Dif: ${totals.diff.toFixed(2)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main View: Libro Diario (Centralized Registry) */}
      {accountingView === 'diario' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No hay asientos contables</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                No se encontraron registros con los filtros seleccionados o aún no se han registrado operaciones en el sistema.
              </p>
              <button
                onClick={() => setIsCreatingNew(true)}
                className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" />
                <span>Crear primer asiento</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-900 text-slate-200 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-2 text-center w-10">N°</th>
                    <th className="py-3 px-3">Registro</th>
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-2 text-center">Partida</th>
                    <th className="py-3 px-3">Cuenta</th>
                    <th className="py-3 px-3">Subcuenta</th>
                    <th className="py-3 px-3">Clasificación</th>
                    <th className="py-3 px-3">Subclasificación</th>
                    <th className="py-3 px-2.5 text-center">Mes-Año</th>
                    <th className="py-3 px-3">Método de pago</th>
                    <th className="py-3 px-3">N° Documento</th>
                    <th className="py-3 px-2.5">Tipo Doc.</th>
                    <th className="py-3 px-3">Razón Social / Proveedor / Cliente</th>
                    <th className="py-3 px-2.5">RIF</th>
                    <th className="py-3 px-2 text-center">Moneda</th>
                    <th className="py-3 px-3 text-right">Debe</th>
                    <th className="py-3 px-3 text-right">Haber</th>
                    <th className="py-3 px-3 text-center">Venta/Compra</th>
                    <th className="py-3 px-4 text-center sticky right-0 bg-slate-900 z-10 shadow-l">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredRecords.map((rec, index) => (
                    <tr
                      key={rec.id}
                      className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedRecord(rec)}
                    >
                      {/* 1. N° */}
                      <td className="py-2.5 px-2 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* 2. Registro */}
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-200/60">
                          {rec.numero_asiento}
                        </span>
                      </td>

                      {/* 3. Fecha */}
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {formatDateDisplay(rec.fecha)}
                      </td>

                      {/* 4. Partida */}
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-500">
                        {rec.partida}
                      </td>

                      {/* 5. Cuenta */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {rec.cuenta}
                      </td>

                      {/* 6. Subcuenta */}
                      <td className="py-2.5 px-3 text-slate-600">
                        {rec.subcuenta}
                      </td>

                      {/* 7. Clasificación */}
                      <td className="py-2.5 px-3">
                        <span className="text-[11px] font-medium text-slate-700">
                          {rec.clasificacion}
                        </span>
                      </td>

                      {/* 8. Subclasificación */}
                      <td className="py-2.5 px-3 text-slate-500">
                        {rec.subclasificacion}
                      </td>

                      {/* 9. Mes-Año */}
                      <td className="py-2.5 px-2.5 text-center font-mono text-[11px] text-slate-600">
                        {rec.mes_ano}
                      </td>

                      {/* 10. Método de pago */}
                      <td className="py-2.5 px-3">
                        <span className="text-slate-800 font-medium">
                          {rec.metodo_pago}
                        </span>
                      </td>

                      {/* 11. N° Documento */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {rec.numero_documento}
                      </td>

                      {/* 12. Tipo Doc. */}
                      <td className="py-2.5 px-2.5">
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {rec.tipo_documento}
                        </span>
                      </td>

                      {/* 13. Razón social / Proveedor / Cliente */}
                      <td className="py-2.5 px-3 font-medium text-slate-900 max-w-[200px] truncate" title={rec.sujeto}>
                        {rec.sujeto}
                      </td>

                      {/* 14. RIF */}
                      <td className="py-2.5 px-2.5 font-mono text-[11px] text-slate-600">
                        {rec.rif}
                      </td>

                      {/* 15. Moneda */}
                      <td className="py-2.5 px-2 text-center font-bold text-slate-600">
                        {rec.moneda}
                      </td>

                      {/* 16. Debe */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        ${Number(rec.debe || 0).toFixed(2)}
                      </td>

                      {/* 17. Haber */}
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                        ${Number(rec.haber || 0).toFixed(2)}
                      </td>

                      {/* 18. Venta/Compra (Operación) */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getOpBadge(rec.operacion_tipo)}`}>
                          {rec.operacion_tipo}
                        </span>
                      </td>

                      {/* 19. Acción: PDF, Editar, Eliminar, URL */}
                      <td
                        className="py-2.5 px-3 text-center sticky right-0 bg-white group-hover:bg-indigo-50/40 z-10 shadow-l"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          {/* 📄 PDF */}
                          <button
                            onClick={() => printAccountingVoucher(rec)}
                            title="Imprimir Comprobante Contable / PDF"
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* ✏️ Editar */}
                          <button
                            onClick={() => handleStartEdit(rec)}
                            title="Editar asiento contable"
                            className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* 🗑️ Eliminar */}
                          <button
                            onClick={() => handleDelete(rec)}
                            title="Eliminar asiento"
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* 🔗 URL */}
                          <button
                            onClick={() => handleCopyLink(rec)}
                            title="Copiar referencia / URL"
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                          >
                            {copiedId === rec.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <LinkIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View: Libro Mayor (General Ledger Accounts) */}
      {accountingView === 'mayor' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ledgerAccounts.map((acc) => {
              const saldoDeudor = Math.max(0, acc.debe - acc.haber);
              const saldoAcreedor = Math.max(0, acc.haber - acc.debe);

              return (
                <div key={acc.cuenta} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{acc.cuenta}</h4>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">{acc.clasificacion}</span>
                    </div>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-700">
                      {acc.movimientos} ops
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[10px] uppercase text-slate-500 block font-semibold">Total Debe:</span>
                      <strong className="font-mono text-emerald-700">${acc.debe.toFixed(2)}</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded border border-slate-100">
                      <span className="text-[10px] uppercase text-slate-500 block font-semibold">Total Haber:</span>
                      <strong className="font-mono text-indigo-700">${acc.haber.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Saldo Final:</span>
                    {saldoDeudor > 0 ? (
                      <span className="font-mono font-bold text-emerald-700">
                        ${saldoDeudor.toFixed(2)} (Deudor)
                      </span>
                    ) : saldoAcreedor > 0 ? (
                      <span className="font-mono font-bold text-indigo-700">
                        ${saldoAcreedor.toFixed(2)} (Acreedor)
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-slate-400">$0.00 (Balanceado)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View: Resumen Financiero & Estado de Resultados */}
      {accountingView === 'resumen' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs lg:col-span-2">
            <h3 className="font-black text-slate-900 text-sm uppercase mb-4 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Resumen Contable Consolidado</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-[11px] font-bold text-emerald-700 block uppercase">Ingresos Ventas</span>
                <strong className="text-lg font-mono font-black text-emerald-800">${totals.totalVentas.toFixed(2)}</strong>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                <span className="text-[11px] font-bold text-rose-700 block uppercase">Gastos Operativos</span>
                <strong className="text-lg font-mono font-black text-rose-800">${totals.totalGastos.toFixed(2)}</strong>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <span className="text-[11px] font-bold text-amber-700 block uppercase">Financiado Cashea</span>
                <strong className="text-lg font-mono font-black text-amber-800">${totals.totalCashea.toFixed(2)}</strong>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                <span className="text-[11px] font-bold text-purple-700 block uppercase">Apartados Reservados</span>
                <strong className="text-lg font-mono font-black text-purple-800">${totals.totalApartados.toFixed(2)}</strong>
              </div>
            </div>

            <div className="p-4 bg-slate-900 text-white rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase font-bold text-slate-400">Resultado Operativo Neto (Ventas - Gastos)</span>
                <span className={`text-base font-black font-mono ${
                  totals.totalVentas - totals.totalGastos >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  ${(totals.totalVentas - totals.totalGastos).toFixed(2)} USD
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Este balance refleja la utilidad bruta antes de ajustes por rotación de inventario y costo de calzado.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-black text-slate-900 text-sm uppercase mb-4 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Reglas Contables MAKD</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <strong className="text-slate-900 block mb-0.5">🛒 Venta:</strong>
                Libro Diario + Libro Mayor + Inventario + Costo de Venta + IVA + Caja/Banco/Cashea.
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <strong className="text-slate-900 block mb-0.5">📦 Compra:</strong>
                Libro Diario + Inventario + Proveedor + IVA crédito fiscal.
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <strong className="text-slate-900 block mb-0.5">📉 Gasto:</strong>
                Libro Diario + Gasto correspondiente + Caja/Banco.
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <strong className="text-slate-900 block mb-0.5">⚡ Cobro Cashea:</strong>
                Caja/Banco + Disminución Cuentas por Cobrar Cashea.
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <strong className="text-slate-900 block mb-0.5">🔖 Apartado:</strong>
                Registro del apartado + Pago recibido + Cuenta pendiente. Al convertirse en factura completa el ciclo sin duplicar inventario.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: DETALLE DEL ASIENTO (ASIENTO AS-00001) - Exact Structure Requested by User */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-indigo-600 text-white font-mono">
                  ASIENTO {selectedRecord.numero_asiento}
                </span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getOpBadge(selectedRecord.operacion_tipo)}`}>
                  {selectedRecord.operacion_tipo}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => printAccountingVoucher(selectedRecord)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                  title="Imprimir Comprobante"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    handleStartEdit(selectedRecord);
                    setSelectedRecord(null);
                  }}
                  className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body: Exactly what user specified */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Document and Customer Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Fecha:</span>
                  <strong className="text-slate-900">{formatDateDisplay(selectedRecord.fecha)}</strong>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Documento:</span>
                  <strong className="text-slate-900 font-mono">{selectedRecord.numero_documento}</strong>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Tipo:</span>
                  <span className="font-bold text-indigo-700">{selectedRecord.tipo_documento}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Cliente / Sujeto:</span>
                  <strong className="text-slate-900">{selectedRecord.sujeto}</strong>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">RIF:</span>
                  <span className="font-mono text-slate-800 font-medium">{selectedRecord.rif}</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Mes-Año:</span>
                  <span className="font-mono text-slate-800 font-medium">{selectedRecord.mes_ano}</span>
                </div>
              </div>

              {/* Main Classification Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">PARTIDA</span>
                  <strong className="text-sm font-mono text-slate-900">{selectedRecord.partida}</strong>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">CUENTA</span>
                  <strong className="text-sm text-slate-900">{selectedRecord.cuenta}</strong>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">SUBCUENTA</span>
                  <strong className="text-sm text-slate-800">{selectedRecord.subcuenta}</strong>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">CLASIFICACIÓN</span>
                  <strong className="text-sm text-slate-800">{selectedRecord.clasificacion}</strong>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">SUBCLASIFICACIÓN</span>
                  <strong className="text-sm text-slate-800">{selectedRecord.subclasificacion}</strong>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">MÉTODO DE PAGO</span>
                  <strong className="text-sm text-indigo-700">{selectedRecord.metodo_pago}</strong>
                </div>
              </div>

              {/* Totals Box: DEBE vs HABER */}
              <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-around text-center">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">DEBE</span>
                  <span className="text-xl font-mono font-black text-emerald-400">
                    ${Number(selectedRecord.debe || 0).toFixed(2)}
                  </span>
                </div>

                <div className="h-8 w-px bg-slate-700"></div>

                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">HABER</span>
                  <span className="text-xl font-mono font-black text-indigo-400">
                    ${Number(selectedRecord.haber || 0).toFixed(2)}
                  </span>
                </div>

                <div className="h-8 w-px bg-slate-700"></div>

                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block">MONEDA</span>
                  <span className="text-xl font-black text-white">{selectedRecord.moneda}</span>
                </div>
              </div>

              {/* Full Double Entry Breakdown */}
              {selectedRecord.lineas_asiento && selectedRecord.lineas_asiento.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Líneas del Asiento (Doble Partida)
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2.5">Part.</th>
                          <th className="py-2 px-3">Cuenta / Subcuenta</th>
                          <th className="py-2 px-3 text-right">Debe</th>
                          <th className="py-2 px-3 text-right">Haber</th>
                          <th className="py-2 px-3">Descripción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedRecord.lineas_asiento.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50/60">
                            <td className="py-2 px-2.5 font-mono text-slate-500">{l.partida}</td>
                            <td className="py-2 px-3">
                              <span className="font-bold text-slate-800 block">{l.cuenta}</span>
                              <span className="text-[10px] text-slate-500">{l.subcuenta}</span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700">
                              {l.debe > 0 ? `$${l.debe.toFixed(2)}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-indigo-700">
                              {l.haber > 0 ? `$${l.haber.toFixed(2)}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-500">{l.descripcion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Observaciones */}
              {selectedRecord.observaciones && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                  <strong className="text-slate-800">Observaciones:</strong> {selectedRecord.observaciones}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => handleCopyLink(selectedRecord)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg bg-white cursor-pointer"
              >
                {copiedId === selectedRecord.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar Enlace</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => printAccountingVoucher(selectedRecord)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  Imprimir Comprobante (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: CREAR NUEVO REGISTRO / ASIENTO */}
      {isCreatingNew && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-black text-slate-900 text-base uppercase">Nuevo Registro Contable</h3>
              </div>
              <button
                onClick={() => setIsCreatingNew(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={newForm.fecha}
                    onChange={(e) => setNewForm({ ...newForm, fecha: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Operación</label>
                  <select
                    value={newForm.operacion_tipo}
                    onChange={(e) => setNewForm({ ...newForm, operacion_tipo: e.target.value as AccountingOperationType })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  >
                    <option value="Venta">Venta</option>
                    <option value="Compra">Compra</option>
                    <option value="Gasto">Gasto</option>
                    <option value="Pago">Pago</option>
                    <option value="Cashea">Cashea</option>
                    <option value="Apartado">Apartado</option>
                    <option value="Ajuste">Ajuste</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Partida</label>
                  <input
                    type="text"
                    required
                    value={newForm.partida}
                    onChange={(e) => setNewForm({ ...newForm, partida: e.target.value })}
                    placeholder="01, 02..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo Documento</label>
                  <select
                    value={newForm.tipo_documento}
                    onChange={(e) => setNewForm({ ...newForm, tipo_documento: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  >
                    <option value="FACTURA">FACTURA</option>
                    <option value="GASTO">GASTO</option>
                    <option value="COMPRA">COMPRA</option>
                    <option value="APARTADO">APARTADO</option>
                    <option value="RECIBO">RECIBO</option>
                    <option value="LIQUIDACION">LIQUIDACION</option>
                    <option value="COMPROBANTE">COMPROBANTE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">N° Documento</label>
                  <input
                    type="text"
                    value={newForm.numero_documento}
                    onChange={(e) => setNewForm({ ...newForm, numero_documento: e.target.value })}
                    placeholder="FAC-000125, GAST-001..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Monto Total ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newForm.monto_total}
                    onChange={(e) => setNewForm({ ...newForm, monto_total: e.target.value })}
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cuenta Principal</label>
                  <input
                    type="text"
                    required
                    value={newForm.cuenta}
                    onChange={(e) => setNewForm({ ...newForm, cuenta: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subcuenta</label>
                  <input
                    type="text"
                    required
                    value={newForm.subcuenta}
                    onChange={(e) => setNewForm({ ...newForm, subcuenta: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Clasificación</label>
                  <input
                    type="text"
                    required
                    value={newForm.clasificacion}
                    onChange={(e) => setNewForm({ ...newForm, clasificacion: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subclasificación</label>
                  <input
                    type="text"
                    required
                    value={newForm.subclasificacion}
                    onChange={(e) => setNewForm({ ...newForm, subclasificacion: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Método de Pago</label>
                  <select
                    value={newForm.metodo_pago}
                    onChange={(e) => setNewForm({ ...newForm, metodo_pago: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  >
                    <option value="Efectivo USD">Efectivo USD</option>
                    <option value="Pago Móvil BDV">Pago Móvil BDV</option>
                    <option value="Punto de Venta">Punto de Venta</option>
                    <option value="Cashea">Cashea</option>
                    <option value="Zelle">Zelle</option>
                    <option value="Binance USDT">Binance USDT</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Moneda</label>
                  <select
                    value={newForm.moneda}
                    onChange={(e) => setNewForm({ ...newForm, moneda: e.target.value as 'USD' | 'Bs' })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="Bs">Bs (Bolívares)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Razón Social / Cliente</label>
                  <input
                    type="text"
                    value={newForm.sujeto}
                    onChange={(e) => setNewForm({ ...newForm, sujeto: e.target.value })}
                    placeholder="Nombre o empresa"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">RIF / C.I.</label>
                  <input
                    type="text"
                    value={newForm.rif}
                    onChange={(e) => setNewForm({ ...newForm, rif: e.target.value })}
                    placeholder="V-12345678 / J-12345678"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones / Glosa</label>
                <textarea
                  value={newForm.observaciones}
                  onChange={(e) => setNewForm({ ...newForm, observaciones: e.target.value })}
                  placeholder="Detalles contables..."
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  Guardar Asiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: EDITAR REGISTRO CONTABLE */}
      {isEditing && editingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-100 text-amber-800 rounded">
                  Editar {editingRecord.numero_asiento}
                </span>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={editingRecord.fecha}
                    onChange={(e) => setEditingRecord({ ...editingRecord, fecha: e.target.value, mes_ano: getMesAno(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Partida</label>
                  <input
                    type="text"
                    value={editingRecord.partida}
                    onChange={(e) => setEditingRecord({ ...editingRecord, partida: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cuenta</label>
                  <input
                    type="text"
                    value={editingRecord.cuenta}
                    onChange={(e) => setEditingRecord({ ...editingRecord, cuenta: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subcuenta</label>
                  <input
                    type="text"
                    value={editingRecord.subcuenta}
                    onChange={(e) => setEditingRecord({ ...editingRecord, subcuenta: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Clasificación</label>
                  <input
                    type="text"
                    value={editingRecord.clasificacion}
                    onChange={(e) => setEditingRecord({ ...editingRecord, clasificacion: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subclasificación</label>
                  <input
                    type="text"
                    value={editingRecord.subclasificacion}
                    onChange={(e) => setEditingRecord({ ...editingRecord, subclasificacion: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Debe ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecord.debe}
                    onChange={(e) => setEditingRecord({ ...editingRecord, debe: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Haber ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRecord.haber}
                    onChange={(e) => setEditingRecord({ ...editingRecord, haber: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cliente / Sujeto</label>
                  <input
                    type="text"
                    value={editingRecord.sujeto}
                    onChange={(e) => setEditingRecord({ ...editingRecord, sujeto: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">RIF</label>
                  <input
                    type="text"
                    value={editingRecord.rif}
                    onChange={(e) => setEditingRecord({ ...editingRecord, rif: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                <textarea
                  value={editingRecord.observaciones || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, observaciones: e.target.value })}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  Actualizar Asiento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
