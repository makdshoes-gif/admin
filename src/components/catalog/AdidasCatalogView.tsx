import React, { useState, useMemo } from 'react';
import {
  Share2,
  Instagram,
  MessageCircle,
  Copy,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  Eye,
  Camera,
  Download,
  Flame,
  Tag,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Layers,
  X,
  SlidersHorizontal,
  Grid,
  Check,
  Smartphone,
  Globe,
  UploadCloud,
  Loader2
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ShoeProduct } from '../../types';
import { ShoeAiScannerModal } from '../inventory/ShoeAiScannerModal';
import { GitHubSyncModal } from './GitHubSyncModal';
import { BatchWhiteBackgroundModal } from '../inventory/BatchWhiteBackgroundModal';
import { downloadSocialCard } from '../../utils/socialCardGenerator';
import { removeBackgroundToWhite } from '../../utils/backgroundRemover';

export const AdidasCatalogView: React.FC = () => {
  const { products, exchangeRate, userRole, updateProduct } = useStore();

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(true);
  const [customerMode, setCustomerMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'broadcast'>('grid');

  // Scanner modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // GitHub Sync modal
  const [isGitHubSyncOpen, setIsGitHubSyncOpen] = useState(false);

  // Social Story/Post Preview Modal
  const [selectedShoeForSocial, setSelectedShoeForSocial] = useState<ShoeProduct | null>(null);
  const [socialFormat, setSocialFormat] = useState<'square' | 'story'>('square');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [isDownloadingCard, setIsDownloadingCard] = useState(false);
  const [isCleaningSingleShoe, setIsCleaningSingleShoe] = useState(false);
  const [isBatchWhiteBgOpen, setIsBatchWhiteBgOpen] = useState(false);

  // Multi-select for Broadcast
  const [selectedForBroadcast, setSelectedForBroadcast] = useState<string[]>([]);

  // Brands list (highlight Adidas & top brands)
  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    products.forEach((p) => {
      if (p.marca) brandsSet.add(p.marca.trim());
    });
    return Array.from(brandsSet);
  }, [products]);

  // Available Sizes list
  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>();
    products.forEach((p) => {
      if (p.talla && (Number(p.stock) > 0 || !onlyInStock)) {
        sizeSet.add(p.talla.trim());
      }
    });
    return Array.from(sizeSet).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [products, onlyInStock]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Stock
      const stockNum = Number(p.stock) || 0;
      if (onlyInStock && stockNum <= 0) return false;
      if (p.activo === false) return false;

      // Brand
      if (selectedBrand !== 'all') {
        const pBrand = (p.marca || '').toLowerCase();
        if (pBrand !== selectedBrand.toLowerCase()) return false;
      }

      // Category
      if (selectedCategory !== 'all') {
        if (p.categoria !== selectedCategory) return false;
      }

      // Size
      if (selectedSize !== 'all') {
        if (p.talla !== selectedSize) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (p.nombre || '').toLowerCase().includes(q);
        const matchesBrand = (p.marca || '').toLowerCase().includes(q);
        const matchesSku = (p.sku || '').toLowerCase().includes(q);
        const matchesColor = (p.color || '').toLowerCase().includes(q);
        const matchesTalla = String(p.talla || '').includes(q);
        if (!matchesName && !matchesBrand && !matchesSku && !matchesColor && !matchesTalla) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedBrand, selectedCategory, selectedSize, onlyInStock, searchQuery]);

  // Group grouped models (to display available sizes for the same model)
  const groupedProducts = useMemo(() => {
    const map = new Map<string, { main: ShoeProduct; sizes: { talla: string; stock: number; id: string }[]; totalStock: number }>();

    filteredProducts.forEach((p) => {
      // Key by clean name and color
      const key = `${(p.nombre || '').trim().toLowerCase()}__${(p.color || '').trim().toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, {
          main: p,
          sizes: [{ talla: p.talla, stock: Number(p.stock) || 0, id: p.id }],
          totalStock: Number(p.stock) || 0,
        });
      } else {
        const entry = map.get(key)!;
        entry.sizes.push({ talla: p.talla, stock: Number(p.stock) || 0, id: p.id });
        entry.totalStock += Number(p.stock) || 0;
      }
    });

    return Array.from(map.values());
  }, [filteredProducts]);

  // Copy helper
  const triggerCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(label);
    setTimeout(() => setCopiedNotification(null), 2500);
  };

  // Generate WhatsApp text for a single shoe
  const getShoeWhatsAppText = (shoe: ShoeProduct, sizesList?: { talla: string; stock: number }[]) => {
    const priceUsd = Number(shoe.precio) || 0;
    const priceBs = exchangeRate > 0 ? (priceUsd * exchangeRate).toFixed(2) : '0.00';
    const sizesStr = sizesList
      ? sizesList.filter((s) => s.stock > 0).map((s) => s.talla).join(', ')
      : shoe.talla;

    return `👟 *${shoe.nombre.toUpperCase()}*\n` +
      `🏷️ *Marca:* ${shoe.marca || 'Original'} • *Color:* ${shoe.color || 'Original'}\n` +
      `📏 *Tallas disponibles:* ${sizesStr || 'Consultar'}\n` +
      `💵 *Precio:* $${priceUsd.toFixed(2)} (Bs. ${priceBs})\n` +
      `📍 *Tienda:* MAKD SHOP - Puerto Ordaz (Alta Vista II, Local 163)\n` +
      `🚚 *Envíos:* A toda Venezuela por Zoom, Tealca y MRW.\n` +
      `📲 ¡Escríbenos para apartarlo o coordinar tu entrega!`;
  };

  // Generate Instagram Caption for a shoe
  const getShoeInstagramCaption = (shoe: ShoeProduct, sizesList?: { talla: string; stock: number }[]) => {
    const priceUsd = Number(shoe.precio) || 0;
    const priceBs = exchangeRate > 0 ? (priceUsd * exchangeRate).toFixed(2) : '0.00';
    const sizesStr = sizesList
      ? sizesList.filter((s) => s.stock > 0).map((s) => s.talla).join(', ')
      : shoe.talla;

    const desc = shoe.descripcion || 'Diseño icónico urbano con confort y estilo superior.';

    return `🔥 ¡DROP DISPONIBLE EN TIENDA! 🔥\n\n` +
      `👟 *${shoe.nombre.toUpperCase()}*\n` +
      `✨ ${desc}\n\n` +
      `▫️ Marca: ${shoe.marca}\n` +
      `▫️ Colorway: ${shoe.color}\n` +
      `▫️ Tallas en Stock: ${sizesStr}\n` +
      `💵 Precio: $${priceUsd.toFixed(2)} USD (Bs. ${priceBs} tasa BCV)\n\n` +
      `📍 Visítanos: Puerto Ordaz - C.C. Alta Vista II, Piso 1, Local 163\n` +
      `📦 Envíos rápidos y seguros a nivel nacional\n` +
      `📲 Escríbenos al enlace de nuestro perfil o al WhatsApp para pedidos\n\n` +
      `#MakdShop #ZapatosVenezuela #SneakersVenezuela #ModaUrbana #${(shoe.marca || 'Adidas').replace(/\s+/g, '')} #CalzadoUrbano #PuertoOrdaz #AltaVista #OutfitUrbano`;
  };

  // Generate Multi-product Broadcast text
  const generateBroadcastText = () => {
    const selectedItems = products.filter((p) => selectedForBroadcast.includes(p.id));
    if (selectedItems.length === 0) return '';

    let text = `👟🔥 *CATÁLOGO DE DISPONIBILIDAD - MAKD SHOP* 🔥👟\n\n` +
      `¡Hola! Te compartimos los modelos disponibles para entrega inmediata en nuestra sede de Puerto Ordaz y envíos nacionales:\n\n`;

    selectedItems.forEach((item, idx) => {
      const pr = Number(item.precio) || 0;
      const prBs = (pr * exchangeRate).toFixed(2);
      text += `${idx + 1}. *${item.nombre}* (${item.marca})\n` +
        `   • Talla: ${item.talla} | Color: ${item.color}\n` +
        `   • Precio: *$${pr.toFixed(2)}* (Bs. ${prBs})\n\n`;
    });

    text += `📍 *Ubicación:* C.C. Alta Vista II, Local 163, Puerto Ordaz.\n` +
      `🚚 *Envíos nacionales:* Zoom / Tealca / MRW.\n` +
      `💳 *Formas de pago:* Efectivo $, Pago Móvil, Punto de Venta, Zelle, Cashea, Binance.\n\n` +
      `📲 *¡Responde a este mensaje con el modelo que deseas apartar!*`;

    return text;
  };

  // Toggle selection for broadcast
  const toggleBroadcastItem = (id: string) => {
    setSelectedForBroadcast((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* ADIDAS-STYLE HERO BRAND HEADER */}
      <div className="relative bg-black text-white rounded-3xl overflow-hidden p-6 sm:p-8 shadow-2xl border border-slate-800">
        
        {/* Adidas 3-Stripes subtle geometric background motif */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none flex justify-end gap-6 skew-x-[-22deg] overflow-hidden pr-8">
          <div className="w-10 bg-white h-full" />
          <div className="w-10 bg-white h-full" />
          <div className="w-10 bg-white h-full" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            
            {/* Athletic Brand Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-black tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>LOOKBOOK URBANO & SOCIAL MEDIA STUDIO</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight uppercase leading-none font-sans">
              Catálogo Tipo Adidas
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium leading-relaxed">
              Diseñado con la estética deportiva y urbana de Adidas Originals. Genera fichas para WhatsApp, post e Instagram Stories y difusiones masivas para clientes en segundos.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Live Exchange Rate Pill */}
            <div className="px-3.5 py-2 rounded-2xl bg-slate-900 border border-slate-700 text-xs flex flex-col">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Tasa Oficial BCV</span>
              <span className="font-mono font-bold text-emerald-400 text-sm sm:text-base">
                Bs. {exchangeRate.toFixed(2)}
              </span>
            </div>

            {/* AI Camera Scanner Button */}
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-linear-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-cyan-200 animate-spin" />
              <span>Cámara IA Escáner</span>
            </button>

            {/* GitHub Sync Button */}
            <button
              type="button"
              onClick={() => setIsGitHubSyncOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              title="Sincronizar inventario con el catálogo online en GitHub Pages (makdshoes-gif/makd)"
            >
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>Sincronizar Web GitHub</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            {/* Batch White Studio Background Button */}
            <button
              type="button"
              onClick={() => setIsBatchWhiteBgOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-cyan-950/70 border border-cyan-500/40 hover:bg-cyan-900 text-cyan-300 text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
              title="Coloca fondo blanco puro de estudio a todos los zapatos del inventario"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Fondo Blanco a Todos</span>
            </button>

            {/* Customer Mode Toggle */}
            <button
              type="button"
              onClick={() => setCustomerMode(!customerMode)}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                customerMode
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/10 text-slate-300 border-white/20 hover:text-white'
              }`}
              title="Oculta costos y controles administrativos para mostrar el catálogo a clientes"
            >
              <Eye className="w-4 h-4" />
              <span>{customerMode ? 'Modo Cliente Activo' : 'Modo Mostrador'}</span>
            </button>
          </div>
        </div>

        {/* View mode tabs inside hero */}
        <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                viewMode === 'grid' ? 'bg-white text-black shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Cuadrícula Lookbook ({groupedProducts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('broadcast')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                viewMode === 'broadcast' ? 'bg-white text-black shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Difusión Redes ({selectedForBroadcast.length} seleccionados)</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Total en inventario: <strong className="text-white font-bold">{filteredProducts.length}</strong> pares listos para entrega
          </div>
        </div>

      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        {/* Top search & quick brand pills */}
        <div className="flex flex-col lg:flex-row gap-3">
          
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por silueta (Forum, Samba, Air Force), color, talla o SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-black focus:bg-white transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Brand Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs shrink-0">
            <button
              type="button"
              onClick={() => setSelectedBrand('all')}
              className={`px-3 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                selectedBrand === 'all'
                  ? 'bg-black text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas las Marcas
            </button>

            {/* Adidas prominent pill */}
            <button
              type="button"
              onClick={() => setSelectedBrand('Adidas')}
              className={`px-3.5 py-2 rounded-xl font-black uppercase tracking-wider transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                selectedBrand.toLowerCase() === 'adidas'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-slate-100 text-slate-800 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <span>👟 Adidas Originals</span>
            </button>

            {availableBrands
              .filter((b) => b.toLowerCase() !== 'adidas')
              .map((brand) => (
                <button
                  type="button"
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                  className={`px-3 py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                    selectedBrand.toLowerCase() === brand.toLowerCase()
                      ? 'bg-black text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {brand}
                </button>
              ))}
          </div>
        </div>

        {/* Secondary Filters: Size pills, stock toggle, category */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Sizes pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Tallas:</span>
            <button
              type="button"
              onClick={() => setSelectedSize('all')}
              className={`px-2 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                selectedSize === 'all' ? 'bg-black text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas
            </button>
            {availableSizes.map((sz) => (
              <button
                type="button"
                key={sz}
                onClick={() => setSelectedSize(sz)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer ${
                  selectedSize === sz ? 'bg-black text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          {/* Stock toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="w-4 h-4 rounded text-black focus:ring-black cursor-pointer"
              />
              <span>Solo con Stock Disponible</span>
            </label>
          </div>

        </div>

      </div>

      {/* VIEW 1: GRID LOOKBOOK */}
      {viewMode === 'grid' && (
        <>
          {groupedProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs max-w-md mx-auto space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No se encontraron calzados</h3>
              <p className="text-xs text-slate-500">
                Prueba cambiando los filtros de marca, búsqueda o desmarcando "Solo con Stock Disponible".
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedBrand('all');
                  setSelectedSize('all');
                  setSearchQuery('');
                  setOnlyInStock(false);
                }}
                className="px-4 py-2 bg-black text-white rounded-xl text-xs font-bold"
              >
                Restablecer Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {groupedProducts.map(({ main, sizes, totalStock }) => {
                const priceUsd = Number(main.precio) || 0;
                const priceBs = exchangeRate > 0 ? (priceUsd * exchangeRate).toFixed(2) : '0.00';
                const isAdidas = (main.marca || '').toLowerCase().includes('adidas');

                return (
                  <div
                    key={main.id}
                    className="group bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between hover:border-black/30"
                  >
                    
                    {/* Top image area with badges */}
                    <div className="relative aspect-4/3 bg-slate-100 overflow-hidden flex items-center justify-center">
                      
                      {main.imagen ? (
                        <img
                          src={main.imagen}
                          alt={main.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-200">
                          <ShoppingBag className="w-12 h-12 mb-1" />
                          <span className="text-[10px] font-bold">Sin foto</span>
                        </div>
                      )}

                      {/* Brand pill top-left */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase backdrop-blur-md shadow-md ${
                          isAdidas
                            ? 'bg-blue-600 text-white border border-blue-400/40'
                            : 'bg-black/80 text-white'
                        }`}>
                          {main.marca || 'Original'}
                        </span>

                        {totalStock <= 2 && totalStock > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white uppercase animate-pulse">
                            ¡Últimos {totalStock}!
                          </span>
                        )}
                      </div>

                      {/* Quick Action Button: Social Card modal */}
                      <button
                        type="button"
                        onClick={() => setSelectedShoeForSocial(main)}
                        className="absolute bottom-3 right-3 p-2.5 rounded-2xl bg-black/80 hover:bg-black text-white shadow-lg backdrop-blur-xs transition transform hover:scale-105 cursor-pointer"
                        title="Generar Ficha para Redes Sociales"
                      >
                        <Instagram className="w-4 h-4" />
                      </button>

                    </div>

                    {/* Shoe Content Details */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        
                        {/* Title & Color */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-black text-slate-900 text-sm tracking-tight line-clamp-1 uppercase">
                            {main.nombre}
                          </h4>
                        </div>
                        
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Color: <strong className="text-slate-700 font-semibold">{main.color || 'Estándar'}</strong>
                        </p>

                        {/* Available Sizes Pills */}
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase mb-1">
                            <span>Tallas en Stock:</span>
                            <span className="text-emerald-600">{totalStock} pares</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {sizes.map((s) => (
                              <span
                                key={s.id}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                                  s.stock > 0
                                    ? 'bg-slate-100 border-slate-200 text-slate-800'
                                    : 'bg-slate-50 border-slate-100 text-slate-300 line-through'
                                }`}
                                title={`${s.stock} pares`}
                              >
                                {s.talla}
                              </span>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Pricing & Quick Share footer */}
                      <div className="pt-3 border-t border-slate-100 space-y-3">
                        
                        {/* Dual Currency Price */}
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-xl font-black text-slate-900 tracking-tight">
                              ${priceUsd.toFixed(2)}
                            </span>
                            <span className="text-xs text-slate-400 ml-1.5 font-mono">
                              (Bs. {priceBs})
                            </span>
                          </div>

                          {/* Quick selection check for broadcast */}
                          <button
                            type="button"
                            onClick={() => toggleBroadcastItem(main.id)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              selectedForBroadcast.includes(main.id)
                                ? 'bg-black text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {selectedForBroadcast.includes(main.id) ? <Check className="w-3 h-3" /> : '+'}
                            <span>Difusión</span>
                          </button>
                        </div>

                        {/* Social Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const text = getShoeWhatsAppText(main, sizes);
                              triggerCopy(text, `Copiado: ${main.nombre}`);
                              // Also can open WhatsApp directly
                              const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                              window.open(waUrl, '_blank');
                            }}
                            className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedShoeForSocial(main)}
                            className="py-2 px-2.5 bg-slate-900 hover:bg-black active:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                          >
                            <Instagram className="w-3.5 h-3.5" />
                            <span>Ficha Post</span>
                          </button>
                        </div>

                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* VIEW 2: MULTI-PRODUCT BROADCAST GENERATOR */}
      {viewMode === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Selection list */}
          <div className="lg:col-span-6 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base uppercase text-slate-900">
                  Seleccionar Calzados para el Mensaje
                </h3>
                <p className="text-xs text-slate-500">
                  Marca los zapatos que deseas incluir en tu mensaje de difusión de WhatsApp o Telegram.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allIds = filteredProducts.slice(0, 15).map((p) => p.id);
                    setSelectedForBroadcast(allIds);
                  }}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Marcar primeros 15
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedForBroadcast([])}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {filteredProducts.map((p) => {
                const isSelected = selectedForBroadcast.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleBroadcastItem(p.id)}
                    className={`py-2.5 px-3 rounded-xl flex items-center justify-between cursor-pointer transition ${
                      isSelected ? 'bg-indigo-50/80 border border-indigo-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-black"
                      />
                      {p.imagen ? (
                        <img src={p.imagen} alt="" className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-xs">👟</div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">{p.nombre}</div>
                        <div className="text-[11px] text-slate-500">
                          {p.marca} • Talla {p.talla} • Stock: {p.stock}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-xs text-slate-900">${Number(p.precio).toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Bs. {(Number(p.precio) * exchangeRate).toFixed(0)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Message Preview */}
          <div className="lg:col-span-6 bg-slate-900 text-slate-100 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Mensaje Formateado para WhatsApp
                </span>
                <span className="text-xs text-slate-400">
                  {selectedForBroadcast.length} modelos incluidos
                </span>
              </div>

              {selectedForBroadcast.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  Selecciona uno o más calzados a la izquierda para generar la difusión con precios y tallas.
                </div>
              ) : (
                <div className="bg-black/60 rounded-2xl p-4 border border-slate-800 max-h-[420px] overflow-y-auto font-mono text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                  {generateBroadcastText()}
                </div>
              )}
            </div>

            {/* Copy broadcast actions */}
            {selectedForBroadcast.length > 0 && (
              <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => triggerCopy(generateBroadcastText(), 'Difusión copiada al portapapeles')}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar al Portapapeles</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const text = generateBroadcastText();
                    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                  }}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-600/30"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Abrir en WhatsApp</span>
                </button>
              </div>
            )}

          </div>

        </div>
      )}

      {/* MODAL 1: SOCIAL MEDIA POST / STORY STUDIO */}
      {selectedShoeForSocial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[95vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center">
                  <Instagram className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase text-white tracking-tight">
                    Ficha para Redes Sociales • {selectedShoeForSocial.marca}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Formato listo para publicar en Instagram Post (1:1), Stories o Estados de WhatsApp.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedShoeForSocial(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              
              {/* Format toggle (Square 1:1 vs Story 9:16) */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setSocialFormat('square')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    socialFormat === 'square'
                      ? 'bg-white text-black shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>Post Cuadrado (1:1)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSocialFormat('story')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    socialFormat === 'story'
                      ? 'bg-white text-black shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Historia (9:16)</span>
                </button>
              </div>

              {/* CARD PREVIEW CONTAINER (ADIDAS EDITORIAL STYLE) */}
              <div className="flex justify-center">
                <div
                  className={`relative bg-black text-white rounded-3xl overflow-hidden border-2 border-slate-700 shadow-2xl flex flex-col justify-between transition-all duration-300 ${
                    socialFormat === 'square'
                      ? 'w-full max-w-[380px] aspect-square p-5'
                      : 'w-full max-w-[320px] aspect-9/16 p-5'
                  }`}
                >
                  
                  {/* Subtle 3-stripes adidas style motif */}
                  <div className="absolute top-0 right-0 w-24 h-full opacity-10 pointer-events-none flex gap-3 skew-x-[-20deg]">
                    <div className="w-4 bg-white h-full" />
                    <div className="w-4 bg-white h-full" />
                    <div className="w-4 bg-white h-full" />
                  </div>

                  {/* Card Header */}
                  <div className="relative z-10 flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 block">
                        MAKD SHOP • DROP EXCLUSIVO
                      </span>
                      <h3 className="text-base sm:text-lg font-black uppercase tracking-tight leading-tight mt-0.5 font-sans">
                        {selectedShoeForSocial.nombre}
                      </h3>
                    </div>

                    <span className="px-2.5 py-1 rounded-md bg-white text-black font-black text-[10px] uppercase tracking-wider">
                      {selectedShoeForSocial.marca || 'Original'}
                    </span>
                  </div>

                  {/* Center Shoe Photo (Pure White Studio Backdrop matching capture) */}
                  <div className="relative z-10 flex-1 my-2 flex items-center justify-center overflow-hidden rounded-2xl bg-white p-3 border border-slate-700/60 shadow-inner">
                    {selectedShoeForSocial.imagen ? (
                      <img
                        src={selectedShoeForSocial.imagen}
                        alt={selectedShoeForSocial.nombre}
                        className="max-h-full max-w-full object-contain drop-shadow-[0_12px_22px_rgba(0,0,0,0.22)]"
                      />
                    ) : (
                      <ShoppingBag className="w-20 h-20 text-slate-400" />
                    )}
                  </div>

                  {/* Card Footer: Price & Sizes */}
                  <div className="relative z-10 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                          ${Number(selectedShoeForSocial.precio).toFixed(2)}
                        </span>
                        <span className="text-xs text-slate-400 ml-2 font-mono">
                          Bs. {(Number(selectedShoeForSocial.precio) * exchangeRate).toFixed(2)}
                        </span>
                      </div>

                      <span className="text-[10px] text-emerald-400 font-bold uppercase">
                        Talla: {selectedShoeForSocial.talla}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>📍 Alta Vista II, Local 163 (PZO)</span>
                      <span>🚚 Envíos a todo el país</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Ready Instagram Copy Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Texto para Pie de Foto (Instagram / WhatsApp):</span>
                  <button
                    type="button"
                    onClick={() => triggerCopy(getShoeInstagramCaption(selectedShoeForSocial), '¡Copy copiado al portapapeles!')}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Texto Completo</span>
                  </button>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 max-h-32 overflow-y-auto whitespace-pre-line leading-relaxed">
                  {getShoeInstagramCaption(selectedShoeForSocial)}
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-4 sm:px-6 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Single Shoe Background Cleaning Button */}
                <button
                  type="button"
                  disabled={isCleaningSingleShoe || !selectedShoeForSocial.imagen}
                  onClick={async () => {
                    if (!selectedShoeForSocial.imagen) return;
                    setIsCleaningSingleShoe(true);
                    try {
                      const cleanWhite = await removeBackgroundToWhite(selectedShoeForSocial.imagen);
                      updateProduct(selectedShoeForSocial.id, { imagen: cleanWhite });
                      setSelectedShoeForSocial({ ...selectedShoeForSocial, imagen: cleanWhite });
                      triggerCopy('', '¡Fondo blanco de estudio guardado para este calzado!');
                    } catch (e) {
                      console.error('Error limpiando fondo:', e);
                    } finally {
                      setIsCleaningSingleShoe(false);
                    }
                  }}
                  className="px-3.5 py-2 bg-slate-900 border border-cyan-500/30 text-cyan-300 hover:bg-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Aplica fondo blanco puro de estudio fotográfico a este zapato y lo guarda"
                >
                  {isCleaningSingleShoe ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span>{isCleaningSingleShoe ? 'Procesando Fondo...' : 'Poner Fondo Blanco'}</span>
                </button>

                {/* Primary Download Card Button (Exact Capture Look in HD) */}
                <button
                  type="button"
                  disabled={isDownloadingCard}
                  onClick={async () => {
                    if (!selectedShoeForSocial) return;
                    setIsDownloadingCard(true);
                    try {
                      await downloadSocialCard(selectedShoeForSocial, exchangeRate, socialFormat);
                      triggerCopy('', '¡Ficha publicitaria descargada en alta resolución!');
                    } catch (err) {
                      console.error('Error al descargar la ficha:', err);
                    } finally {
                      setIsDownloadingCard(false);
                    }
                  }}
                  className="px-4 py-2 bg-linear-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/25 disabled:opacity-50"
                >
                  {isDownloadingCard ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isDownloadingCard
                      ? 'Generando Imagen HD...'
                      : `Descargar Imagen Completa (${socialFormat === 'square' ? 'Post 1:1' : 'Historia 9:16'})`}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => triggerCopy(getShoeInstagramCaption(selectedShoeForSocial), '¡Texto Copiado!')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Copy</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const text = getShoeWhatsAppText(selectedShoeForSocial);
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Enviar a WhatsApp</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: STANDALONE SHOE AI SCANNER */}
      <ShoeAiScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />

      {/* MODAL 3: GITHUB WEB CATALOG SYNCHRONIZATION */}
      <GitHubSyncModal
        isOpen={isGitHubSyncOpen}
        onClose={() => setIsGitHubSyncOpen(false)}
      />

      {/* MODAL 4: BATCH WHITE BACKGROUND STUDIO PROCESSING */}
      <BatchWhiteBackgroundModal
        isOpen={isBatchWhiteBgOpen}
        onClose={() => setIsBatchWhiteBgOpen(false)}
      />

      {/* Copied Notification Toast */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-black text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{copiedNotification}</span>
        </div>
      )}

    </div>
  );
};
