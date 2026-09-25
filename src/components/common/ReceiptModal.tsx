import React, { useState } from 'react';
import { Printer, CheckCircle, X, Download, Share2, Calendar, Edit2, Check } from 'lucide-react';
import { Sale } from '../../types';
import { useStore } from '../../context/StoreContext';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { updateSaleDate } = useStore();
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editDateValue, setEditDateValue] = useState(sale?.fecha ? sale.fecha.slice(0, 16) : '');

  if (!sale) return null;

  const handleSaveDate = () => {
    if (!editDateValue) return;
    const isoDate = new Date(editDateValue).toISOString();
    updateSaleDate(sale.id, isoDate);
    sale.fecha = isoDate;
    setIsEditingDate(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*MAKD SHOP - Comprobante de Compra*%0A` +
      `*Factura:* ${sale.numero_factura}%0A` +
      `*Cliente:* ${sale.cliente_nombre} ${sale.cliente_apellido || ''}%0A` +
      `*Fecha:* ${new Date(sale.fecha).toLocaleString()}%0A` +
      `*Total:* $${sale.total_usd.toFixed(2)} (${sale.total_bs.toFixed(0)} Bs)%0A` +
      `*Calzado:*%0A` +
      sale.items.map((it) => `- ${it.nombre_producto} (Talla: ${it.talla}) x${it.cantidad} = $${it.subtotal.toFixed(2)}`).join('%0A') +
      `%0A%0A¡Gracias por su compra en MAKD SHOP!`;

    const cleanPhone = (sale.cliente_telefono || '').replace(/\D/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('58') ? cleanPhone : '58' + cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs print:p-0 print:bg-white">
      <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full shadow-xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black my-8">
        
        {/* Top Header - Not printed */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-xs text-slate-900">Comprobante de Venta Emitido</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Content */}
        <div className="p-5 bg-white text-slate-900 font-mono text-xs">
          <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
            <h2 className="text-base font-black tracking-widest text-slate-900">MAKD SHOP</h2>
            <p className="text-[10px] text-slate-500 uppercase">Tienda Especializada en Calzado</p>
            <p className="text-[10px] text-slate-500 font-semibold whitespace-nowrap">Razón Social: MAKD SHOP, C.A. • RIF: J-50491823-1</p>
            <p className="text-[10px] text-slate-400">Ciudad Alta Vista II, Local 163, Puerto Ordaz, Edo. Bolívar</p>
            
            <div className="mt-2.5 inline-block px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold text-xs">
              FACTURA #{sale.numero_factura}
            </div>

            {/* Date with quick edit for previous days */}
            <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
              {isEditingDate ? (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md print:hidden">
                  <input
                    type="datetime-local"
                    value={editDateValue}
                    onChange={(e) => setEditDateValue(e.target.value)}
                    className="px-1.5 py-0.5 text-[10px] border border-slate-300 rounded bg-white text-slate-800"
                  />
                  <button
                    onClick={handleSaveDate}
                    className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                    title="Guardar nueva fecha"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setIsEditingDate(false)}
                    className="p-1 text-slate-500 hover:text-slate-700"
                    title="Cancelar"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span>Fecha: {new Date(sale.fecha).toLocaleString('es-VE')}</span>
                  <button
                    onClick={() => {
                      setEditDateValue(sale.fecha ? sale.fecha.slice(0, 16) : '');
                      setIsEditingDate(true);
                    }}
                    className="p-0.5 text-indigo-600 hover:text-indigo-800 rounded print:hidden cursor-pointer"
                    title="Modificar fecha de factura (días anteriores)"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Customer Details */}
          <div className="border-b border-dashed border-slate-300 pb-2.5 mb-2.5 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 shrink-0">Razón Social:</span>
              <span className="font-bold text-slate-900 truncate ml-2 text-right">
                {sale.cliente_nombre} {sale.cliente_apellido || ''}
              </span>
            </div>
            {sale.cliente_rif && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 shrink-0">Cédula / RIF:</span>
                <span className="font-mono text-slate-900">{sale.cliente_rif}</span>
              </div>
            )}
            {sale.cliente_telefono && (
              <div className="flex justify-between">
                <span className="text-slate-500">Teléfono:</span>
                <span>{sale.cliente_telefono}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Cajero:</span>
              <span>{sale.usuario}</span>
            </div>
          </div>

          {/* Items Purchased */}
          <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
            <div className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Detalle de Calzado</div>
            <div className="space-y-2">
              {sale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div>
                    <div className="font-black text-sm text-slate-900">
                      {item.nombre_producto}
                    </div>
                    <div className="text-xs text-slate-600 font-semibold mt-0.5">
                      Talla: <strong className="text-slate-900">{item.talla}</strong> | {item.cantidad} x ${item.precio_unitario.toFixed(2)}
                    </div>
                  </div>
                  <div className="font-black text-sm sm:text-base text-right text-slate-900 font-mono">
                    ${item.subtotal.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Tax Calculation */}
          <div className="border-b border-dashed border-slate-300 pb-3 mb-3 space-y-1.5 text-right text-xs sm:text-sm">
            <div className="flex justify-between text-slate-600 font-semibold">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-slate-900">${sale.subtotal_usd.toFixed(2)}</span>
            </div>
            {sale.descuento_usd > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Descuento aplicado:</span>
                <span className="font-mono font-black">-${sale.descuento_usd.toFixed(2)}</span>
              </div>
            )}
            {sale.aplica_iva && (
              <div className="flex justify-between text-slate-600 font-semibold">
                <span>IVA (16%):</span>
                <span className="font-mono font-bold text-slate-900">+${sale.iva_monto_usd.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t-2 border-slate-300">
              <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">TOTAL USD:</span>
              <span className="text-2xl sm:text-3xl font-black text-indigo-700 font-mono tracking-tight">${sale.total_usd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline text-xs sm:text-sm text-slate-700 font-bold">
              <span>TOTAL BS (Tasa {sale.tasa_cambio.toFixed(2)}):</span>
              <span className="text-base sm:text-lg font-black text-slate-900 font-mono">{sale.total_bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</span>
            </div>
          </div>

          {/* Payments Breakdown */}
          <div className="border-b border-dashed border-slate-300 pb-3 mb-3 space-y-1.5">
            <div className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Formas de Pago & Liquidación</div>
            {sale.pagos.map((p, idx) => {
              const isCashea = p.cuenta.toLowerCase().includes('cashea');
              return (
                <div key={idx} className="flex justify-between text-xs sm:text-sm items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-800 font-bold">
                      {p.cuenta} {p.referencia ? `(Ref: ${p.referencia})` : ''}:
                    </span>
                    {isCashea && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        p.estado_liquidacion === 'conciliado_en_banco'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.estado_liquidacion === 'conciliado_en_banco' ? 'Acreditado en Banco' : 'Por Conciliar'}
                      </span>
                    )}
                  </div>
                  <span className="font-black text-slate-900 font-mono">
                    {p.moneda === 'Bs' ? `${p.monto.toFixed(2)} Bs` : `$${p.monto.toFixed(2)}`}
                  </span>
                </div>
              );
            })}

            {/* Breakdown for Cashea vs Positive Immediate Income */}
            {(sale.total_cashea_pendiente_usd !== undefined && sale.total_cashea_pendiente_usd > 0) && (
              <div className="mt-2.5 pt-2 border-t border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Ingreso en Positivo (Caja/Banco):</span>
                  <span className="font-mono font-bold">${(sale.total_positivo_inmediato_usd || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-700 font-bold">
                  <span>Cashea por Conciliar en Banco:</span>
                  <span className="font-mono font-bold">${sale.total_cashea_pendiente_usd.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-center text-xs text-slate-500 pt-1 space-y-1">
            <p className="font-bold text-slate-700">¡Gracias por preferir MAKD SHOP!</p>
            <p className="text-[11px]">Cambios por talla dentro de los primeros 7 días con este comprobante.</p>
            <p className="text-[11px] font-semibold text-indigo-600">Atención al cliente: @makdshop</p>
          </div>
        </div>

        {/* Action Buttons - Not printed */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2.5 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-emerald-600/20"
          >
            <Share2 className="w-4 h-4" />
            WhatsApp
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-xs sm:text-sm cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
