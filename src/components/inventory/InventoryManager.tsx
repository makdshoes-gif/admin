import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Filter,
  Layers,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  PackageCheck,
  Tag,
  Printer
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ShoeProduct, ShoeType, MovementType } from '../../types';
import { ProductFormModal } from './ProductFormModal';
import { StockMovementModal } from './StockMovementModal';
import { ShoeLabelModal } from './ShoeLabelModal';

export const InventoryManager: React.FC = () => {
  const {
    products,
    movements,
    exchangeRate,
    addProduct,
    updateProduct,
    adjustStock,
    deleteProduct,
    userRole,
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'kardex' | 'alerts'>('catalog');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedSize, setSelectedSize] = useState('Todas');
  const [selectedStockStatus, setSelectedStockStatus] = useState<'todos' | 'critico' | 'agotado' | 'optimo'>('todos');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ShoeProduct | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementTargetProduct, setMovementTargetProduct] = useState<ShoeProduct | null>(null);

  // Shoe Label Printing Modal state
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [labelProduct, setLabelProduct] = useState<ShoeProduct | null>(null);

  const handleOpenLabelModal = (p: ShoeProduct) => {
    setLabelProduct(p);
    setIsLabelModalOpen(true);
  };

  // Quick kardex filter
  const [kardexFilterType, setKardexFilterType] = useState<string>('todos');

  // Metrics calculations
  const totalPairs = useMemo(() => {
    return products.filter((p) => p.activo).reduce((sum, p) => sum + p.stock, 0);
  }, [products]);

  const inventoryValueCost = useMemo(() => {
    return products.filter((p) => p.activo).reduce((sum, p) => sum + p.costo * p.stock, 0);
  }, [products]);

  const inventoryValueRetail = useMemo(() => {
    return products.filter((p) => p.activo).reduce((sum, p) => sum + p.precio * p.stock, 0);
  }, [products]);

  const potentialProfit = inventoryValueRetail - inventoryValueCost;

  const criticalItems = useMemo(() => {
    return products.filter((p) => p.activo && p.stock <= p.stock_minimo);
  }, [products]);

  // Unique brands & types
  const brands = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.marca))).sort();
    return ['Todas', ...list];
  }, [products]);

  const shoeTypes = ['Todos', 'Deportivo', 'Casual', 'Botas', 'Tacones', 'Sandalias', 'Mocasines'];
  const shoeSizes = ['Todas', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.activo) return false;

      const matchSearch =
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.color.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.talla.includes(searchQuery);

      const matchBrand = selectedBrand === 'Todas' || p.marca === selectedBrand;
      const matchType = selectedType === 'Todos' || p.tipo === selectedType;
      const matchSize = selectedSize === 'Todas' || p.talla === selectedSize;

      let matchStock = true;
      if (selectedStockStatus === 'critico') {
        matchStock = p.stock <= p.stock_minimo && p.stock > 0;
      } else if (selectedStockStatus === 'agotado') {
        matchStock = p.stock === 0;
      } else if (selectedStockStatus === 'optimo') {
        matchStock = p.stock > p.stock_minimo;
      }

      return matchSearch && matchBrand && matchType && matchSize && matchStock;
    });
  }, [products, searchQuery, selectedBrand, selectedType, selectedSize, selectedStockStatus]);

  // Filtered movements for Kardex
  const filteredMovements = useMemo(() => {
    if (kardexFilterType === 'todos') return movements;
    return movements.filter((m) => m.tipo === kardexFilterType);
  }, [movements, kardexFilterType]);

  const handleOpenEdit = (p: ShoeProduct) => {
    setEditingProduct(p);
    setIsProductModalOpen(true);
  };

  const handleOpenMovement = (p: ShoeProduct) => {
    setMovementTargetProduct(p);
    setIsMovementModalOpen(true);
  };

  const handleQuickRestock = (p: ShoeProduct, qty: number = 10) => {
    adjustStock(p.id, qty, `Reabastecimiento rápido de ${qty} pares`, 'entrada');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header & Main Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-600" />
            <span>Gestión de Inventario en Tiempo Real</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoreo continuo de pares físicos, entradas de lotes, mermas y alertas de reposición.
          </p>
        </div>

        {/* Action Button: Nuevo Calzado */}
        {userRole === 'admin' && (
          <button
            id="new-product-btn"
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Modelo de Calzado</span>
          </button>
        )}
      </div>

      {/* KPI Cards Grid (High Density 4-Card Pattern) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Pairs */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total en Almacén</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {totalPairs} <span className="text-xs font-normal text-slate-500">pares</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">
            En {products.filter((p) => p.activo).length} modelos y tallas
          </div>
        </div>

        {/* Valuation at Cost */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Valor a Costo</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            ${inventoryValueCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">
            Inversión inmovilizada en stock
          </div>
        </div>

        {/* Valuation at Retail (Revenue Potential) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Valor Venta (PVP)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono">
            ${inventoryValueRetail.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">
            Ganancia bruta proyectada: +${potentialProfit.toFixed(2)}
          </div>
        </div>

        {/* Critical Stock Alerts */}
        <div
          onClick={() => setActiveSubTab('alerts')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs cursor-pointer hover:border-rose-400 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Stock Crítico</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 font-mono flex items-center gap-2">
            <span>{criticalItems.length}</span>
            {criticalItems.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-sans font-bold">
                Requiere compra
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">
            {criticalItems.filter((i) => i.stock === 0).length} agotados totalmente
          </div>
        </div>

      </div>

      {/* Subtabs Navigation */}
      <div className="flex items-center border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'catalog'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Catálogo y Existencias Físicas ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('kardex')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'kardex'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Bitácora de Movimientos ({movements.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('alerts')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'alerts'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Alertas de Reposición ({criticalItems.length})</span>
        </button>
      </div>

      {/* SUBTAB 1: CATALOG & INVENTORY TABLE */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              
              {/* Search input */}
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar modelo, código SKU, color..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              {/* Brand Filter */}
              <div>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  <option value="Todas">Todas las Marcas</option>
                  {brands.filter((b) => b !== 'Todas').map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  {shoeTypes.map((t) => (
                    <option key={t} value={t}>{t === 'Todos' ? 'Todos los Tipos' : t}</option>
                  ))}
                </select>
              </div>

              {/* Stock Status Filter */}
              <div>
                <select
                  value={selectedStockStatus}
                  onChange={(e) => setSelectedStockStatus(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="critico">⚠️ Stock Crítico (≤ Mínimo)</option>
                  <option value="agotado">⛔ Agotados (0 pares)</option>
                  <option value="optimo">✅ Stock Óptimo</option>
                </select>
              </div>

            </div>

            {/* Quick Size filter pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-semibold mr-1 text-[11px]">Tallas:</span>
              {shoeSizes.map((sz) => (
                <button
                  key={sz}
                  onClick={() => setSelectedSize(sz)}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors cursor-pointer ${
                    selectedSize === sz
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Table Container (High Density Design Theme) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Calzado / Modelo</th>
                    <th className="py-3 px-3">Talla</th>
                    <th className="py-3 px-3">Marca / Tipo</th>
                    <th className="py-3 px-3 text-right">Costo ($)</th>
                    <th className="py-3 px-3 text-right">PVP ($)</th>
                    <th className="py-3 px-3 text-right">Margen</th>
                    <th className="py-3 px-3 text-center">Stock en Vivo</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No se encontraron modelos con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isOutOfStock = p.stock === 0;
                      const isLowStock = p.stock > 0 && p.stock <= p.stock_minimo;
                      const marginAmount = p.precio - p.costo;
                      const marginPercent = p.precio > 0 ? (marginAmount / p.precio) * 100 : 0;

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Image & Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                                {p.imagen ? (
                                  <img
                                    src={p.imagen}
                                    alt={p.nombre}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs">👟</div>
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-xs">{p.nombre}</div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                  <span>{p.color}</span>
                                  <span>•</span>
                                  <span className="font-mono text-slate-500">{p.sku}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Size */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono font-bold text-xs">
                              {p.talla}
                            </span>
                          </td>

                          {/* Brand & Type */}
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">{p.marca}</div>
                            <div className="text-[10px] text-slate-400">{p.tipo}</div>
                          </td>

                          {/* Cost */}
                          <td className="py-3 px-3 text-right font-mono text-slate-500">
                            ${p.costo.toFixed(2)}
                          </td>

                          {/* Sale Price */}
                          <td className="py-3 px-3 text-right font-mono">
                            <div className="font-bold text-slate-900">${p.precio.toFixed(2)}</div>
                            <div className="text-[10px] text-slate-400">{(p.precio * exchangeRate).toFixed(0)} Bs</div>
                          </td>

                          {/* Margin */}
                          <td className="py-3 px-3 text-right font-mono">
                            <span className="text-emerald-600 font-semibold">
                              +${marginAmount.toFixed(2)}
                            </span>
                            <div className="text-[10px] text-slate-400">{marginPercent.toFixed(0)}%</div>
                          </td>

                          {/* Real-time Stock Badge (High Density Tag Pattern) */}
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isOutOfStock
                                    ? 'bg-rose-100 text-rose-700'
                                    : isLowStock
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {isOutOfStock ? 'Agotado' : isLowStock ? `${p.stock} pares (Bajo)` : `${p.stock} pares`}
                              </span>
                              <span className="text-[9px] text-slate-400 mt-0.5">
                                Mínimo: {p.stock_minimo}
                              </span>
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Quick -1 */}
                              <button
                                onClick={() => adjustStock(p.id, -1, 'Ajuste rápido manual (-1 par)', 'salida_ajuste')}
                                disabled={p.stock <= 0}
                                title="Restar 1 par"
                                className="p-1 rounded-md bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>

                              {/* Quick +1 */}
                              <button
                                onClick={() => adjustStock(p.id, 1, 'Ingreso rápido manual (+1 par)', 'entrada')}
                                title="Sumar 1 par"
                                className="p-1 rounded-md bg-slate-50 border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>

                              {/* Imprimir Etiqueta (SKU, Descripción y Costo) */}
                              <button
                                onClick={() => handleOpenLabelModal(p)}
                                title="Imprimir Etiqueta para Zapato (SKU, Descripción y Costo)"
                                className="px-2 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold border border-indigo-200 cursor-pointer transition-colors flex items-center gap-1"
                              >
                                <Tag className="w-3 h-3 text-indigo-600" />
                                <span className="hidden xl:inline">Etiqueta</span>
                              </button>

                              {/* Open Movement Modal */}
                              <button
                                onClick={() => handleOpenMovement(p)}
                                title="Movimiento de Lote / Kardex"
                                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium border border-slate-200 cursor-pointer transition-colors"
                              >
                                Lote
                              </button>

                              {userRole === 'admin' && (
                                <>
                                  {/* Edit */}
                                  <button
                                    onClick={() => handleOpenEdit(p)}
                                    title="Editar calzado"
                                    className="p-1 rounded-md bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>

                                  {/* Delete */}
                                  <button
                                    onClick={() => {
                                      if (confirm(`¿Retirar ${p.nombre} (Talla ${p.talla}) del catálogo?`)) {
                                        deleteProduct(p.id);
                                      }
                                    }}
                                    title="Eliminar del catálogo"
                                    className="p-1 rounded-md bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-slate-100 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
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

      {/* SUBTAB 2: REAL-TIME KARDEX / STOCK MOVEMENTS */}
      {activeSubTab === 'kardex' && (
        <div className="space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">Historial de Operaciones y Movimientos en Vivo</span>
            </div>

            {/* Filter by type */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 mr-1">Filtrar por:</span>
              <button
                onClick={() => setKardexFilterType('todos')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  kardexFilterType === 'todos' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setKardexFilterType('entrada')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  kardexFilterType === 'entrada' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Entradas
              </button>
              <button
                onClick={() => setKardexFilterType('venta')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  kardexFilterType === 'venta' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ventas
              </button>
              <button
                onClick={() => setKardexFilterType('salida_ajuste')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                  kardexFilterType === 'salida_ajuste' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Mermas / Ajustes
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4">Calzado & Talla</th>
                    <th className="py-3 px-3">Tipo de Operación</th>
                    <th className="py-3 px-3 text-center">Variación</th>
                    <th className="py-3 px-3 text-center">Stock (Previo ➔ Nuevo)</th>
                    <th className="py-3 px-4">Motivo / Factura</th>
                    <th className="py-3 px-3">Usuario</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No hay registros de movimientos en esta categoría.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((mov) => {
                      const isPositive = mov.cantidad > 0;
                      return (
                        <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                            {new Date(mov.fecha).toLocaleString('es-VE')}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{mov.producto_nombre}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <span className="font-semibold text-indigo-600">Talla: {mov.talla}</span>
                              <span>•</span>
                              <span>SKU: {mov.sku}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                                mov.tipo === 'entrada'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : mov.tipo === 'venta'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : mov.tipo === 'devolucion'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {mov.tipo === 'entrada' && <ArrowUpRight className="w-3 h-3" />}
                              {mov.tipo === 'venta' && <ArrowDownRight className="w-3 h-3" />}
                              {mov.tipo === 'salida_ajuste' && <Minus className="w-3 h-3" />}
                              {mov.tipo === 'devolucion' && <RotateCcw className="w-3 h-3" />}
                              {mov.tipo.replace('_', ' ')}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center font-mono font-bold">
                            <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                              {isPositive ? `+${mov.cantidad}` : mov.cantidad} pares
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-slate-600">
                            <span>{mov.stock_anterior}</span>
                            <span className="text-slate-400 mx-1">➔</span>
                            <span className="font-bold text-slate-900">{mov.stock_nuevo}</span>
                          </td>

                          <td className="py-3 px-4 text-slate-700">
                            {mov.motivo}
                          </td>

                          <td className="py-3 px-3 text-slate-500 text-[11px]">
                            {mov.usuario}
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

      {/* SUBTAB 3: CRITICAL REPLENISHMENT ALERTS */}
      {activeSubTab === 'alerts' && (
        <div className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm text-rose-800">
                Calzados que alcanzaron o cayeron bajo el Stock Mínimo ({criticalItems.length})
              </h3>
              <p className="text-xs text-rose-600 mt-0.5">
                Para evitar pérdidas de ventas en la zapatería, reabastece estos modelos y tallas con prioridad. Puedes pulsar "Reabastecer +10" para registrar la entrada inmediata del lote.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {criticalItems.length === 0 ? (
              <div className="col-span-3 py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-900">¡Excelente! Todos los modelos tienen stock óptimo.</p>
                <p className="text-xs text-slate-400 mt-1">Ningún calzado se encuentra por debajo de su umbral de seguridad.</p>
              </div>
            ) : (
              criticalItems.map((p) => {
                const isOutOfStock = p.stock === 0;
                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border bg-white shadow-xs flex flex-col justify-between ${
                      isOutOfStock ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          Talla {p.talla}
                        </span>
                        <span
                          className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700 font-bold'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {isOutOfStock ? 'AGOTADO' : `Quedan ${p.stock} pares`}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm">{p.nombre}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.marca} • {p.color} • SKU: {p.sku}
                      </p>

                      <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs font-mono flex justify-between">
                        <span className="text-slate-500">Umbral mínimo fijado:</span>
                        <span className="text-slate-900 font-bold">{p.stock_minimo} pares</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => handleOpenLabelModal(p)}
                        title="Imprimir etiqueta para zapato"
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs cursor-pointer border border-indigo-200 transition-colors flex items-center gap-1"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>Etiqueta</span>
                      </button>

                      <button
                        onClick={() => handleQuickRestock(p, 10)}
                        className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Reabastecer +10</span>
                      </button>

                      <button
                        onClick={() => handleOpenMovement(p)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs cursor-pointer border border-slate-200 transition-colors"
                      >
                        Lote
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal: New / Edit Product */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        editingProduct={editingProduct}
        onSave={(data) => {
          if (editingProduct) {
            updateProduct(editingProduct.id, data);
          } else {
            addProduct(data);
          }
        }}
      />

      {/* Modal: Stock Movement */}
      <StockMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        product={movementTargetProduct}
        onConfirm={(prodId, delta, motivo, type) => {
          adjustStock(prodId, delta, motivo, type);
        }}
      />

      {/* Modal: Shoe Label Print (SKU, Description & Cost) */}
      <ShoeLabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        product={labelProduct}
        exchangeRate={exchangeRate}
      />

    </div>
  );
};
