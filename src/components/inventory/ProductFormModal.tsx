import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  DollarSign,
  Tag,
  Boxes,
  ShieldAlert,
  Camera,
  Upload,
  Link,
  RotateCcw,
  Trash2,
  AlertCircle,
  Sparkles,
  SwitchCamera,
  Layers,
  Plus,
  Minus,
  Smartphone
} from 'lucide-react';
import { ShoeProduct, ShoeType, ProductCategory } from '../../types';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Omit<ShoeProduct, 'id' | 'created_at'>) => void;
  onSaveBulk?: (productsData: Omit<ShoeProduct, 'id' | 'created_at'>[]) => void;
  editingProduct?: ShoeProduct | null;
}

interface SizeStockItem {
  talla: string;
  stock: number;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveBulk,
  editingProduct,
}) => {
  if (!isOpen) return null;

  // Entry Mode: Multi-size model vs single item
  const [entryMode, setEntryMode] = useState<'multi' | 'single'>(
    editingProduct ? 'single' : 'multi'
  );

  // Category
  const [categoria, setCategoria] = useState<ProductCategory>(
    (editingProduct?.categoria as ProductCategory) || 'Calzado'
  );

  // Basic Info
  const [nombre, setNombre] = useState(editingProduct?.nombre || '');
  const [sku, setSku] = useState(editingProduct?.sku || '');
  const [marca, setMarca] = useState(editingProduct?.marca || 'Nike');
  const [tipo, setTipo] = useState<ShoeType>(editingProduct?.tipo || 'Deportivo');
  const [color, setColor] = useState(editingProduct?.color || 'Blanco');
  const [costo, setCosto] = useState(editingProduct?.costo.toString() || '40.00');
  const [precio, setPrecio] = useState(editingProduct?.precio.toString() || '80.00');
  const [stockMinimo, setStockMinimo] = useState(editingProduct?.stock_minimo.toString() || '2');
  const [imagen, setImagen] = useState(editingProduct?.imagen || '');

  // Single Item Mode: single size & stock
  const [singleTalla, setSingleTalla] = useState(editingProduct?.talla || '38');
  const [singleStock, setSingleStock] = useState(editingProduct?.stock.toString() || '5');

  // Multi-Sizes Mode: Matrix of sizes & stocks
  const defaultSizesForCalzado: SizeStockItem[] = [
    { talla: '37', stock: 4 },
    { talla: '38', stock: 6 },
    { talla: '39', stock: 6 },
    { talla: '40', stock: 8 },
    { talla: '41', stock: 6 },
    { talla: '42', stock: 4 },
  ];

  const [activeSizes, setActiveSizes] = useState<SizeStockItem[]>(defaultSizesForCalzado);
  const [bulkQtyToApply, setBulkQtyToApply] = useState<number>(4);
  const [customTallaInput, setCustomTallaInput] = useState<string>('');

  // Camera & Image state
  const [imageMode, setImageMode] = useState<'camera' | 'upload' | 'url'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  // Available size presets per category
  const getPresetSizes = (cat: ProductCategory): string[] => {
    switch (cat) {
      case 'Calzado':
        return ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
      case 'Gorras':
        return ['Ajustable', 'Única', 'S/M', 'L/XL'];
      case 'Medias':
        return ['Pack x3', 'Pack x6', 'Única', '35-38', '39-42'];
      case 'Accesorios':
        return ['Única', 'S', 'M', 'L'];
      case 'Ropa':
        return ['S', 'M', 'L', 'XL', 'XXL'];
      default:
        return ['Única', '38', '39', '40', '41', '42'];
    }
  };

  // Types available per category
  const getTypesForCategory = (cat: ProductCategory): ShoeType[] => {
    switch (cat) {
      case 'Calzado':
        return ['Deportivo', 'Casual', 'Botas', 'Tacones', 'Sandalias', 'Mocasines', 'Infantil'];
      case 'Gorras':
        return ['Gorras'];
      case 'Medias':
        return ['Medias'];
      case 'Accesorios':
        return ['Accesorios'];
      case 'Ropa':
        return ['Ropa'];
      default:
        return ['Otros'];
    }
  };

  // When category changes, adjust default type
  const handleCategoryChange = (newCat: ProductCategory) => {
    setCategoria(newCat);
    const available = getTypesForCategory(newCat);
    setTipo(available[0]);

    // Reset default sizes
    if (newCat === 'Calzado') {
      setActiveSizes(defaultSizesForCalzado);
      setSingleTalla('38');
    } else if (newCat === 'Gorras') {
      setActiveSizes([{ talla: 'Ajustable', stock: 10 }]);
      setSingleTalla('Ajustable');
    } else if (newCat === 'Medias') {
      setActiveSizes([{ talla: 'Pack x3', stock: 15 }]);
      setSingleTalla('Pack x3');
    } else {
      setActiveSizes([{ talla: 'Única', stock: 10 }]);
      setSingleTalla('Única');
    }
  };

  // Toggle or add size
  const togglePresetSize = (sz: string) => {
    const exists = activeSizes.some((s) => s.talla === sz);
    if (exists) {
      setActiveSizes((prev) => prev.filter((s) => s.talla !== sz));
    } else {
      setActiveSizes((prev) => [...prev, { talla: sz, stock: bulkQtyToApply || 4 }]);
    }
  };

  // Change stock for a specific size
  const updateSizeStock = (sz: string, qty: number) => {
    const val = Math.max(0, qty);
    setActiveSizes((prev) =>
      prev.map((item) => (item.talla === sz ? { ...item, stock: val } : item))
    );
  };

  // Apply same quantity to all active sizes
  const handleApplyToAllSizes = () => {
    const qty = Math.max(0, bulkQtyToApply);
    setActiveSizes((prev) => prev.map((s) => ({ ...s, stock: qty })));
  };

  // Add custom size
  const handleAddCustomTalla = () => {
    const trimmed = customTallaInput.trim();
    if (!trimmed) return;
    if (!activeSizes.some((s) => s.talla.toLowerCase() === trimmed.toLowerCase())) {
      setActiveSizes((prev) => [...prev, { talla: trimmed, stock: bulkQtyToApply || 4 }]);
    }
    setCustomTallaInput('');
  };

  // Stop camera cleanly
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsCameraReady(false);
    setCameraError(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // When isCameraActive becomes true, attach stream to video element
  useEffect(() => {
    if (isCameraActive && videoRef.current && mediaStreamRef.current) {
      const video = videoRef.current;
      video.srcObject = mediaStreamRef.current;
      video
        .play()
        .then(() => setIsCameraReady(true))
        .catch((err) => {
          console.error('Error al reproducir video de cámara:', err);
        });
    }
  }, [isCameraActive]);

  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    stopCamera();
    setCameraError(null);
    setIsCameraReady(false);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (err) {
        // Fallback to any camera available
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      mediaStreamRef.current = stream;
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Error al acceder a la cámara:', err);
      setCameraError(
        'No se pudo abrir la cámara en el navegador. Puedes usar el botón "Cámara del Teléfono" o "Subir Archivo".'
      );
      setIsCameraActive(false);
    }
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    // Check if video is loaded, ready and has dimensions
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('La cámara aún se está inicializando. Espera 1 segundo e inténtalo de nuevo o usa la cámara del móvil.');
      return;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      // Mirror if front camera
      if (cameraFacing === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, width, height);

      // Verify that the frame is not pitch black (hardware/buffer issue check)
      try {
        const sampleData = ctx.getImageData(
          Math.floor(width / 4),
          Math.floor(height / 4),
          Math.floor(width / 2),
          Math.floor(height / 2)
        );
        let nonBlackPixels = 0;
        for (let i = 0; i < sampleData.data.length; i += 16) {
          const r = sampleData.data[i];
          const g = sampleData.data[i + 1];
          const b = sampleData.data[i + 2];
          if (r > 12 || g > 12 || b > 12) {
            nonBlackPixels++;
            if (nonBlackPixels > 10) break;
          }
        }

        if (nonBlackPixels <= 5) {
          // Frame is completely black, trigger native camera or retry
          setCameraError('El navegador devolvió un fotograma negro. Abriendo la cámara nativa de tu dispositivo para tomar la foto con calidad...');
          nativeCameraInputRef.current?.click();
          return;
        }
      } catch (err) {
        console.warn('Canvas pixel check info:', err);
      }

      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setImagen(photoDataUrl);
      setCameraError(null);
      stopCamera();
    }
  };

  const handleSwitchCamera = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (isCameraActive) {
      startCamera(nextFacing);
    }
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setImagen(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleCloseModal = () => {
    stopCamera();
    onClose();
  };

  const parsedCosto = parseFloat(costo) || 0;
  const parsedPrecio = parseFloat(precio) || 0;
  const margenGanancia = parsedPrecio - parsedCosto;
  const margenPorcentaje = parsedPrecio > 0 ? (margenGanancia / parsedPrecio) * 100 : 0;

  const totalPairsCount =
    entryMode === 'multi'
      ? activeSizes.reduce((sum, s) => sum + s.stock, 0)
      : parseInt(singleStock, 10) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !sku.trim()) {
      alert('Por favor ingresa el nombre y código SKU del producto.');
      return;
    }

    stopCamera();

    const baseProductData = {
      nombre: nombre.trim(),
      categoria,
      marca: marca.trim() || 'Genérica',
      tipo,
      color: color.trim() || 'Estándar',
      moneda: 'USD' as const,
      costo: parsedCosto,
      precio: parsedPrecio,
      stock_minimo: parseInt(stockMinimo, 10) || 2,
      activo: true,
      imagen:
        imagen.trim() ||
        (categoria === 'Gorras'
          ? 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400'
          : categoria === 'Medias'
          ? 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400'
          : categoria === 'Accesorios'
          ? 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=400'
          : 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'),
    };

    if (entryMode === 'multi' && !editingProduct) {
      if (activeSizes.length === 0) {
        alert('Debes seleccionar al menos una talla para el modelo.');
        return;
      }

      // Check if user specified multiple colors (e.g. "Negro, Blanco")
      const colorTokens = color
        .split(/[,/;]/)
        .map((c) => c.trim())
        .filter(Boolean);

      const itemsToCreate: Omit<ShoeProduct, 'id' | 'created_at'>[] = [];

      if (colorTokens.length > 1) {
        // Create matrix of sizes x colors
        colorTokens.forEach((cName) => {
          activeSizes.forEach((s) => {
            const formattedTalla = s.talla.replace(/\s+/g, '');
            const colorCode = cName.substring(0, 3).toUpperCase();
            itemsToCreate.push({
              ...baseProductData,
              color: cName,
              sku: `${sku.trim().toUpperCase()}-${colorCode}-${formattedTalla}`,
              talla: s.talla,
              stock: s.stock,
            });
          });
        });
      } else {
        // Single color with multiple sizes
        activeSizes.forEach((s) => {
          const formattedTalla = s.talla.replace(/\s+/g, '');
          itemsToCreate.push({
            ...baseProductData,
            sku: `${sku.trim().toUpperCase()}-${formattedTalla}`,
            talla: s.talla,
            stock: s.stock,
          });
        });
      }

      if (onSaveBulk) {
        onSaveBulk(itemsToCreate);
      } else {
        itemsToCreate.forEach((item) => onSave(item));
      }
    } else {
      // Single Item
      onSave({
        ...baseProductData,
        sku: sku.trim().toUpperCase(),
        talla: singleTalla,
        stock: parseInt(singleStock, 10) || 0,
      });
    }

    onClose();
  };

  const categoriesList: { key: ProductCategory; label: string; icon: string }[] = [
    { key: 'Calzado', label: '👟 Calzado', icon: 'Shoes' },
    { key: 'Gorras', label: '🧢 Gorras', icon: 'Cap' },
    { key: 'Medias', label: '🧦 Medias', icon: 'Socks' },
    { key: 'Accesorios', label: '🎒 Accesorios', icon: 'Bag' },
    { key: 'Ropa', label: '👕 Ropa', icon: 'Shirt' },
    { key: 'Otros', label: '📦 Otros', icon: 'Box' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight">
                {editingProduct ? 'Editar Producto / Calzado' : 'Registrar Nuevo Producto'}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {editingProduct
                  ? 'Modifica precios, stock y datos del artículo'
                  : 'Crea un modelo con múltiples tallas y colores o un artículo individual'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Only for new products) */}
        {!editingProduct && (
          <div className="bg-slate-100 p-2 border-b border-slate-200 flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setEntryMode('multi')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                entryMode === 'multi'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Modelo con Múltiples Tallas (Recomendado)</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('single')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                entryMode === 'single'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Artículo Individual (1 sola talla)</span>
            </button>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
          
          {/* Category Selector Chips */}
          <div>
            <label className="block text-slate-700 font-bold mb-1.5">
              Categoría del Producto *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {categoriesList.map((cat) => (
                <button
                  type="button"
                  key={cat.key}
                  onClick={() => handleCategoryChange(cat.key)}
                  className={`py-2 px-2 text-center rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    categoria === cat.key
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Basic Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-bold mb-1">
                Nombre del Modelo / Artículo *
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder={
                  categoria === 'Gorras'
                    ? 'Ej. Gorra New Era NY Yankees 59FIFTY'
                    : categoria === 'Medias'
                    ? 'Ej. Medias Deportivas Nike Cushion Pack x3'
                    : 'Ej. Nike Air Force 1 07 Low'
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Código SKU Base *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ej. NK-AF1-003"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white text-xs"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {entryMode === 'multi' ? 'Se anexará -TALLA a cada variante (ej. NK-AF1-38)' : 'Código único'}
              </span>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Marca
              </label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Nike, Adidas, New Era, Puma..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Tipo / Subgénero
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as ShoeType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white text-xs"
              >
                {getTypesForCategory(categoria).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Color o Colores
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder={entryMode === 'multi' ? 'Ej. Blanco, Negro (separa con coma para varios)' : 'Ej. Blanco / Rojo'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white text-xs"
              />
              {entryMode === 'multi' && (
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Si colocas varios colores separados por coma, se crearán para cada talla.
                </span>
              )}
            </div>
          </div>

          {/* Pricing & Cost Matrix */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
              <span>Precios y Márgenes de Ganancia</span>
              <span className={`text-[11px] font-bold ${margenGanancia >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                Margen: ${margenGanancia.toFixed(2)} ({margenPorcentaje.toFixed(1)}%)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Costo de Compra (USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={costo}
                    onChange={(e) => setCosto(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Precio de Venta PVP (USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Stock Mínimo de Alerta
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* SIZES AND STOCK SECTION */}
          {entryMode === 'multi' && !editingProduct ? (
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Tallas y Cantidades Físicas en Stock</span>
                  </h4>
                  <p className="text-[11px] text-indigo-700">
                    Marca las tallas disponibles e indica cuántos pares/unidades tienes de cada una.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 text-xs">
                  <span className="font-bold text-slate-700">Total a ingresar:</span>
                  <span className="px-2 py-0.5 rounded-full font-mono font-bold bg-indigo-600 text-white text-[11px]">
                    {totalPairsCount} pares/uds
                  </span>
                </div>
              </div>

              {/* Preset Size Buttons Chips */}
              <div>
                <span className="text-[11px] text-slate-500 font-semibold mb-1.5 block">
                  Tallas predeterminadas para {categoria} (haz clic para activar/desactivar):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {getPresetSizes(categoria).map((sz) => {
                    const isSelected = activeSizes.some((s) => s.talla === sz);
                    return (
                      <button
                        type="button"
                        key={sz}
                        onClick={() => togglePresetSize(sz)}
                        className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {sz} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom Size input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Otra talla personalizada (ej. 36.5, XL, Pack)..."
                  value={customTallaInput}
                  onChange={(e) => setCustomTallaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTalla();
                    }
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 flex-1"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTalla}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs cursor-pointer"
                >
                  + Añadir Talla
                </button>
              </div>

              {/* Bulk Quantity Tool */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-600 font-medium text-[11px]">
                  Rellenar todas las tallas seleccionadas con la misma cantidad:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={bulkQtyToApply}
                    onChange={(e) => setBulkQtyToApply(parseInt(e.target.value, 10) || 0)}
                    className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-center font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleApplyToAllSizes}
                    className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold rounded transition cursor-pointer text-xs"
                  >
                    Aplicar a todas
                  </button>
                </div>
              </div>

              {/* Active Sizes Steppers Grid */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Cantidades por Talla ({activeSizes.length} seleccionadas):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeSizes.map((item) => (
                    <div
                      key={item.talla}
                      className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs"
                    >
                      <span className="font-mono font-bold text-slate-900 text-xs px-1.5 py-0.5 bg-slate-100 rounded">
                        Talla {item.talla}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateSizeStock(item.talla, item.stock - 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={item.stock}
                          onChange={(e) => updateSizeStock(item.talla, parseInt(e.target.value, 10) || 0)}
                          className="w-12 py-0.5 text-center font-mono font-bold bg-slate-50 border border-slate-200 rounded text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => updateSizeStock(item.talla, item.stock + 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Single Item Mode: 1 Talla and 1 Stock */
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Talla del Producto *
                </label>
                <input
                  type="text"
                  required
                  value={singleTalla}
                  onChange={(e) => setSingleTalla(e.target.value)}
                  placeholder="Ej. 38, Ajustable, Pack x3..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Cantidad Física en Stock *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={singleStock}
                  onChange={(e) => setSingleStock(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-xs"
                />
              </div>
            </div>
          )}

          {/* IMAGE & CAMERA SECTION (COMPLETELY FIXED - NO BLACK PHOTOS) */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-bold flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-600" />
                <span>Fotografía del Producto</span>
              </label>

              {/* Mode buttons */}
              <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setImageMode('camera');
                    startCamera();
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 cursor-pointer ${
                    imageMode === 'camera'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  <span>Cámara en Vivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setImageMode('upload');
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 cursor-pointer ${
                    imageMode === 'upload'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>Subir Foto</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setImageMode('url');
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition flex items-center gap-1 cursor-pointer ${
                    imageMode === 'url'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Link className="w-3 h-3" />
                  <span>URL</span>
                </button>
              </div>
            </div>

            {/* LIVE CAMERA MODE */}
            {imageMode === 'camera' && (
              <div className="space-y-2">
                {isCameraActive ? (
                  <div className="relative bg-black rounded-xl overflow-hidden border border-slate-300 aspect-4/3 max-h-64 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      onLoadedMetadata={(e) => {
                        const vid = e.currentTarget;
                        vid.play().then(() => setIsCameraReady(true)).catch(console.error);
                      }}
                      className="w-full h-full object-cover"
                    />

                    {/* Viewfinder crosshairs */}
                    <div className="absolute inset-4 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                      <span className="text-[9px] text-white/90 bg-black/60 px-2 py-0.5 rounded self-start font-mono">
                        Enfoca el calzado o artículo
                      </span>
                      <span className="text-[9px] text-white/90 bg-black/60 px-2 py-0.5 rounded self-end font-mono">
                        {cameraFacing === 'environment' ? 'Cámara Trasera' : 'Cámara Frontal'}
                      </span>
                    </div>

                    {/* Camera controls toolbar */}
                    <div className="absolute bottom-3 inset-x-3 flex items-center justify-between px-3 py-2 bg-black/75 backdrop-blur-xs rounded-xl">
                      <button
                        type="button"
                        onClick={handleSwitchCamera}
                        className="px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition flex items-center gap-1.5 text-xs cursor-pointer"
                        title="Cambiar Cámara"
                      >
                        <SwitchCamera className="w-4 h-4" />
                        <span className="hidden sm:inline">Girar</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer transition transform active:scale-95"
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></div>
                        <span>Tomar Foto</span>
                      </button>

                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition text-xs cursor-pointer"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs">Cámara en Vivo</p>
                        <p className="text-[11px] text-slate-500">
                          Abre tu cámara web o usa la cámara de tu móvil para tomar la foto directamente.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="flex-1 sm:flex-none px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Abrir Cámara</span>
                      </button>

                      {/* Native Mobile Camera trigger */}
                      <button
                        type="button"
                        onClick={() => nativeCameraInputRef.current?.click()}
                        className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Tomar foto con app nativa del celular"
                      >
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                        <span>Cámara del Móvil</span>
                      </button>
                    </div>
                  </div>
                )}

                {cameraError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}
              </div>
            )}

            {/* UPLOAD FILE MODE */}
            {imageMode === 'upload' && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-1.5 ${
                  isDraggingFile
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                }`}
              >
                <Upload className="w-6 h-6 text-slate-400" />
                <p className="font-semibold text-slate-700 text-xs">
                  Haz clic o arrastra una imagen aquí
                </p>
                <p className="text-[10px] text-slate-400">JPG, PNG o WebP</p>
              </div>
            )}

            {/* URL MODE */}
            {imageMode === 'url' && (
              <div>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/foto-calzado.jpg"
                  value={imagen}
                  onChange={(e) => setImagen(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Image Preview Thumbnail */}
            {imagen && (
              <div className="flex items-center space-x-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <img
                  src={imagen}
                  alt="Vista previa"
                  className="w-14 h-14 object-cover rounded-lg border border-slate-200 bg-white shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-800 block truncate">
                    Foto asignada al producto
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold block">
                    ✓ Lista para catálogo y punto de venta
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setImagen('')}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                  title="Eliminar foto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                {editingProduct
                  ? 'Guardar Cambios'
                  : entryMode === 'multi'
                  ? `Guardar Modelo y Crear ${activeSizes.length} Tallas (${totalPairsCount} pares)`
                  : 'Guardar Producto'}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
