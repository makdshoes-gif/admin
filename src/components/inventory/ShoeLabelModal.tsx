import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  Tag,
  Check,
  DollarSign,
  Copy,
  Sliders,
  MapPin,
  Barcode,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { ShoeProduct } from '../../types';
import { BarcodeSvg } from '../common/BarcodeSvg';

interface ShoeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ShoeProduct | null;
  exchangeRate: number;
}

export const ShoeLabelModal: React.FC<ShoeLabelModalProps> = ({
  isOpen,
  onClose,
  product,
  exchangeRate,
}) => {
  const [copies, setCopies] = useState<number>(1);
  const [showCost, setShowCost] = useState<boolean>(true); // Solicitado por el usuario: "imprimir el sku junto con la descripción y costo"
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showBsPrice, setShowBsPrice] = useState<boolean>(true);
  const [showBarcode, setShowBarcode] = useState<boolean>(true);
  const [showStoreAddress, setShowStoreAddress] = useState<boolean>(true);
  const [labelFormat, setLabelFormat] = useState<'thermal' | 'hangtag' | 'box'>('thermal');

  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !product) return null;

  const priceBs = product.precio * exchangeRate;
  const costBs = product.costo * exchangeRate;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 space-y-0">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  Imprimir Etiqueta para Zapato
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600/60 text-indigo-200 border border-indigo-400/30">
                  SKU & Costo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generador de etiquetas térmicas y colgantes para calzado físico
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="p-5 sm:p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
          
          {/* Controls & Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            
            {/* Format & Copies */}
            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tipo de Etiqueta</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLabelFormat('thermal')}
                    className={`py-1.5 px-2 rounded-lg font-semibold text-[11px] border transition cursor-pointer ${
                      labelFormat === 'thermal'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Térmica (50x30mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabelFormat('hangtag')}
                    className={`py-1.5 px-2 rounded-lg font-semibold text-[11px] border transition cursor-pointer ${
                      labelFormat === 'hangtag'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Colgante / Hang Tag
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabelFormat('box')}
                    className={`py-1.5 px-2 rounded-lg font-semibold text-[11px] border transition cursor-pointer ${
                      labelFormat === 'box'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Caja / Estante
                  </button>
                </div>
              </div>

              {/* Number of copies */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                  <span>Cantidad de Etiquetas a Imprimir:</span>
                  <button
                    type="button"
                    onClick={() => setCopies(product.stock || 1)}
                    className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    Imprimir todo el stock ({product.stock} pares)
                  </button>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-slate-500 text-[11px]">
                    {copies === 1 ? '1 etiqueta' : `${copies} etiquetas para calzado`}
                  </span>
                </div>
              </div>
            </div>

            {/* Field Toggles */}
            <div className="space-y-2">
              <label className="block text-slate-700 font-bold mb-1">
                Datos a Incluir en la Etiqueta:
              </label>
              
              <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCost}
                    onChange={(e) => setShowCost(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <span>Costo de Producto (${product.costo.toFixed(2)})</span>
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 rounded font-bold">Solicitado</span>
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700">
                    Precio Venta PVP (${product.precio.toFixed(2)})
                  </span>
                </label>

                {showPrice && (
                  <label className="flex items-center gap-2 pl-5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBsPrice}
                      onChange={(e) => setShowBsPrice(e.target.checked)}
                      className="w-3 h-3 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-slate-500 text-[11px]">
                      Equivalente en Bs ({priceBs.toFixed(0)} Bs a tasa BCV)
                    </span>
                  </label>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBarcode}
                    onChange={(e) => setShowBarcode(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700">Código de Barras Escaneable (Code 39)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStoreAddress}
                    onChange={(e) => setShowStoreAddress(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700">Sede: Puerto Ordaz - Alta Vista II, Local 163</span>
                </label>
              </div>
            </div>

          </div>

          {/* Real-time Label Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Vista Previa de la Etiqueta Fisiológica para el Zapato</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {copies} {copies === 1 ? 'copia' : 'copias'} listas para impresión
              </span>
            </div>

            {/* Label Visual Canvas Container */}
            <div className="bg-slate-200/70 p-6 rounded-2xl flex flex-col items-center justify-center border border-slate-300">
              
              {/* Single Label Badge for Preview */}
              <div
                id="printable-shoe-label"
                className={`bg-white text-slate-900 border-2 border-dashed border-slate-400 p-3.5 shadow-md flex flex-col justify-between transition-all ${
                  labelFormat === 'thermal'
                    ? 'w-72 min-h-44 rounded-lg'
                    : labelFormat === 'hangtag'
                    ? 'w-64 min-h-56 rounded-2xl border-solid border-slate-800 relative'
                    : 'w-80 min-h-48 rounded-xl'
                }`}
              >
                {/* Hangtag punch hole */}
                {labelFormat === 'hangtag' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-200 border-2 border-slate-800 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400"></div>
                  </div>
                )}

                {/* Brand & Store Header */}
                <div className="border-b border-slate-900 pb-1.5 mb-1.5 text-center">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs tracking-wider text-black">MAKD SHOP</span>
                    <span className="font-bold text-[10px] uppercase bg-black text-white px-1.5 py-0.2 rounded">
                      TALLA: {product.talla}
                    </span>
                  </div>
                  {showStoreAddress && (
                    <div className="text-[8px] text-slate-600 font-medium tracking-tight mt-0.5">
                      Puerto Ordaz • Cdad. Alta Vista II, Local 163
                    </div>
                  )}
                </div>

                {/* Product Description */}
                <div className="space-y-0.5 my-1">
                  <div className="font-black text-xs leading-tight text-slate-900 uppercase">
                    {product.nombre}
                  </div>
                  <div className="text-[10px] text-slate-700 flex items-center justify-between">
                    <span className="font-semibold">{product.marca} • {product.tipo}</span>
                    <span className="text-slate-500 font-mono">{product.color}</span>
                  </div>
                </div>

                {/* SKU and Barcode Section */}
                <div className="my-1 text-center py-1 bg-slate-50/80 rounded border border-slate-200">
                  {showBarcode && (
                    <div className="flex justify-center my-0.5">
                      <BarcodeSvg value={product.sku} width={200} height={34} />
                    </div>
                  )}
                  <div className="font-mono font-black text-xs tracking-widest text-slate-900">
                    SKU: {product.sku}
                  </div>
                </div>

                {/* Cost and Pricing Section */}
                <div className="pt-1.5 border-t border-slate-900 mt-auto flex items-end justify-between">
                  {/* Costo (explicitly requested) */}
                  {showCost ? (
                    <div className="bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-left">
                      <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">
                        Costo
                      </div>
                      <div className="font-mono font-bold text-xs text-slate-900">
                        ${product.costo.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <div></div>
                  )}

                  {/* PVP Retail Price */}
                  {showPrice && (
                    <div className="text-right">
                      <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">
                        PVP Venta
                      </div>
                      <div className="font-mono font-black text-base text-slate-900 leading-none">
                        ${product.precio.toFixed(2)}
                      </div>
                      {showBsPrice && (
                        <div className="text-[9px] font-mono text-slate-600 font-bold">
                          {priceBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>

          {/* Hidden Print Container with repeat copies for printer */}
          <div className="hidden print:block print:w-full" id="print-label-batch">
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #print-label-batch, #print-label-batch * {
                  visibility: visible !important;
                }
                #print-label-batch {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                .shoe-tag-item {
                  page-break-inside: avoid;
                  break-inside: avoid;
                  margin-bottom: 8mm;
                }
              }
            `}</style>
            
            <div className="flex flex-wrap gap-4 p-2">
              {Array.from({ length: copies }).map((_, idx) => (
                <div
                  key={idx}
                  className="shoe-tag-item w-72 min-h-44 p-3 bg-white border border-black rounded-lg text-black font-sans flex flex-col justify-between"
                  style={{ boxSizing: 'border-box' }}
                >
                  <div className="border-b border-black pb-1 mb-1 text-center">
                    <div className="flex justify-between items-center">
                      <strong className="text-xs font-black">MAKD SHOP</strong>
                      <span className="text-[10px] font-black border border-black px-1.5 py-0.2">
                        TALLA: {product.talla}
                      </span>
                    </div>
                    {showStoreAddress && (
                      <div className="text-[8px] text-gray-700">
                        Puerto Ordaz • Cdad. Alta Vista II, Local 163
                      </div>
                    )}
                  </div>

                  <div className="my-0.5">
                    <div className="text-xs font-black uppercase leading-tight">{product.nombre}</div>
                    <div className="text-[9px] text-gray-800 flex justify-between">
                      <span>{product.marca} • {product.tipo}</span>
                      <span>{product.color}</span>
                    </div>
                  </div>

                  <div className="text-center my-1">
                    {showBarcode && (
                      <div className="flex justify-center my-0.5">
                        <BarcodeSvg value={product.sku} width={190} height={32} />
                      </div>
                    )}
                    <div className="font-mono font-black text-xs tracking-wider">
                      SKU: {product.sku}
                    </div>
                  </div>

                  <div className="border-t border-black pt-1 flex justify-between items-end">
                    {showCost && (
                      <div className="border border-black px-1.5 py-0.5 rounded text-left">
                        <div className="text-[8px] uppercase font-bold text-gray-700">Costo</div>
                        <div className="font-mono font-bold text-xs">${product.costo.toFixed(2)}</div>
                      </div>
                    )}
                    {showPrice && (
                      <div className="text-right">
                        <div className="text-[8px] uppercase font-bold text-gray-700">PVP Venta</div>
                        <div className="font-mono font-black text-sm">${product.precio.toFixed(2)}</div>
                        {showBsPrice && (
                          <div className="text-[9px] font-mono font-bold">
                            {priceBs.toFixed(2)} Bs
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir {copies} {copies === 1 ? 'Etiqueta' : 'Etiquetas'} de Calzado</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
