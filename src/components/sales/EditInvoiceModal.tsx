import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileEdit,
  User,
  Calendar,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Save,
  CheckCircle2,
  Trash2,
  Plus,
  ArrowRight,
  Sparkles,
  Ban,
  Clock,
  Phone,
  CreditCard,
  Building2,
  HelpCircle
} from 'lucide-react';
import { Sale, SaleItem, SalePayment, Currency } from '../../types';
import { useStore } from '../../context/StoreContext';

interface EditInvoiceModalProps {
  sale: Sale | null;
  isOpen?: boolean;
  onClose: () => void;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  sale,
  isOpen = true,
  onClose,
}) => {
  const { accounts, exchangeRate, updateSale, annulSale, products } = useStore();

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientRif, setClientRif] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [vendor, setVendor] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [correctionReason, setCorrectionReason] = useState('');
  const [discountUsd, setDiscountUsd] = useState(0);
  const [applyIva, setApplyIva] = useState(false);
  const [ivaPercent, setIvaPercent] = useState(16);
  const [activeTab, setActiveTab] = useState<'general' | 'items' | 'pagos'>('general');
  const [isAnnulConfirmOpen, setIsAnnulConfirmOpen] = useState(false);
  const [annulReason, setAnnulReason] = useState('');

  // Load sale data when modal opens
  useEffect(() => {
    if (sale) {
      setClientName(sale.cliente_nombre || '');
      setClientLastName(sale.cliente_apellido || '');
      setClientRif(sale.cliente_rif || '');
      setClientPhone(sale.cliente_telefono || '');
      // Format date for datetime-local input: YYYY-MM-DDTHH:mm
      try {
        const d = new Date(sale.fecha);
        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setSaleDate(localIso);
      } catch {
        setSaleDate(sale.fecha ? sale.fecha.slice(0, 16) : '');
      }
      setVendor(sale.usuario || 'Cajera');
      setItems(sale.items ? JSON.parse(JSON.stringify(sale.items)) : []);
      setPayments(sale.pagos ? JSON.parse(JSON.stringify(sale.pagos)) : []);
      setDiscountUsd(sale.descuento_usd || 0);
      setApplyIva(Boolean(sale.aplica_iva));
      setIvaPercent(sale.porcentaje_iva || 16);
      setCorrectionReason('');
      setIsAnnulConfirmOpen(false);
      setAnnulReason('');
      setActiveTab('general');
    }
  }, [sale, isOpen]);

  // Recalculate totals
  const subtotalUsd = useMemo(() => {
    return items.reduce((sum, it) => sum + it.cantidad * it.precio_unitario, 0);
  }, [items]);

  const baseAfterDiscount = Math.max(0, subtotalUsd - (discountUsd || 0));
  const ivaUsd = applyIva ? (baseAfterDiscount * ivaPercent) / 100 : 0;
  const totalUsd = baseAfterDiscount + ivaUsd;
  const totalBs = totalUsd * (sale?.tasa_cambio || exchangeRate);

  // Payments total
  const totalPaidUsd = useMemo(() => {
    return payments.reduce((sum, p) => sum + (p.monto_equivalente_usd || 0), 0);
  }, [payments]);

  const paymentDifference = Math.abs(totalUsd - totalPaidUsd);
  const isPaymentBalanced = paymentDifference < 0.05;

  if (!isOpen || !sale) return null;

  const handleItemQtyChange = (index: number, delta: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      const newQty = Math.max(1, item.cantidad + delta);
      item.cantidad = newQty;
      item.subtotal = item.cantidad * item.precio_unitario;
      updated[index] = item;
      return updated;
    });
  };

  const handleItemPriceChange = (index: number, newPrice: number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.precio_unitario = Math.max(0, newPrice);
      item.subtotal = item.cantidad * item.precio_unitario;
      updated[index] = item;
      return updated;
    });
  };

  const handlePaymentChange = (
    index: number,
    field: 'cuenta' | 'monto' | 'referencia',
    value: any
  ) => {
    setPayments((prev) => {
      const updated = [...prev];
      const p = { ...updated[index] };

      if (field === 'cuenta') {
        p.cuenta = value;
        const matchedAccount = accounts.find((a) => a.nombre === value);
        if (matchedAccount) {
          p.moneda = matchedAccount.moneda as Currency;
          if (p.moneda === 'Bs') {
            p.tasa = sale.tasa_cambio || exchangeRate;
            p.monto_equivalente_usd = p.tasa > 0 ? p.monto / p.tasa : 0;
          } else {
            p.tasa = 1;
            p.monto_equivalente_usd = p.monto;
          }
        }
      } else if (field === 'monto') {
        const numVal = parseFloat(value) || 0;
        p.monto = numVal;
        if (p.moneda === 'Bs') {
          p.monto_equivalente_usd = p.tasa > 0 ? numVal / p.tasa : 0;
        } else {
          p.monto_equivalente_usd = numVal;
        }
      } else if (field === 'referencia') {
        p.referencia = value;
      }

      updated[index] = p;
      return updated;
    });
  };

  const handleAddPaymentRow = () => {
    const defaultAcc = accounts[0] || { nombre: 'Efectivo USD', moneda: 'USD' };
    const missingUsd = Math.max(0, totalUsd - totalPaidUsd);
    const isBs = defaultAcc.moneda === 'Bs';
    const rate = sale.tasa_cambio || exchangeRate;

    setPayments((prev) => [
      ...prev,
      {
        id: `pay-${Date.now()}`,
        cuenta: defaultAcc.nombre,
        moneda: defaultAcc.moneda as Currency,
        monto: isBs ? missingUsd * rate : missingUsd,
        tasa: isBs ? rate : 1,
        monto_equivalente_usd: missingUsd,
      },
    ]);
  };

  const handleRemovePaymentRow = (index: number) => {
    if (payments.length <= 1) return;
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAutoEqualizePayment = () => {
    if (payments.length === 0) return;
    // Set first payment or selected to cover the difference
    setPayments((prev) => {
      const updated = [...prev];
      const p = { ...updated[0] };
      if (p.moneda === 'Bs') {
        p.monto = totalUsd * (sale.tasa_cambio || exchangeRate);
        p.monto_equivalente_usd = totalUsd;
      } else {
        p.monto = totalUsd;
        p.monto_equivalente_usd = totalUsd;
      }
      return [p];
    });
  };

  const handleSaveCorrection = () => {
    // Construct final sale date
    let finalDateIso = sale.fecha;
    if (saleDate) {
      try {
        finalDateIso = new Date(saleDate).toISOString();
      } catch {
        finalDateIso = sale.fecha;
      }
    }

    // Cost recalculation
    let totalCosto = 0;
    items.forEach((it) => {
      totalCosto += (it.costo_unitario || 0) * it.cantidad;
    });
    const gananciaNeta = totalUsd - totalCosto;

    const success = updateSale(
      sale.id,
      {
        cliente_nombre: clientName.trim() || 'Consumidor',
        cliente_apellido: clientLastName.trim() || '',
        cliente_rif: clientRif.trim() || undefined,
        cliente_telefono: clientPhone.trim() || undefined,
        usuario: vendor,
        fecha: finalDateIso,
        items,
        subtotal_usd: subtotalUsd,
        descuento_usd: discountUsd,
        aplica_iva: applyIva,
        porcentaje_iva: ivaPercent,
        iva_monto_usd: ivaUsd,
        total_usd: totalUsd,
        total_bs: totalBs,
        costo_total_usd: totalCosto,
        ganancia_neta_usd: gananciaNeta,
        pagos: payments,
      },
      correctionReason.trim() || 'Corrección de datos de factura'
    );

    if (success) {
      onClose();
    }
  };

  const handleExecuteAnnulment = () => {
    const success = annulSale(
      sale.id,
      annulReason.trim() || 'Anulación por error en registro de factura'
    );
    if (success) {
      onClose();
    }
  };

  if (!sale || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  Arreglar Factura #{sale.numero_factura}
                </h2>
                {sale.estado === 'anulada' ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    ANULADA
                  </span>
                ) : sale.estado === 'modificada' ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    MODIFICADA
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    COMPLETADA
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Corrige errores en datos de cliente, métodos de pago, fecha o pares vendidos.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning if already annulled */}
        {sale.estado === 'anulada' && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-2.5 flex items-center gap-2 text-xs text-rose-700">
            <Ban className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Esta factura está anulada.</strong> Los pares vendidos ya fueron restituidos al
              inventario ({sale.anulada_motivo || 'Sin motivo especificado'}).
            </span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>1. Cliente & Fecha</span>
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'items'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>2. Zapatos & Cantidad ({items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pagos')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pagos'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>3. Pagos & Billeteras</span>
            {!isPaymentBalanced && (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="Montos no cuadran" />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: General (Client, Date, Vendor) */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre del Cliente:
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej. Juan"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Apellido del Cliente:
                  </label>
                  <input
                    type="text"
                    value={clientLastName}
                    onChange={(e) => setClientLastName(e.target.value)}
                    placeholder="Ej. Pérez"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cédula / RIF:
                  </label>
                  <input
                    type="text"
                    value={clientRif}
                    onChange={(e) => setClientRif(e.target.value)}
                    placeholder="Ej. V-12345678"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono (WhatsApp):
                  </label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Ej. 0414-1234567"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Fecha y Hora de la Factura:</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Permite cambiar la fecha al día anterior o corregir el horario de venta.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Cajero / Vendedor Asignado:</span>
                  </label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="Ej. Cajera 1 / Admin"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo o Razón de la Corrección:
                </label>
                <input
                  type="text"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Ej. Se corrigió número de cédula y se cambió método de pago a Efectivo USD"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Items & Quantities */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Ajuste automático de stock:</strong> Si aumentas o disminuyes la cantidad
                  de pares vendidos, el inventario del calzado se sumará o restará automáticamente al
                  guardar los cambios.
                </span>
              </div>

              <div className="space-y-2.5">
                {items.map((item, index) => {
                  return (
                    <div
                      key={index}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {item.nombre_producto}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Marca: <span className="font-semibold text-slate-700">{item.marca}</span>{' '}
                          • Talla: <span className="font-bold text-indigo-600">{item.talla}</span> •
                          SKU: {item.sku}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleItemQtyChange(index, -1)}
                            disabled={item.cantidad <= 1}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40 cursor-pointer text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="px-3 py-1 font-mono font-bold text-xs text-slate-800">
                            {item.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleItemQtyChange(index, 1)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer text-xs font-bold"
                          >
                            +
                          </button>
                        </div>

                        {/* Unit Price */}
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400">Precio Unit:</div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-600">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.precio_unitario}
                              onChange={(e) =>
                                handleItemPriceChange(index, parseFloat(e.target.value) || 0)
                              }
                              className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold border border-slate-300 rounded text-right"
                            />
                          </div>
                        </div>

                        {/* Line Subtotal */}
                        <div className="w-20 text-right">
                          <div className="text-[10px] text-slate-400">Subtotal:</div>
                          <div className="font-mono font-bold text-xs text-slate-900">
                            ${(item.cantidad * item.precio_unitario).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Bar */}
              <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Total Venta Recalculado:</span>
                <div className="text-right font-mono">
                  <span className="text-base font-bold text-indigo-600">
                    ${totalUsd.toFixed(2)} USD
                  </span>
                  <span className="text-slate-400 mx-1.5">•</span>
                  <span className="text-xs font-bold text-slate-800">
                    {totalBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Payments Breakdown */}
          {activeTab === 'pagos' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <div className="text-xs text-slate-500">Monto total de la factura:</div>
                  <div className="text-base font-bold font-mono text-slate-900">
                    ${totalUsd.toFixed(2)} USD{' '}
                    <span className="text-xs text-slate-500 font-normal">
                      (~{totalBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Total asignado en pagos:</div>
                    <div
                      className={`text-base font-bold font-mono ${
                        isPaymentBalanced ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      ${totalPaidUsd.toFixed(2)} USD
                    </div>
                  </div>

                  {!isPaymentBalanced && (
                    <button
                      onClick={handleAutoEqualizePayment}
                      className="px-2.5 py-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs cursor-pointer"
                    >
                      Cuadrar al 100%
                    </button>
                  )}
                </div>
              </div>

              {/* Payments List */}
              <div className="space-y-3">
                {payments.map((pago, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      {/* Account select */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Cuenta / Billetera:
                        </label>
                        <select
                          value={pago.cuenta}
                          onChange={(e) => handlePaymentChange(idx, 'cuenta', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-800"
                        >
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.nombre}>
                              {acc.nombre} ({acc.moneda})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Monto */}
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Monto ({pago.moneda}):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={pago.monto}
                          onChange={(e) => handlePaymentChange(idx, 'monto', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                        />
                      </div>

                      {/* Referencia */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          Nro. de Referencia:
                        </label>
                        <input
                          type="text"
                          value={pago.referencia || ''}
                          onChange={(e) => handlePaymentChange(idx, 'referencia', e.target.value)}
                          placeholder="Ej. #948271 (Opcional)"
                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                        />
                      </div>

                      {/* Delete */}
                      <div className="sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleRemovePaymentRow(idx)}
                          disabled={payments.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer rounded-lg hover:bg-rose-50"
                          title="Eliminar forma de pago"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between font-mono bg-slate-50 px-2.5 py-1 rounded">
                      <span>Equivalente en USD:</span>
                      <span className="font-bold text-slate-800">
                        ${pago.monto_equivalente_usd.toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddPaymentRow}
                className="w-full py-2 border border-dashed border-slate-300 hover:border-indigo-500 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50/50 flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Otra Forma de Pago (Pago Mixto)</span>
              </button>
            </div>
          )}

          {/* Annulment Confirmation Dialog Box */}
          {isAnnulConfirmOpen && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>¿Estás seguro de anular la Factura #{sale.numero_factura}?</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                Al anular esta factura:
                <br />• Se regresarán automáticamente{' '}
                <strong>{items.reduce((s, i) => s + i.cantidad, 0)} pares de zapatos</strong> al
                inventario de la tienda.
                <br />• Se descontarán los saldos cobrados de las respectivas cuentas y billeteras.
                <br />• La factura quedará registrada como <strong>ANULADA</strong> para que no sume
                al arqueo de caja de hoy.
              </p>
              <div>
                <label className="block text-xs font-bold text-rose-900 mb-1">
                  Motivo de Anulación (Requerido):
                </label>
                <input
                  type="text"
                  value={annulReason}
                  onChange={(e) => setAnnulReason(e.target.value)}
                  placeholder="Ej. Factura duplicada / Cliente canceló compra"
                  className="w-full px-3 py-2 text-xs border border-rose-300 rounded-lg bg-white text-slate-800"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAnnulConfirmOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Regresar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAnnulment}
                  className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer"
                >
                  Sí, Confirmar Anulación
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {sale.estado !== 'anulada' && !isAnnulConfirmOpen && (
              <button
                type="button"
                onClick={() => setIsAnnulConfirmOpen(true)}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1.5 cursor-pointer transition w-full sm:w-auto justify-center"
              >
                <Ban className="w-4 h-4" />
                <span>Anular Factura</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSaveCorrection}
              disabled={sale.estado === 'anulada'}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Corrección</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
