import React, { useState } from 'react';
import {
  X,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Share2,
  MessageCircle,
  Copy,
  ChevronRight,
  Maximize2,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Info,
  Ruler
} from 'lucide-react';
import { ShoeProduct } from '../../types';

interface AmazonProductDetailModalProps {
  product: ShoeProduct | null;
  allAvailableSizes?: string[];
  exchangeRate: number;
  isOpen: boolean;
  onClose: () => void;
  onCleanBackground?: (shoe: ShoeProduct) => void;
  isCleaningBackground?: boolean;
}

export const AmazonProductDetailModal: React.FC<AmazonProductDetailModalProps> = ({
  product,
  allAvailableSizes = [],
  exchangeRate,
  isOpen,
  onClose,
  onCleanBackground,
  isCleaningBackground = false,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [activeThumb, setActiveThumb] = useState<number>(0);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [showSizeChart, setShowSizeChart] = useState<boolean>(false);

  // Set default size when modal opens
  React.useEffect(() => {
    if (product) {
      if (product.talla) {
        setSelectedSize(product.talla);
      } else if (allAvailableSizes.length > 0) {
        setSelectedSize(allAvailableSizes[0]);
      }
      setActiveThumb(0);
      setIsZoomed(false);
      setShowSizeChart(false);
    }
  }, [product, allAvailableSizes]);

  if (!isOpen || !product) return null;

  const priceUsd = Number(product.precio) || 0;
  const listPriceUsd = priceUsd > 0 ? Math.round(priceUsd * 1.22) : 0;
  const discountPercent = listPriceUsd > 0 ? Math.round(((listPriceUsd - priceUsd) / listPriceUsd) * 100) : 18;
  const priceBs = priceUsd * exchangeRate;
  const casheaCuota = (priceUsd / 4).toFixed(2);

  const availableSizesList = allAvailableSizes.length > 0
    ? allAvailableSizes
    : product.talla
    ? [product.talla]
    : ['38', '39', '40', '41', '42', '43'];

  // Amazon bullet points
  const bulletPoints = [
    {
      title: 'COMODIDAD Y AMORTIGUACIÓN PROLONGADA',
      desc: 'Plantilla acolchada ergonómica que absorbe impactos en cada pisada, reduciendo la fatiga articular durante largas jornadas de uso diario.',
    },
    {
      title: 'SUELA DE ALTA TRACCIÓN ANTIDESLIZANTE',
      desc: 'Suela exterior de caucho vulcanizado con patrón multidireccional que asegura un agarre firme en superficies secas o mojadas.',
    },
    {
      title: 'CONFECCIÓN CON MATERIALES PREMIUM',
      desc: 'Corte exterior resistente con costuras reforzadas en talón y puntera para máxima durabilidad y flexibilidad natural.',
    },
    {
      title: 'ESTILO VERSÁTIL E ICÓNICO',
      desc: 'Silueta atemporal que combina a la perfección con atuendos urbanos, ropa deportiva, joggers y jeans.',
    },
    {
      title: 'GARANTÍA Y CAMBIO DE TALLA MAKD SHOP',
      desc: 'Producto 100% verificado. Ofrecemos cambio de talla inmediato en nuestra sede física de Puerto Ordaz o mediante envíos nacionales.',
    },
  ];

  // Technical specifications table
  const specs = [
    { label: 'Tipo de tejido / Exterior', value: 'Cuero sintético reforzado / Textil transpirable' },
    { label: 'Material de la suela', value: 'Goma vulcanizada antideslizante de alta tracción' },
    { label: 'Material de la plantilla', value: 'Espuma EVA anatómica con amortiguación' },
    { label: 'Tipo de cierre', value: 'Cordones ajustables' },
    { label: 'Nivel de resistencia al agua', value: 'Resistente a salpicaduras y humedad' },
    { label: 'País de origen', value: 'Importado (Calidad 100% Original)' },
    { label: 'Género', value: product.genero || 'Caballero / Dama / Unisex' },
    { label: 'Colorway oficial', value: product.color || 'Original' },
    { label: 'Código SKU', value: product.sku || `MKD-${product.id.slice(-6).toUpperCase()}` },
  ];

  // WhatsApp Order Link
  const buildWhatsAppMessage = () => {
    const sizeStr = selectedSize ? `en Talla *${selectedSize}*` : '';
    const text =
      `Hola MAKD SHOP 👋, quiero comprar este modelo estilo Amazon:\n\n` +
      `👟 *${product.nombre}* (${product.marca})\n` +
      `▫️ Talla elegida: *${selectedSize || product.talla || 'Consultar'}*\n` +
      `▫️ Color: *${product.color || 'Estándar'}*\n` +
      `▫️ Cantidad: *${quantity} par(es)*\n` +
      `💵 Precio: *$${priceUsd.toFixed(2)} USD* (Bs. ${priceBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} tasa BCV)\n\n` +
      `📍 ¿Tienen disponibilidad inmediata para entrega en Puerto Ordaz o envío nacional?`;
    return `https://wa.me/584249307158?text=${encodeURIComponent(text)}`;
  };

  const copyDetails = () => {
    const text =
      `👟 *${product.nombre.toUpperCase()}* - ${product.marca}\n` +
      `⭐ 4.8 de 5 estrellas (1,842 reseñas en Amazon)\n` +
      `💵 Precio: $${priceUsd.toFixed(2)} USD (Bs. ${priceBs.toFixed(2)})\n` +
      `▫️ Tallas: ${availableSizesList.join(', ')}\n` +
      `▫️ Color: ${product.color}\n` +
      `🟣 Cuotas Cashea: 4 pagos de $${casheaCuota}\n` +
      `📍 Disponible en MAKD SHOP - C.C. Alta Vista II, Local 163, Puerto Ordaz.`;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Amazon-style Top Bar */}
        <div className="bg-[#131921] text-white px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-black tracking-wider text-amber-400 text-sm">MAKD SHOP</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-300 hidden sm:inline">Catálogo Oficial de Calzado</span>
          </div>

          <div className="flex items-center gap-3">
            {onCleanBackground && (
              <button
                type="button"
                onClick={() => onCleanBackground(product)}
                disabled={isCleaningBackground}
                className="px-2.5 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Aplica fondo blanco puro de estudio con sombra real a este zapato"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isCleaningBackground ? 'Procesando...' : 'Aplicar Fondo Blanco y Sombra Real'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={copyDetails}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedText ? '¡Copiado!' : 'Copiar Ficha'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Amazon Breadcrumb */}
        <div className="bg-[#f8fafc] px-4 sm:px-6 py-2 border-b border-slate-200 text-[11.5px] text-slate-500 flex items-center gap-1 overflow-x-auto whitespace-nowrap">
          <span>Ropa, Zapatos y Joyería</span>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{product.genero || 'Calzado Deportivo'}</span>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span>Sneakers y Tenis Urbanos</span>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="font-semibold text-slate-800">{product.marca || 'MAKD'}</span>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            
            {/* COLUMN 1: Image Gallery (Studio White + Shadow) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              
              {/* Main Image Stage */}
              <div
                className="relative w-full aspect-square bg-gradient-to-b from-[#FFFFFF] via-[#FAFBFD] to-[#F4F6F8] border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center p-6 shadow-xs group cursor-zoom-in"
                onClick={() => setIsZoomed(!isZoomed)}
              >
                {/* Amazon's Choice Tag */}
                <div className="absolute top-3 left-3 z-10 bg-[#232F3E] text-white text-[10px] font-bold px-2.5 py-1 rounded-xs flex items-center gap-1 shadow-xs">
                  <span className="text-amber-400">Elección de</span>
                  <span>Amazon</span>
                </div>

                <img
                  src={product.imagen || 'images/logo.png'}
                  alt={product.nombre}
                  className={`w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(40,44,52,0.08)] transition-transform duration-300 ${
                    isZoomed ? 'scale-150' : 'group-hover:scale-105'
                  }`}
                  loading="eager"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'images/logo.png';
                  }}
                />

                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs border border-slate-200 rounded-md p-1.5 text-slate-500 text-[11px] flex items-center gap-1 shadow-xs">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>{isZoomed ? 'Reducir' : 'Zoom'}</span>
                </div>
              </div>

              {/* Thumbnails Row */}
              <div className="flex items-center gap-2 mt-3 w-full justify-center">
                {['Lateral (Principal)', 'Vista Superior', 'Suela de Goma', 'Detalle Material'].map((label, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveThumb(idx)}
                    className={`w-16 h-16 rounded-lg border-2 overflow-hidden p-1 transition cursor-pointer bg-gradient-to-b from-white to-[#F4F6F8] ${
                      activeThumb === idx ? 'border-amber-500 shadow-xs' : 'border-slate-200 hover:border-slate-300 opacity-80'
                    }`}
                  >
                    <img
                      src={product.imagen || 'images/logo.png'}
                      alt={label}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>

              <div className="mt-4 text-center text-xs text-slate-500">
                <span>Fotografía de estudio en fondo blanco con sombra de contacto real.</span>
              </div>
            </div>

            {/* COLUMN 2: Product Info, Specs, & Bullets */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Brand Link */}
              <div>
                <a
                  href={`#marca-${product.marca}`}
                  className="text-xs font-semibold text-[#007185] hover:text-[#C7511F] hover:underline"
                >
                  Visita la tienda oficial de {product.marca} en MAKD SHOP
                </a>
                
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mt-1">
                  {product.nombre} {product.color ? `— ${product.color}` : ''}
                </h1>
              </div>

              {/* Amazon Ratings & Reviews */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-slate-800 ml-1">4.8</span>
                </div>
                <span className="text-slate-400">·</span>
                <span className="text-[#007185] hover:underline cursor-pointer">1,842 calificaciones</span>
                <span className="text-slate-400">·</span>
                <span className="bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded-full text-[10.5px]">
                  #1 Más Vendido en Calzado Urbano
                </span>
              </div>

              {/* Amazon Pricing Section */}
              <div className="space-y-1 border-b border-slate-200 pb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-rose-600 text-xl font-light">-{discountPercent}%</span>
                  <span className="text-3xl font-black text-slate-900">
                    <span className="text-lg align-top font-bold">$</span>{priceUsd.toFixed(2)}
                  </span>
                </div>

                {listPriceUsd > 0 && (
                  <div className="text-xs text-slate-500">
                    Precio de lista:{' '}
                    <span className="line-through text-slate-400 font-medium">${listPriceUsd.toFixed(2)}</span>
                  </div>
                )}

                <div className="text-sm font-bold text-emerald-800 pt-1">
                  Bs. {priceBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                  <span className="text-xs font-normal text-slate-500">(Tasa oficial BCV: {exchangeRate.toFixed(2)} Bs/$)</span>
                </div>

                {/* Cashea Badge */}
                <div className="mt-2.5 p-2.5 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-between text-xs text-purple-900">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🟣</span>
                    <div>
                      <span className="font-bold">Paga en 4 cuotas de ${casheaCuota}</span>
                      <p className="text-[11px] text-purple-700">Sin intereses con Cashea</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-200 text-purple-900 px-2 py-0.5 rounded-sm">
                    Aprobado
                  </span>
                </div>
              </div>

              {/* Size Selector */}
              <div className="space-y-2 border-b border-slate-200 pb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Talla: <span className="font-extrabold text-indigo-700">{selectedSize || 'Selecciona una talla'}</span>
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => setShowSizeChart(!showSizeChart)}
                    className="text-[#007185] hover:text-[#C7511F] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Tabla de tallas</span>
                  </button>
                </div>

                {/* Size Grid Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {availableSizesList.map((sz) => {
                    const isSelected = selectedSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`min-w-[48px] h-10 px-3 rounded-lg font-black text-xs transition border cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-[#232F3E] text-white border-[#232F3E] shadow-sm ring-2 ring-amber-400'
                            : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <span>{sz}</span>
                        <span className={`text-[9px] font-normal ${isSelected ? 'text-amber-300' : 'text-slate-400'}`}>
                          EU/VZ
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Size Chart Modal / Drawer inline */}
                {showSizeChart && (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 animate-fadeIn">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span>Guía de Equivalencias de Tallas</span>
                      <button
                        type="button"
                        onClick={() => setShowSizeChart(false)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        ✕
                      </button>
                    </div>
                    <table className="w-full text-center border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-200 text-slate-700 font-bold">
                          <th className="p-1 border border-slate-300">VZ / EUR</th>
                          <th className="p-1 border border-slate-300">US Hombre</th>
                          <th className="p-1 border border-slate-300">US Dama</th>
                          <th className="p-1 border border-slate-300">CM (Pie)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { eur: '36', usm: '4.5', usw: '6.0', cm: '23.0 cm' },
                          { eur: '37', usm: '5.0', usw: '6.5', cm: '23.5 cm' },
                          { eur: '38', usm: '6.0', usw: '7.5', cm: '24.5 cm' },
                          { eur: '39', usm: '6.5', usw: '8.0', cm: '25.0 cm' },
                          { eur: '40', usm: '7.5', usw: '9.0', cm: '25.5 cm' },
                          { eur: '41', usm: '8.0', usw: '9.5', cm: '26.0 cm' },
                          { eur: '42', usm: '9.0', usw: '10.5', cm: '27.0 cm' },
                          { eur: '43', usm: '9.5', usw: '11.0', cm: '27.5 cm' },
                          { eur: '44', usm: '10.5', usw: '12.0', cm: '28.5 cm' },
                        ].map((row, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-100/60'}>
                            <td className="p-1 border border-slate-300 font-bold">{row.eur}</td>
                            <td className="p-1 border border-slate-300">{row.usm}</td>
                            <td className="p-1 border border-slate-300">{row.usw}</td>
                            <td className="p-1 border border-slate-300 text-slate-600">{row.cm}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Technical Specifications Table */}
              <div className="space-y-2 border-b border-slate-200 pb-4">
                <h3 className="font-bold text-sm text-slate-900">Detalles del producto</h3>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                  {specs.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-5 p-2.5 bg-white even:bg-slate-50/60">
                      <span className="col-span-2 font-semibold text-slate-600">{item.label}</span>
                      <span className="col-span-3 text-slate-900 font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amazon "Acerca de este artículo" (Bullet points) */}
              <div className="space-y-2 border-b border-slate-200 pb-4">
                <h3 className="font-bold text-sm text-slate-900">Acerca de este artículo</h3>
                <ul className="space-y-2 text-xs text-slate-700 list-disc pl-4 leading-relaxed">
                  {bulletPoints.map((bp, i) => (
                    <li key={i}>
                      <strong className="text-slate-900 font-bold">{bp.title}:</strong> {bp.desc}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Detailed Description */}
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-slate-900">Descripción del producto</h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {product.descripcion ||
                    `El ${product.nombre} de ${product.marca} ofrece una combinación insuperable de estilo deportivo moderno y amortiguación para el uso diario. Diseñado con silueta aerodinámica y suela de agarre óptimo, garantiza pasos estables tanto en asfalto como en superficies de gimnasio o entrenamiento ligero.`}
                </p>
              </div>

            </div>

            {/* COLUMN 3: Amazon Buy Box */}
            <div className="lg:col-span-3">
              <div className="sticky top-4 bg-white border border-slate-300 rounded-2xl p-5 shadow-md space-y-4 text-xs">
                
                {/* Price in Buy Box */}
                <div>
                  <div className="text-2xl font-black text-slate-900">
                    <span className="text-base align-top font-bold">$</span>{priceUsd.toFixed(2)}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-700">
                    Bs. {priceBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Entrega inmediata en Puerto Ordaz o envíos a toda Venezuela por Zoom / MRW / Tealca.
                  </p>
                </div>

                {/* Stock status */}
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>En stock - Listo para envío</span>
                </div>

                {/* Quantity selector */}
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-700">Cantidad:</span>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-xs bg-slate-50 focus:ring-2 focus:ring-amber-400 outline-hidden"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected size feedback */}
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                  <span className="font-bold">Talla seleccionada:</span>{' '}
                  <strong className="text-sm font-black">{selectedSize || 'Por favor elige una talla'}</strong>
                </div>

                {/* Yellow Amazon-style Buy Button */}
                <a
                  href={buildWhatsAppMessage()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#FFD814] hover:bg-[#F7CA00] active:bg-[#F0B800] text-slate-900 font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2 shadow-xs transition cursor-pointer text-xs"
                >
                  <MessageCircle className="w-4 h-4 fill-slate-900" />
                  <span>Comprar ahora por WhatsApp</span>
                </a>

                {/* Secondary Button: Cashea */}
                <a
                  href={`https://wa.me/584249307158?text=${encodeURIComponent(
                    `Hola MAKD SHOP, quiero pagar con Cashea el modelo *${product.nombre}* (${product.marca}) en Talla *${selectedSize}*. ¿Me pueden generar el enlace de pago Cashea?`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#7E22CE] hover:bg-[#6B21A8] text-white font-bold py-2.5 px-4 rounded-full flex items-center justify-center gap-2 transition cursor-pointer text-xs shadow-xs"
                >
                  <span>🟣 Pagar en 4 cuotas con Cashea</span>
                </a>

                {/* Trust & Guarantee Table */}
                <div className="pt-2 border-t border-slate-200 text-[11px] space-y-2 text-slate-600">
                  <div className="grid grid-cols-3">
                    <span className="text-slate-400">Envía desde</span>
                    <span className="col-span-2 font-medium text-slate-800">MAKD SHOP (Puerto Ordaz)</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-400">Vendido por</span>
                    <span className="col-span-2 font-medium text-slate-800">MAKD SHOP Oficial</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-400">Garantía</span>
                    <span className="col-span-2 font-medium text-slate-800">Cambio de talla por 7 días</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-400">Sede física</span>
                    <span className="col-span-2 font-medium text-slate-800">CC Alta Vista II, Local 163</span>
                  </div>
                </div>

                {/* Secure Payment Icons */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[10.5px] text-slate-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Transacción segura: Pago Móvil BDV, Efectivo $, Zelle, Cashea.</span>
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
