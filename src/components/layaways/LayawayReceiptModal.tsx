import React from 'react';
import { Printer, CheckCircle, X, Share2, Calendar, ShieldCheck, Clock } from 'lucide-react';
import { Layaway } from '../../types';

interface LayawayReceiptModalProps {
  layaway: Layaway | null;
  onClose: () => void;
}

export const LayawayReceiptModal: React.FC<LayawayReceiptModalProps> = ({ layaway, onClose }) => {
  if (!layaway) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*MAKD SHOP - Comprobante de Apartado*%0A` +
      `*Código:* ${layaway.codigo_apartado}%0A` +
      `*Cliente:* ${layaway.cliente_nombre} ${layaway.cliente_apellido || ''}%0A` +
      `*Fecha de Apartado:* ${new Date(layaway.fecha_apartado).toLocaleDateString('es-VE')}%0A` +
      `*Fecha Límite:* ${new Date(layaway.fecha_vencimiento).toLocaleDateString('es-VE')}%0A` +
      `*Estado:* ${layaway.estado.toUpperCase()}%0A` +
      `*Total Apartado:* $${layaway.total_usd.toFixed(2)} (${layaway.total_bs.toFixed(0)} Bs)%0A` +
      `*Total Abonado:* $${layaway.total_abonado_usd.toFixed(2)} (${layaway.total_abonado_bs.toFixed(0)} Bs)%0A` +
      `*SALDO PENDIENTE:* $${layaway.saldo_pendiente_usd.toFixed(2)} (${layaway.saldo_pendiente_bs.toFixed(0)} Bs)%0A` +
      `*Calzados Reservados:*%0A` +
      layaway.items.map((it) => `- ${it.nombre_producto} (Talla: ${it.talla}) x${it.cantidad}`).join('%0A') +
      `%0A%0ARecuerda retirar tu calzado antes del ${new Date(layaway.fecha_vencimiento).toLocaleDateString('es-VE')}. ¡Gracias por preferir MAKD SHOP!`;

    const cleanPhone = (layaway.cliente_telefono || '').replace(/\D/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('58') ? cleanPhone : '58' + cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const isCompleted = layaway.estado === 'completado';
  const isCancelled = layaway.estado === 'cancelado';

  return (
    <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs print:p-0 print:bg-white">
      <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full shadow-xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black my-8">
        
        {/* Header (Screen only) */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-xs text-slate-900">Comprobante de Apartado</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt */}
        <div className="p-5 bg-white text-slate-900 font-mono text-xs">
          <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
            <h2 className="text-base font-black tracking-widest text-slate-900">MAKD SHOP</h2>
            <p className="text-[10px] text-slate-500 uppercase">Tienda Especializada en Calzado</p>
            <p className="text-[10px] text-slate-400">RIF: J-50491823-1</p>
            <p className="text-[10px] text-slate-400">Ciudad Alta Vista II, Local 163, Puerto Ordaz, Edo. Bolívar</p>
            
            <div className="mt-2.5 inline-block px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-bold text-xs">
              COMPROBANTE DE APARTADO #{layaway.codigo_apartado}
            </div>

            <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-slate-500">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Fecha: {new Date(layaway.fecha_apartado).toLocaleDateString('es-VE')}</span>
            </div>

            <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-rose-600 font-bold">
              <Clock className="w-3 h-3" />
              <span>Vence: {new Date(layaway.fecha_vencimiento).toLocaleDateString('es-VE')}</span>
            </div>
          </div>

          {/* Client Details */}
          <div className="border-b border-dashed border-slate-300 pb-2.5 mb-2.5 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Cliente:</span>
              <span className="font-bold text-slate-900">
                {layaway.cliente_nombre} {layaway.cliente_apellido || ''}
              </span>
            </div>
            {layaway.cliente_cedula && (
              <div className="flex justify-between">
                <span className="text-slate-500">Cédula/RIF:</span>
                <span>{layaway.cliente_cedula}</span>
              </div>
            )}
            {layaway.cliente_telefono && (
              <div className="flex justify-between">
                <span className="text-slate-500">Teléfono:</span>
                <span>{layaway.cliente_telefono}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Estado:</span>
              <span className={`font-bold uppercase ${
                isCompleted ? 'text-emerald-600' : isCancelled ? 'text-rose-600' : 'text-indigo-600'
              }`}>
                {layaway.estado}
              </span>
            </div>
          </div>

          {/* Reserved Shoes Table */}
          <div className="border-b border-dashed border-slate-300 pb-2.5 mb-2.5">
            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex justify-between">
              <span>Calzado Reservado</span>
              <span>Total</span>
            </div>
            <div className="space-y-1.5">
              {layaway.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <div className="pr-2">
                    <div className="font-medium text-slate-900">{item.nombre_producto}</div>
                    <div className="text-[10px] text-slate-500">
                      Talla: <span className="font-bold">{item.talla}</span> | Cant: {item.cantidad} x ${item.precio_unitario.toFixed(2)}
                    </div>
                  </div>
                  <div className="font-bold font-mono text-slate-900 text-right shrink-0">
                    ${item.subtotal.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="border-b border-dashed border-slate-300 pb-2.5 mb-2.5 space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Total del Apartado:</span>
              <span className="font-bold font-mono">${layaway.total_usd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Total Abonado:</span>
              <span className="font-bold font-mono">-${layaway.total_abonado_usd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-1">
              <span>SALDO RESTANTE:</span>
              <span className="font-mono text-rose-600">${layaway.saldo_pendiente_usd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>Equivalente en Bolívares:</span>
              <span>{layaway.saldo_pendiente_bs.toFixed(0)} Bs</span>
            </div>
          </div>

          {/* Payments History */}
          <div className="border-b border-dashed border-slate-300 pb-2.5 mb-2.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Historial de Abonos Recibidos ({layaway.abonos.length})
            </span>
            <div className="space-y-1">
              {layaway.abonos.map((p, idx) => (
                <div key={idx} className="flex justify-between text-[10px] text-slate-600">
                  <span>
                    {new Date(p.fecha).toLocaleDateString('es-VE')} - {p.cuenta} {p.referencia ? `(Ref: ${p.referencia})` : ''}
                  </span>
                  <span className="font-bold font-mono text-slate-900">
                    ${p.monto_equivalente_usd.toFixed(2)} {p.moneda === 'Bs' ? `(${p.monto.toFixed(0)} Bs)` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="text-center text-[9px] text-slate-400 pt-1 space-y-0.5">
            <div className="flex items-center justify-center gap-1 text-slate-600 font-semibold mb-0.5">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Condiciones del Sistema de Apartado</span>
            </div>
            <p>1. El calzado queda reservado hasta la fecha límite indicada ({new Date(layaway.fecha_vencimiento).toLocaleDateString('es-VE')}).</p>
            <p>2. Los abonos no son reembolsables en efectivo; en caso de vencimiento se emitirá nota de crédito o reincorporación al inventario.</p>
            <p>3. Imprescindible presentar este comprobante para el retiro del calzado.</p>
          </div>
        </div>

        {/* Buttons (Screen only) */}
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
