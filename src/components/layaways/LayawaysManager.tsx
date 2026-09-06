import React, { useState, useMemo } from 'react';
import {
  BookmarkCheck,
  Plus,
  Search,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  Share2,
  Package,
  Phone,
  Trash2,
  CreditCard,
  User,
  ShoppingBag
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Layaway, ShoeProduct, LayawayItem, LayawayPayment } from '../../types';
import { LayawayReceiptModal } from './LayawayReceiptModal';

export const LayawaysManager: React.FC = () => {
  const {
    layaways,
    products,
    exchangeRate,
    createLayaway,
    addLayawayPayment,
    cancelLayaway,
    deliverLayaway,
    paymentAccounts,
    userRole,
  } = useStore();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activo' | 'completado' | 'cancelado'>('activo');
  
  // Modal states
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedLayawayForPayment, setSelectedLayawayForPayment] = useState<Layaway | null>(null);
  const [selectedLayawayForReceipt, setSelectedLayawayForReceipt] = useState<Layaway | null>(null);
  const [cancellingLayawayId, setCancellingLayawayId] = useState<string | null>(null);

  // New Layaway Form State
  const [clientNombre, setClientNombre] = useState('');
  const [clientApellido, setClientApellido] = useState('');
  const [clientCedula, setClientCedula] = useState('');
  const [clientTelefono, setClientTelefono] = useState('');
  const [fechaApartado, setFechaApartado] = useState(new Date().toISOString().split('T')[0]);
  
  // Expiration default: 15 days from now
  const defaultDueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  }, []);
  const [fechaVencimiento, setFechaVencimiento] = useState(defaultDueDate);
  const [notas, setNotas] = useState('');

  // Selected shoes for new layaway
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [cartItems, setCartItems] = useState<LayawayItem[]>([]);

  // Initial payment for new layaway
  const [abonoInicialMonto, setAbonoInicialMonto] = useState<number>(0);
  const [abonoMoneda, setAbonoMoneda] = useState<'USD' | 'Bs'>('USD');
  const [abonoMetodo, setAbonoMetodo] = useState('Efectivo $');
  const [abonoReferencia, setAbonoReferencia] = useState('');

  // Payment Modal State
  const [nuevoAbonoMonto, setNuevoAbonoMonto] = useState<number>(0);
  const [nuevoAbonoMoneda, setNuevoAbonoMoneda] = useState<'USD' | 'Bs'>('USD');
  const [nuevoAbonoMetodo, setNuevoAbonoMetodo] = useState('Efectivo $');
  const [nuevoAbonoRef, setNuevoAbonoRef] = useState('');

  // Calculations for new layaway
  const subtotalNuevoApartado = useMemo(() => {
    return cartItems.reduce((acc, it) => acc + it.subtotal, 0);
  }, [cartItems]);

  const abonoInicialUsd = useMemo(() => {
    if (abonoMoneda === 'Bs') {
      return exchangeRate > 0 ? abonoInicialMonto / exchangeRate : 0;
    }
    return abonoInicialMonto || 0;
  }, [abonoInicialMonto, abonoMoneda, exchangeRate]);

  const saldoRestanteNuevo = Math.max(0, subtotalNuevoApartado - abonoInicialUsd);

  // Selected Product helper
  const activeProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Handle adding an item to the new layaway cart
  const handleAddItem = () => {
    if (!activeProduct || itemQuantity <= 0) return;
    const availableStock = activeProduct.stock || 0;

    // Check existing in cart
    const existingInCart = cartItems.find((it) => it.producto_id === activeProduct.id);
    const totalDesired = (existingInCart ? existingInCart.cantidad : 0) + itemQuantity;

    if (totalDesired > availableStock) {
      alert(`Stock insuficiente. Solo quedan ${availableStock} pares disponibles para ${activeProduct.nombre} (Talla ${activeProduct.talla}).`);
      return;
    }

    if (existingInCart) {
      setCartItems((prev) =>
        prev.map((it) =>
          it.producto_id === activeProduct.id
            ? {
                ...it,
                cantidad: totalDesired,
                subtotal: totalDesired * it.precio_unitario,
              }
            : it
        )
      );
    } else {
      setCartItems((prev) => [
        ...prev,
        {
          producto_id: activeProduct.id,
          nombre_producto: activeProduct.nombre,
          sku: activeProduct.sku,
          marca: activeProduct.marca,
          talla: activeProduct.talla,
          color: activeProduct.color,
          cantidad: itemQuantity,
          precio_unitario: activeProduct.precio,
          subtotal: itemQuantity * activeProduct.precio,
        },
      ]);
    }

    setSelectedProductId('');
    setItemQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit New Layaway
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientNombre.trim()) {
      alert('Por favor introduce el nombre del cliente.');
      return;
    }
    if (cartItems.length === 0) {
      alert('Debes agregar al menos un par de calzado al apartado.');
      return;
    }

    const totalUsd = subtotalNuevoApartado;
    const totalBs = totalUsd * exchangeRate;
    const abonoUsd = abonoInicialUsd;
    const abonoBs = abonoMoneda === 'Bs' ? abonoInicialMonto : abonoInicialUsd * exchangeRate;

    const initialPayments: LayawayPayment[] = [];
    if (abonoInicialMonto > 0) {
      initialPayments.push({
        id: `pay-${Date.now()}`,
        fecha: new Date().toISOString(),
        monto: abonoInicialMonto,
        moneda: abonoMoneda,
        tasa_cambio: exchangeRate,
        monto_equivalente_usd: abonoUsd,
        cuenta: abonoMetodo,
        referencia: abonoReferencia.trim(),
        notas: 'Abono Inicial de Reserva',
      });
    }

    createLayaway({
      cliente_nombre: clientNombre.trim(),
      cliente_apellido: clientApellido.trim(),
      cliente_cedula: clientCedula.trim(),
      cliente_telefono: clientTelefono.trim(),
      items: cartItems,
      total_usd: totalUsd,
      total_bs: totalBs,
      tasa_cambio: exchangeRate,
      total_abonado_usd: abonoUsd,
      total_abonado_bs: abonoBs,
      abonos: initialPayments,
      fecha_apartado: new Date(fechaApartado).toISOString(),
      fecha_vencimiento: fechaVencimiento,
      estado: 'activo',
      usuario: userRole === 'admin' ? 'Administrador' : 'Cajera',
      notas: notas.trim(),
    });

    // Reset Form
    setIsNewModalOpen(false);
    setClientNombre('');
    setClientApellido('');
    setClientCedula('');
    setClientTelefono('');
    setCartItems([]);
    setAbonoInicialMonto(0);
    setAbonoReferencia('');
    setNotas('');
  };

  // Submit Additional Payment
  const handleAddPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLayawayForPayment || nuevoAbonoMonto <= 0) return;

    const montoUsd = nuevoAbonoMoneda === 'Bs'
      ? nuevoAbonoMonto / exchangeRate
      : nuevoAbonoMonto;

    addLayawayPayment(selectedLayawayForPayment.id, {
      fecha: new Date().toISOString(),
      monto: nuevoAbonoMonto,
      moneda: nuevoAbonoMoneda,
      tasa_cambio: exchangeRate,
      monto_equivalente_usd: montoUsd,
      cuenta: nuevoAbonoMetodo,
      referencia: nuevoAbonoRef.trim(),
      notas: 'Abono a saldo restante',
    });

    setSelectedLayawayForPayment(null);
    setNuevoAbonoMonto(0);
    setNuevoAbonoRef('');
  };

  // WhatsApp Reminder
  const handleSendWhatsAppReminder = (layaway: Layaway) => {
    const text = `*Recordatorio de Apartado - MAKD SHOP*%0A%0A` +
      `Estimado(a) *${layaway.cliente_nombre}*, le saludamos de MAKD SHOP para recordarle que su apartado *#${layaway.codigo_apartado}* tiene fecha límite el *${new Date(layaway.fecha_vencimiento).toLocaleDateString('es-VE')}*.%0A%0A` +
      `*Calzados Apartados:*%0A` +
      layaway.items.map((it) => `- ${it.nombre_producto} (Talla: ${it.talla})`).join('%0A') +
      `%0A%0A*Total:* $${layaway.total_usd.toFixed(2)}%0A` +
      `*Abonado:* $${layaway.total_abonado_usd.toFixed(2)}%0A` +
      `*SALDO PENDIENTE:* $${layaway.saldo_pendiente_usd.toFixed(2)} (${layaway.saldo_pendiente_bs.toFixed(0)} Bs)%0A%0A` +
      `¡Le esperamos en nuestra tienda en Alta Vista II para completar su entrega!`;

    const cleanPhone = (layaway.cliente_telefono || '').replace(/\D/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('58') ? cleanPhone : '58' + cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  // Aggregated Stats
  const activeLayaways = useMemo(() => {
    return layaways.filter((l) => l.estado === 'activo');
  }, [layaways]);

  const totalActivosCount = activeLayaways.length;
  const totalActivosUsd = useMemo(() => {
    return activeLayaways.reduce((sum, l) => sum + l.total_usd, 0);
  }, [activeLayaways]);

  const totalSaldoPendienteUsd = useMemo(() => {
    return activeLayaways.reduce((sum, l) => sum + l.saldo_pendiente_usd, 0);
  }, [activeLayaways]);

  const totalParesReservados = useMemo(() => {
    return activeLayaways.reduce(
      (sum, l) => sum + l.items.reduce((acc, it) => acc + it.cantidad, 0),
      0
    );
  }, [activeLayaways]);

  const totalCompletadosCount = useMemo(() => {
    return layaways.filter((l) => l.estado === 'completado').length;
  }, [layaways]);

  // Filtered List
  const filteredLayaways = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return layaways.filter((l) => {
      const matchesStatus = statusFilter === 'todos' ? true : l.estado === statusFilter;
      const matchesSearch =
        !q ||
        l.codigo_apartado.toLowerCase().includes(q) ||
        l.cliente_nombre.toLowerCase().includes(q) ||
        (l.cliente_apellido && l.cliente_apellido.toLowerCase().includes(q)) ||
        (l.cliente_cedula && l.cliente_cedula.toLowerCase().includes(q)) ||
        (l.cliente_telefono && l.cliente_telefono.includes(q)) ||
        l.items.some((it) => it.nombre_producto.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [layaways, statusFilter, searchTerm]);

  // Check if nearing due date or expired
  const getDueStatus = (dueDateStr: string, status: string) => {
    if (status !== 'activo') return null;
    const now = new Date().setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr).setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Vencido (${Math.abs(diffDays)}d)`, color: 'bg-rose-100 text-rose-700 border-rose-200' };
    }
    if (diffDays <= 3) {
      return { label: `Vence en ${diffDays}d`, color: 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse' };
    }
    return { label: `${diffDays} días restantes`, color: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Top Banner / Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-indigo-600" />
            Sistema de Apartados y Reservas
          </h2>
          <p className="text-xs text-slate-500">
            Control de calzado apartado, abonos fraccionados y fechas de entrega para MAKD SHOP.
          </p>
        </div>

        <button
          id="new-layaway-btn"
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Apartado</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Apartados Activos</span>
            <BookmarkCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {totalActivosCount}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            Valor total: ${totalActivosUsd.toFixed(2)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Saldo por Cobrar</span>
            <DollarSign className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600">
            ${totalSaldoPendienteUsd.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            ≈ {(totalSaldoPendienteUsd * exchangeRate).toFixed(0)} Bs
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Pares Reservados</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {totalParesReservados}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Zapatos apartados en bodega
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold">Completados / Entregados</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {totalCompletadosCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Calzados retirados con éxito
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {(['todos', 'activo', 'completado', 'cancelado'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status === 'todos' ? 'Todos los Estados' : status === 'activo' ? 'En Curso (Activos)' : status === 'completado' ? 'Completados / Retirados' : 'Cancelados'}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, código, teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Layaways List / Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Código</th>
                <th className="py-3 px-4 font-semibold">Cliente</th>
                <th className="py-3 px-4 font-semibold">Calzado Reservado</th>
                <th className="py-3 px-3 font-semibold">Fechas</th>
                <th className="py-3 px-3 text-right font-semibold">Total ($)</th>
                <th className="py-3 px-3 text-right font-semibold">Abonado ($)</th>
                <th className="py-3 px-3 text-right font-semibold">Saldo Pendiente</th>
                <th className="py-3 px-3 text-center font-semibold">Estado</th>
                <th className="py-3 px-4 text-center font-semibold">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredLayaways.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No se encontraron apartados con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredLayaways.map((layaway) => {
                  const percentPaid = layaway.total_usd > 0
                    ? Math.min(100, (layaway.total_abonado_usd / layaway.total_usd) * 100)
                    : 100;
                  const isFullyPaid = layaway.saldo_pendiente_usd <= 0.05;
                  const dueStatus = getDueStatus(layaway.fecha_vencimiento, layaway.estado);

                  return (
                    <tr key={layaway.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        #{layaway.codigo_apartado}
                      </td>

                      {/* Client */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {layaway.cliente_nombre} {layaway.cliente_apellido || ''}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          {layaway.cliente_cedula && <span>{layaway.cliente_cedula}</span>}
                          {layaway.cliente_telefono && (
                            <span className="flex items-center gap-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              {layaway.cliente_telefono}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Reserved Shoes */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {layaway.items.map((it, idx) => (
                            <div key={idx} className="text-[11px] text-slate-700">
                              <span className="font-medium">{it.cantidad}x {it.nombre_producto}</span>{' '}
                              <span className="text-slate-400 font-semibold">(Talla: {it.talla})</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-3 text-[11px]">
                        <div className="text-slate-600">
                          Ini: {new Date(layaway.fecha_apartado).toLocaleDateString('es-VE')}
                        </div>
                        <div className="text-slate-500 font-medium">
                          Vence: {new Date(layaway.fecha_vencimiento).toLocaleDateString('es-VE')}
                        </div>
                        {dueStatus && (
                          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border ${dueStatus.color}`}>
                            {dueStatus.label}
                          </span>
                        )}
                      </td>

                      {/* Total USD */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ${layaway.total_usd.toFixed(2)}
                      </td>

                      {/* Abonado */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-semibold text-emerald-600">
                          ${layaway.total_abonado_usd.toFixed(2)}
                        </div>
                        {/* Mini progress bar */}
                        <div className="w-16 ml-auto bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              percentPaid >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${percentPaid}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {percentPaid.toFixed(0)}%
                        </span>
                      </td>

                      {/* Saldo Pendiente */}
                      <td className="py-3 px-3 text-right">
                        <div className={`font-mono font-bold text-xs ${
                          isFullyPaid ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          ${layaway.saldo_pendiente_usd.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {layaway.saldo_pendiente_bs.toFixed(0)} Bs
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          layaway.estado === 'completado'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : layaway.estado === 'cancelado'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : isFullyPaid
                            ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        }`}>
                          {layaway.estado === 'activo' && isFullyPaid ? 'Listo para entrega' : layaway.estado}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Add Payment button */}
                          {layaway.estado === 'activo' && !isFullyPaid && (
                            <button
                              onClick={() => {
                                setSelectedLayawayForPayment(layaway);
                                setNuevoAbonoMonto(0);
                              }}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-bold border border-indigo-200 cursor-pointer"
                              title="Registrar Abono"
                            >
                              + Abono
                            </button>
                          )}

                          {/* Deliver button if fully paid or manager decision */}
                          {layaway.estado === 'activo' && isFullyPaid && (
                            <button
                              onClick={() => deliverLayaway(layaway.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Entregar Calzado al Cliente"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Entregar
                            </button>
                          )}

                          {/* WhatsApp Reminder */}
                          {layaway.cliente_telefono && layaway.estado === 'activo' && (
                            <button
                              onClick={() => handleSendWhatsAppReminder(layaway)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                              title="Enviar recordatorio por WhatsApp"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Print Receipt */}
                          <button
                            onClick={() => setSelectedLayawayForReceipt(layaway)}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded cursor-pointer"
                            title="Ver / Imprimir Comprobante"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Cancel Layaway */}
                          {layaway.estado === 'activo' && (
                            <button
                              onClick={() => setCancellingLayawayId(layaway.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              title="Anular Apartado (reintegra stock)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* MODAL: NUEVO APARTADO */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-5 sm:p-6 shadow-xl space-y-4 my-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Crear Nuevo Apartado de Calzado
                </h3>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Client Information */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  Datos del Cliente
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Carlos"
                      value={clientNombre}
                      onChange={(e) => setClientNombre(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Apellido</label>
                    <input
                      type="text"
                      placeholder="Ej: Mendoza"
                      value={clientApellido}
                      onChange={(e) => setClientApellido(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Cédula / RIF</label>
                    <input
                      type="text"
                      placeholder="Ej: V-24123456"
                      value={clientCedula}
                      onChange={(e) => setClientCedula(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-medium block mb-1">Teléfono (WhatsApp)</label>
                    <input
                      type="text"
                      placeholder="Ej: 0414-1234567"
                      value={clientTelefono}
                      onChange={(e) => setClientTelefono(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Shoes Selection */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                  Seleccionar Calzado a Reservar
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-8">
                    <label className="text-slate-500 font-medium block mb-1">Modelo de Zapato y Talla</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                    >
                      <option value="">-- Seleccionar Calzado del Catálogo --</option>
                      {products
                        .filter((p) => p.activo && p.stock > 0)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({p.marca}) - Talla {p.talla} (${p.precio.toFixed(2)}) [{p.stock} disp.]
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-slate-500 font-medium block mb-1">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      max={activeProduct ? activeProduct.stock : 1}
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!selectedProductId}
                      className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg font-bold shadow-2xs cursor-pointer transition-colors"
                    >
                      + Agregar
                    </button>
                  </div>
                </div>

                {/* Items Cart */}
                {cartItems.length > 0 && (
                  <div className="mt-2 border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <div className="p-2 bg-slate-100 font-semibold text-[11px] text-slate-700 border-b border-slate-200 flex justify-between">
                      <span>Calzados a Apartar ({cartItems.length})</span>
                      <span>Subtotal: ${subtotalNuevoApartado.toFixed(2)}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {cartItems.map((item, idx) => (
                        <div key={idx} className="p-2 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-900">{item.nombre_producto}</div>
                            <div className="text-[10px] text-slate-500">
                              {item.marca} • Talla: <span className="font-bold text-slate-800">{item.talla}</span> • Cant: {item.cantidad}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-900">
                              ${item.subtotal.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dates & Deadlines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Fecha del Apartado
                  </label>
                  <input
                    type="date"
                    value={fechaApartado}
                    onChange={(e) => setFechaApartado(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400">Puedes modificar si fue en días previos</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                    <Clock className="w-3.5 h-3.5 text-rose-600" />
                    Fecha Límite (Vencimiento)
                  </label>
                  <input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                  />
                  <div className="flex gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 15);
                        setFechaVencimiento(d.toISOString().split('T')[0]);
                      }}
                      className="text-[10px] px-2 py-0.5 bg-slate-200 rounded text-slate-700 hover:bg-slate-300"
                    >
                      +15 días
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 30);
                        setFechaVencimiento(d.toISOString().split('T')[0]);
                      }}
                      className="text-[10px] px-2 py-0.5 bg-slate-200 rounded text-slate-700 hover:bg-slate-300"
                    >
                      +30 días
                    </button>
                  </div>
                </div>
              </div>

              {/* Initial Payment (Abono Inicial) */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  Abono Inicial Recibido
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-slate-500 font-medium block mb-1">Monto Abonado</label>
                    <div className="flex">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={abonoInicialMonto || ''}
                        onChange={(e) => setAbonoInicialMonto(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-l-lg text-slate-900 font-mono font-bold"
                      />
                      <select
                        value={abonoMoneda}
                        onChange={(e) => setAbonoMoneda(e.target.value as 'USD' | 'Bs')}
                        className="px-2 bg-slate-100 border-y border-r border-slate-200 rounded-r-lg font-bold text-slate-700"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="Bs">Bs</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-500 font-medium block mb-1">Método de Pago</label>
                    <select
                      value={abonoMetodo}
                      onChange={(e) => setAbonoMetodo(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                    >
                      {paymentAccounts.map((acc) => (
                        <option key={acc.id} value={acc.nombre}>
                          {acc.nombre} ({acc.tipo})
                        </option>
                      ))}
                      <option value="Efectivo $">Efectivo $</option>
                      <option value="Efectivo Bs">Efectivo Bs</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 font-medium block mb-1">Referencia Bancaria</label>
                    <input
                      type="text"
                      placeholder="Últimos 4 dígitos o ref"
                      value={abonoReferencia}
                      onChange={(e) => setAbonoReferencia(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                    />
                  </div>
                </div>

                {/* Balance summary */}
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Abono Inicial: </span>
                    <span className="font-mono font-bold text-emerald-600">
                      ${abonoInicialUsd.toFixed(2)} ({(abonoInicialUsd * exchangeRate).toFixed(0)} Bs)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Saldo Restante: </span>
                    <span className="font-mono font-bold text-rose-600 text-sm">
                      ${saldoRestanteNuevo.toFixed(2)} ({(saldoRestanteNuevo * exchangeRate).toFixed(0)} Bs)
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-slate-600 font-medium block mb-1">Notas / Observaciones</label>
                <input
                  type="text"
                  placeholder="Ej: Cliente retirará sábado en la tarde..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cartItems.length === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  Crear y Reservar Calzado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR ABONO ADICIONAL */}
      {selectedLayawayForPayment && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Registrar Abono a Apartado #{selectedLayawayForPayment.codigo_apartado}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cliente: {selectedLayawayForPayment.cliente_nombre} {selectedLayawayForPayment.cliente_apellido || ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLayawayForPayment(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddPaymentSubmit} className="space-y-3.5 text-xs">
              {/* Balance Summary Box */}
              <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-1">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Total Apartado:</span>
                  <span className="font-mono">${selectedLayawayForPayment.total_usd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 text-[11px]">
                  <span>Ya Abonado:</span>
                  <span className="font-mono">-${selectedLayawayForPayment.total_abonado_usd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-slate-800 pt-1 text-white">
                  <span>SALDO PENDIENTE:</span>
                  <span className="font-mono text-rose-400">
                    ${selectedLayawayForPayment.saldo_pendiente_usd.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>En Bolívares (Tasa BCV {exchangeRate.toFixed(2)}):</span>
                  <span>{selectedLayawayForPayment.saldo_pendiente_bs.toFixed(0)} Bs</span>
                </div>
              </div>

              {/* Payment Input */}
              <div>
                <label className="text-slate-600 font-medium block mb-1">Monto a Abonar</label>
                <div className="flex">
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={nuevoAbonoMonto || ''}
                    onChange={(e) => setNuevoAbonoMonto(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-l-lg text-slate-900 font-mono font-bold text-sm"
                  />
                  <select
                    value={nuevoAbonoMoneda}
                    onChange={(e) => setNuevoAbonoMoneda(e.target.value as 'USD' | 'Bs')}
                    className="px-3 bg-slate-100 border-y border-r border-slate-200 rounded-r-lg font-bold text-slate-700"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="Bs">Bs</option>
                  </select>
                </div>
                {/* Quick full-pay button */}
                <div className="mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (nuevoAbonoMoneda === 'USD') {
                        setNuevoAbonoMonto(selectedLayawayForPayment.saldo_pendiente_usd);
                      } else {
                        setNuevoAbonoMonto(selectedLayawayForPayment.saldo_pendiente_bs);
                      }
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    Saldar Total Restante
                  </button>
                </div>
              </div>

              {/* Method */}
              <div>
                <label className="text-slate-600 font-medium block mb-1">Método / Cuenta</label>
                <select
                  value={nuevoAbonoMetodo}
                  onChange={(e) => setNuevoAbonoMetodo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                >
                  {paymentAccounts.map((acc) => (
                    <option key={acc.id} value={acc.nombre}>
                      {acc.nombre} ({acc.tipo})
                    </option>
                  ))}
                  <option value="Efectivo $">Efectivo $</option>
                  <option value="Efectivo Bs">Efectivo Bs</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="text-slate-600 font-medium block mb-1">Referencia Bancaria</label>
                <input
                  type="text"
                  placeholder="Número de referencia o confirmación"
                  value={nuevoAbonoRef}
                  onChange={(e) => setNuevoAbonoRef(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedLayawayForPayment(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={nuevoAbonoMonto <= 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  Registrar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION: CANCEL LAYAWAY */}
      {cancellingLayawayId && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900">¿Anular este apartado?</h3>
            </div>
            <p className="text-xs text-slate-500">
              Los calzados reservados se reincorporarán inmediatamente al inventario disponible de la tienda.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancellingLayawayId(null)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                No, mantener
              </button>
              <button
                onClick={() => {
                  cancelLayaway(cancellingLayawayId);
                  setCancellingLayawayId(null);
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Sí, anular y liberar stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRINT / VIEW LAYAWAY RECEIPT */}
      <LayawayReceiptModal
        layaway={selectedLayawayForReceipt}
        onClose={() => setSelectedLayawayForReceipt(null)}
      />
    </div>
  );
};
