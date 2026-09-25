import React, { useState } from 'react';
import {
  X,
  Printer,
  Tag,
  Sliders,
  Sparkles,
  Download,
  Image as ImageIcon,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import { ShoeProduct } from '../../types';
import { BarcodeSvg } from '../common/BarcodeSvg';
import {
  LabelFormat,
  downloadLabelImage
} from '../../utils/labelImageGenerator';

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
  const [showCost, setShowCost] = useState<boolean>(true); // "imprimir el sku junto con la descripción y costo"
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showBsPrice, setShowBsPrice] = useState<boolean>(true);
  const [showBarcode, setShowBarcode] = useState<boolean>(true);
  const [showStoreAddress, setShowStoreAddress] = useState<boolean>(true);
  const [labelFormat, setLabelFormat] = useState<LabelFormat>('thermal_40x25');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  if (!isOpen || !product) return null;

  const priceBs = product.precio * exchangeRate;
  const costBs = product.costo * exchangeRate;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async (format: 'png' | 'jpeg' = 'png') => {
    if (!product) return;
    setIsDownloading(true);

    const success = await downloadLabelImage(
      product,
      {
        format: labelFormat,
        showCost,
        showPrice,
        showBsPrice,
        showBarcode,
        showStoreAddress,
        exchangeRate,
      },
      format
    );

    setIsDownloading(false);
    if (success) {
      const sizeLabel = labelFormat === 'thermal_40x25' ? '40×25mm' : labelFormat === 'thermal_50x30' ? '50×30mm' : 'etiqueta';
      setDownloadSuccess(`¡Imagen ${sizeLabel} (${format.toUpperCase()}) descargada con éxito!`);
      setTimeout(() => {
        setDownloadSuccess(null);
      }, 4000);
    }
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
                  Etiqueta para Zapato (40×25mm)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  40*25mm Descargable
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Imprime o descarga en imagen lista para impresoras térmicas y rotuladoras
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
          
          {/* Success Download Banner */}
          {downloadSuccess && (
            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl shadow-xs animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs font-semibold">{downloadSuccess}</div>
            </div>
          )}

          {/* Controls & Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            
            {/* Format & Copies */}
            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tamaño y Formato de Etiqueta</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLabelFormat('thermal_40x25')}
                    className={`py-2 px-2.5 rounded-lg font-bold text-[11px] border transition cursor-pointer flex flex-col items-center justify-center text-center ${
                      labelFormat === 'thermal_40x25'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>Térmica 40×25mm</span>
                    <span className={`text-[9px] ${labelFormat === 'thermal_40x25' ? 'text-indigo-200 font-semibold' : 'text-emerald-600 font-bold'}`}>
                      ★ Solicitado (Estándar)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLabelFormat('thermal_50x30')}
                    className={`py-2 px-2.5 rounded-lg font-semibold text-[11px] border transition cursor-pointer flex flex-col items-center justify-center text-center ${
                      labelFormat === 'thermal_50x30'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>Térmica 50×30mm</span>
                    <span className="text-[9px] text-slate-400">Mediana estándar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLabelFormat('hangtag')}
                    className={`py-2 px-2.5 rounded-lg font-semibold text-[11px] border transition cursor-pointer flex flex-col items-center justify-center text-center ${
                      labelFormat === 'hangtag'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>Colgante / Hang Tag</span>
                    <span className="text-[9px] text-slate-400">Vertical calzado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLabelFormat('box')}
                    className={`py-2 px-2.5 rounded-lg font-semibold text-[11px] border transition cursor-pointer flex flex-col items-center justify-center text-center ${
                      labelFormat === 'box'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>Caja / Estante</span>
                    <span className="text-[9px] text-slate-400">70×50mm Grande</span>
                  </button>
                </div>
              </div>

              {/* Number of copies for printing */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                  <span>Copias Físicas (para Imprimir):</span>
                  <button
                    type="button"
                    onClick={() => setCopies(product.stock || 1)}
                    className="text-[10px] text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    Todo el stock ({product.stock} pares)
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
                    <span>Costo de Compra (${product.costo.toFixed(2)})</span>
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

          {/* Real-time Label Preview & Quick Download */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  Vista Previa {labelFormat === 'thermal_40x25' ? '40×25mm (Medida Exacta)' : 'de la Etiqueta'}
                </span>
              </span>

              {/* Quick Image Download Badges */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDownload('png')}
                  disabled={isDownloading}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Descargar en formato PNG de alta resolución (300 DPI)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Imagen PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('jpeg')}
                  disabled={isDownloading}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-[11px] transition-colors cursor-pointer border border-slate-200"
                  title="Descargar en formato JPG para rotuladoras Bluetooth"
                >
                  JPG
                </button>
              </div>
            </div>

            {/* Label Visual Canvas Container */}
            <div className="bg-slate-200/80 p-6 rounded-2xl flex flex-col items-center justify-center border border-slate-300 overflow-x-auto">
              
              {/* 40x25mm Label Card Preview */}
              {labelFormat === 'thermal_40x25' ? (
                <div
                  id="printable-shoe-label"
                  className="w-[340px] h-[212px] bg-white text-black border-2 border-dashed border-slate-700 p-2.5 shadow-lg flex flex-col justify-between rounded-md relative select-none"
                  style={{ boxSizing: 'border-box' }}
                >
                  {/* Top Bar: Store & Size Badge */}
                  <div>
                    <div className="flex items-center justify-between border-b-2 border-black pb-1">
                      <span className="font-black text-xs tracking-wider text-black">MAKD SHOP</span>
                      <span className="font-black text-[11px] uppercase bg-black text-white px-2 py-0.5 rounded leading-none">
                        TALLA: {product.talla}
                      </span>
                    </div>
                    {showStoreAddress && (
                      <div className="text-[8px] text-slate-600 font-medium tracking-tight mt-0.5">
                        Puerto Ordaz • Cdad. Alta Vista II, Loc. 163
                      </div>
                    )}
                  </div>

                  {/* Shoe Title & Details */}
                  <div className="my-0.5">
                    <div className="font-black text-xs leading-tight text-black uppercase truncate">
                      {product.nombre}
                    </div>
                    <div className="text-[10px] text-slate-800 font-semibold flex items-center justify-between truncate">
                      <span>{product.marca} • {product.tipo}</span>
                      <span className="text-slate-600 font-mono text-[9px]">{product.color}</span>
                    </div>
                  </div>

                  {/* Barcode & SKU */}
                  <div className="text-center py-0.5 bg-slate-50 rounded border border-slate-200 my-0.5">
                    {showBarcode && (
                      <div className="flex justify-center my-0.5">
                        <BarcodeSvg value={product.sku} width={220} height={28} />
                      </div>
                    )}
                    <div className="font-mono font-black text-[11px] tracking-wider text-black">
                      SKU: {product.sku}
                    </div>
                  </div>

                  {/* Bottom Line: Cost & Price */}
                  <div className="pt-1 border-t-2 border-black flex items-end justify-between">
                    {showCost ? (
                      <div className="border border-black px-1.5 py-0.5 rounded text-left bg-slate-50">
                        <div className="text-[7px] uppercase tracking-wider text-slate-600 font-bold leading-tight">
                          Costo Compra
                        </div>
                        <div className="font-mono font-black text-xs text-black leading-tight">
                          ${product.costo.toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <div />
                    )}

                    {showPrice && (
                      <div className="text-right">
                        <div className="text-[7px] uppercase tracking-wider text-slate-600 font-bold leading-tight">
                          PVP Venta
                        </div>
                        <div className="font-mono font-black text-sm text-black leading-none">
                          ${product.precio.toFixed(2)}
                        </div>
                        {showBsPrice && (
                          <div className="text-[8px] font-mono text-slate-700 font-bold leading-tight">
                            {priceBs.toFixed(0)} Bs
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Other Label Formats Preview */
                <div
                  id="printable-shoe-label"
                  className={`bg-white text-slate-900 border-2 border-dashed border-slate-700 p-3.5 shadow-md flex flex-col justify-between transition-all ${
                    labelFormat === 'thermal_50x30'
                      ? 'w-72 min-h-44 rounded-lg'
                      : labelFormat === 'hangtag'
                      ? 'w-64 min-h-56 rounded-2xl border-solid border-slate-800 relative'
                      : 'w-80 min-h-48 rounded-xl'
                  }`}
                >
                  {/* Hangtag punch hole */}
                  {labelFormat === 'hangtag' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-200 border-2 border-slate-800 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400" />
                    </div>
                  )}

                  {/* Brand & Store Header */}
                  <div className="border-b-2 border-slate-900 pb-1 mb-1 text-center">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs tracking-wider text-black">MAKD SHOP</span>
                      <span className="font-bold text-[10px] uppercase bg-black text-white px-2 py-0.5 rounded">
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
                  <div className="pt-1.5 border-t-2 border-slate-900 mt-auto flex items-end justify-between">
                    {showCost ? (
                      <div className="bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded text-left">
                        <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">
                          Costo Compra
                        </div>
                        <div className="font-mono font-bold text-xs text-slate-900">
                          ${product.costo.toFixed(2)}
                        </div>
                      </div>
                    ) : (
                      <div />
                    )}

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
                            {priceBs.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Bs
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dimension tag helper */}
              <div className="mt-3 text-[10px] text-slate-600 font-medium flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-full border border-slate-300">
                <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  {labelFormat === 'thermal_40x25'
                    ? 'Medida: 40mm de ancho × 25mm de alto (ideal para rollos térmicos de calzado y cajas)'
                    : labelFormat === 'thermal_50x30'
                    ? 'Medida: 50mm × 30mm'
                    : labelFormat === 'hangtag'
                    ? 'Etiqueta Colgante con perforación para hilo'
                    : 'Etiqueta para Caja 70×50mm'}
                </span>
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
                ${
                  labelFormat === 'thermal_40x25'
                    ? `
                    @page {
                      size: 40mm 25mm;
                      margin: 0;
                    }
                    .shoe-tag-item {
                      width: 40mm !important;
                      height: 25mm !important;
                      max-width: 40mm !important;
                      max-height: 25mm !important;
                      page-break-inside: avoid;
                      break-inside: avoid;
                      padding: 1.5mm !important;
                      box-sizing: border-box !important;
                      overflow: hidden !important;
                    }
                    `
                    : `
                    .shoe-tag-item {
                      page-break-inside: avoid;
                      break-inside: avoid;
                      margin-bottom: 8mm;
                    }
                    `
                }
              }
            `}</style>
            
            <div className="flex flex-wrap gap-2 p-1">
              {Array.from({ length: copies }).map((_, idx) => (
                <div
                  key={idx}
                  className={`shoe-tag-item p-2.5 bg-white border border-black rounded text-black font-sans flex flex-col justify-between ${
                    labelFormat === 'thermal_40x25' ? 'w-[40mm] h-[25mm]' : 'w-72 min-h-44'
                  }`}
                  style={{ boxSizing: 'border-box' }}
                >
                  <div className="border-b border-black pb-0.5 mb-0.5 text-center">
                    <div className="flex justify-between items-center">
                      <strong className="text-[11px] font-black">MAKD SHOP</strong>
                      <span className="text-[9px] font-black border border-black px-1 rounded">
                        TALLA: {product.talla}
                      </span>
                    </div>
                    {showStoreAddress && (
                      <div className="text-[7px] text-gray-700">
                        Puerto Ordaz • Alta Vista II, Local 163
                      </div>
                    )}
                  </div>

                  <div className="my-0.5">
                    <div className="text-[10px] font-black uppercase leading-tight truncate">{product.nombre}</div>
                    <div className="text-[8px] text-gray-800 flex justify-between">
                      <span>{product.marca} • {product.tipo}</span>
                      <span>{product.color}</span>
                    </div>
                  </div>

                  <div className="text-center my-0.5">
                    {showBarcode && (
                      <div className="flex justify-center my-0.2">
                        <BarcodeSvg value={product.sku} width={labelFormat === 'thermal_40x25' ? 140 : 190} height={labelFormat === 'thermal_40x25' ? 22 : 32} />
                      </div>
                    )}
                    <div className="font-mono font-black text-[9px] tracking-wider">
                      SKU: {product.sku}
                    </div>
                  </div>

                  <div className="border-t border-black pt-0.5 flex justify-between items-end">
                    {showCost && (
                      <div className="border border-black px-1 py-0.2 rounded text-left">
                        <div className="text-[6px] uppercase font-bold text-gray-700">Costo</div>
                        <div className="font-mono font-bold text-[9px]">${product.costo.toFixed(2)}</div>
                      </div>
                    )}
                    {showPrice && (
                      <div className="text-right">
                        <div className="text-[6px] uppercase font-bold text-gray-700">PVP Venta</div>
                        <div className="font-mono font-black text-[11px] leading-tight">${product.precio.toFixed(2)}</div>
                        {showBsPrice && (
                          <div className="text-[8px] font-mono font-bold leading-tight">
                            {priceBs.toFixed(0)} Bs
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
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Cerrar
            </button>

            {/* Download as Image Button */}
            <button
              type="button"
              onClick={() => handleDownload('png')}
              disabled={isDownloading}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {isDownloading ? 'Generando imagen...' : 'Descargar Imagen (40×25mm)'}
              </span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir {copies} {copies === 1 ? 'Etiqueta' : 'Etiquetas'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
