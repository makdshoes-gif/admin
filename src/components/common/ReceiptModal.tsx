import React from 'react';
import { Printer, CheckCircle, X, Download, Share2 } from 'lucide-react';
import { Sale } from '../../types';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  if (!sale) return null;

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
            <p className="text-[10px] text-slate-400">RIF: J-50491823-1</p>
            <p className="text-[10px] text-slate-400">Av. Principal de Las Mercedes, Caracas</p>
            
            <div className="mt-2.5 inline-block px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold text-xs">
              FACTURA #{sale.numero_factura}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Fecha: {new Date(sale.fecha).toLocaleString('es-VE')}
            </p>
          </div>

          {/* Customer Details */}
          <div className="border-b border-dashed border-slate-300 pb-2.5 mb-2.5 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Cliente:</span>
              <span className="font-bold text-slate-900">
                {sale.cliente_nombre} {sale.cliente_apellido || ''}
              </span>
            </div>
            {sale.cliente_rif && (
              <div className="flex justify-between">
                <span className="text-slate-500">Cédula/RIF:</span>
                <span>{sale.cliente_rif}</span>
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
          <div className="border-b border-dashed border-slate-300 pb-2.5 mb-2.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Detalle de Calzado</div>
            <div className="space-y-1.5">
              {sale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {item.nombre_producto}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Talla: {item.talla} | {item.cantidad} x ${item.precio_unitario.toFixed(2)}
                    </div>
                  </div>
                  <div className="font-bold text-right text-slate-900">
                    ${item.subtotal.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals & Tax Calculation */}
          <div className="border-b border-dashed border-slate-300 pb-2.5 mb-2.5 space-y-1 text-right">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>${sale.subtotal_usd.toFixed(2)}</span>
            </div>
            {sale.descuento_usd > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Descuento aplicado:</span>
                <span>-${sale.descuento_usd.toFixed(2)}</span>
              </div>
            )}
            {sale.aplica_iva && (
              <div className="flex justify-between text-slate-500">
                <span>IVA (16%):</span>
                <span>+${sale.iva_monto_usd.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>TOTAL USD:</span>
              <span className="text-indigo-600 font-bold">${sale.total_usd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>TOTAL BS (Tasa {sale.tasa_cambio.toFixed(2)}):</span>
              <span>{sale.total_bs.toFixed(0)} Bs</span>
            </div>
          </div>

          {/* Payments Breakdown */}
          <div className="border-b border-dashed border-slate-300 pb-2.5 mb-2.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Formas de Pago</div>
            {sale.pagos.map((p, idx) => (
              <div key={idx} className="flex justify-between text-[11px]">
                <span className="text-slate-600">
                  {p.cuenta} {p.referencia ? `(Ref: ${p.referencia})` : ''}:
                </span>
                <span className="font-semibold text-slate-900">
                  {p.moneda === 'Bs' ? `${p.monto.toFixed(2)} Bs` : `$${p.monto.toFixed(2)}`}
                </span>
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <div className="text-center text-[10px] text-slate-400 pt-1 space-y-0.5">
            <p className="font-semibold text-slate-600">¡Gracias por preferir MAKD SHOP!</p>
            <p>Cambios por talla dentro de los primeros 7 días con este comprobante.</p>
            <p>Atención al cliente: @makdshop</p>
          </div>
        </div>

        {/* Action Buttons - Not printed */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            onClick={onClose}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg font-medium text-xs cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
