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
  SwitchCamera
} from 'lucide-react';
import { ShoeProduct, ShoeType } from '../../types';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Omit<ShoeProduct, 'id' | 'created_at'>) => void;
  editingProduct?: ShoeProduct | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProduct,
}) => {
  if (!isOpen) return null;

  const [nombre, setNombre] = useState(editingProduct?.nombre || '');
  const [sku, setSku] = useState(editingProduct?.sku || '');
  const [marca, setMarca] = useState(editingProduct?.marca || 'Nike');
  const [tipo, setTipo] = useState<ShoeType>(editingProduct?.tipo || 'Deportivo');
  const [talla, setTalla] = useState(editingProduct?.talla || '38');
  const [color, setColor] = useState(editingProduct?.color || 'Blanco');
  const [costo, setCosto] = useState(editingProduct?.costo.toString() || '40.00');
  const [precio, setPrecio] = useState(editingProduct?.precio.toString() || '80.00');
  const [stock, setStock] = useState(editingProduct?.stock.toString() || '5');
  const [stockMinimo, setStockMinimo] = useState(editingProduct?.stock_minimo.toString() || '3');
  const [imagen, setImagen] = useState(editingProduct?.imagen || '');
  const [categoria, setCategoria] = useState(editingProduct?.categoria || 'Calzado Deportivo');

  // Camera & Image Upload state
  const [imageMode, setImageMode] = useState<'camera' | 'upload' | 'url'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up camera stream on unmount or modal close
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    stopCamera();
    setCameraError(null);

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
        // Fallback to any available video camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Error al acceder a la cámara:', err);
      setCameraError(
        'No se pudo acceder a la cámara. Por favor autoriza los permisos en tu navegador o selecciona "Subir Imagen".'
      );
      setIsCameraActive(false);
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setImagen(photoDataUrl);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !sku.trim()) {
      alert('Por favor completa el nombre y SKU del calzado.');
      return;
    }

    stopCamera();

    onSave({
      nombre: nombre.trim(),
      sku: sku.trim().toUpperCase(),
      categoria,
      marca: marca.trim(),
      tipo,
      talla,
      color: color.trim(),
      moneda: 'USD',
      costo: parsedCosto,
      precio: parsedPrecio,
      stock: parseInt(stock, 10) || 0,
      stock_minimo: parseInt(stockMinimo, 10) || 2,
      activo: true,
      imagen: imagen.trim() || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop&q=80',
    });

    onClose();
  };

  const shoeTypes: ShoeType[] = ['Deportivo', 'Casual', 'Botas', 'Tacones', 'Sandalias', 'Mocasines', 'Infantil'];
  const sizes = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

  return (
    <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {editingProduct ? 'Editar Calzado' : 'Nuevo Modelo de Calzado'}
              </h3>
              <p className="text-[10px] text-slate-500">
                Sede Puerto Ordaz • Ciudad Alta Vista II, Local 163
              </p>
            </div>
          </div>
          <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">
                Nombre del Calzado *
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Nike Air Force 1 07 Low"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Código / SKU *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ej. NK-AF1-003"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Marca
              </label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Nike, Adidas, Zara..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Tipo
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as ShoeType)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
              >
                {shoeTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Talla de Calzado
              </label>
              <select
                value={talla}
                onChange={(e) => setTalla(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
              >
                {sizes.map((s) => (
                  <option key={s} value={s}>Talla {s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Color / Acabado
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ej. Blanco / Rojo"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Categoría
              </label>
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Calzado Deportivo, Formal..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Pricing & Cost */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              Precios y Rentabilidad ($ USD)
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Costo de Compra ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costo}
                  onChange={(e) => setCosto(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Precio de Venta ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-indigo-600 font-mono font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Profit margin live preview */}
            <div className="flex justify-between items-center text-[11px] px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 font-mono">
              <span className="text-slate-500">Margen por Par:</span>
              <span className="text-emerald-600 font-bold">
                +${margenGanancia.toFixed(2)} ({margenPorcentaje.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Stock & Minimum threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Stock Físico (Pares)
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span>Alerta Stock Mínimo</span>
              </label>
              <input
                type="number"
                min="1"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* FOTO DEL PRODUCTO: CÁMARA O SUBIR IMAGEN */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-600" />
                <span>Foto del Zapato</span>
              </label>
              
              {/* Method Tabs */}
              <div className="flex rounded-lg bg-slate-200/80 p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setImageMode('camera');
                    if (!isCameraActive) startCamera();
                  }}
                  className={`px-2 py-1 rounded-md font-semibold flex items-center gap-1 transition cursor-pointer ${
                    imageMode === 'camera'
                      ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3 h-3" />
                  <span>Cámara</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setImageMode('upload');
                  }}
                  className={`px-2 py-1 rounded-md font-semibold flex items-center gap-1 transition cursor-pointer ${
                    imageMode === 'upload'
                      ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>Subir Archivo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setImageMode('url');
                  }}
                  className={`px-2 py-1 rounded-md font-semibold flex items-center gap-1 transition cursor-pointer ${
                    imageMode === 'url'
                      ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Link className="w-3 h-3" />
                  <span>URL</span>
                </button>
              </div>
            </div>

            {/* TAB 1: CÁMARA EN VIVO */}
            {imageMode === 'camera' && (
              <div className="space-y-2">
                {isCameraActive ? (
                  <div className="relative bg-black rounded-lg overflow-hidden border border-slate-300 aspect-4/3 max-h-56 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Viewfinder crosshairs guide for framing the shoe */}
                    <div className="absolute inset-4 border-2 border-dashed border-white/60 rounded-lg pointer-events-none flex flex-col justify-between p-2">
                      <span className="text-[9px] text-white/90 bg-black/50 px-1.5 py-0.5 rounded self-start font-mono">
                        Enfoca el calzado aquí
                      </span>
                      <span className="text-[9px] text-white/90 bg-black/50 px-1.5 py-0.5 rounded self-end font-mono">
                        {cameraFacing === 'environment' ? 'Cámara Trasera' : 'Cámara Frontal'}
                      </span>
                    </div>

                    {/* Camera controls toolbar */}
                    <div className="absolute bottom-2 inset-x-2 flex items-center justify-between px-2 py-1 bg-black/70 backdrop-blur-xs rounded-lg">
                      <button
                        type="button"
                        onClick={handleSwitchCamera}
                        className="p-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white transition flex items-center gap-1 text-[10px] cursor-pointer"
                        title="Cambiar Cámara Frontal/Trasera"
                      >
                        <SwitchCamera className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Girar</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition"
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></div>
                        <span>Capturar Foto</span>
                      </button>

                      <button
                        type="button"
                        onClick={stopCamera}
                        className="p-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white transition text-[10px] cursor-pointer"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-white border border-slate-200 rounded-lg text-center space-y-2">
                    {cameraError ? (
                      <div className="text-rose-600 text-[11px] bg-rose-50 p-2 rounded border border-rose-200 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{cameraError}</span>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-[11px]">
                        Abre la cámara de tu teléfono o webcam de tu computadora para tomar la foto del zapato al instante.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Abrir Cámara</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SUBIR ARCHIVO */}
            {imageMode === 'upload' && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 border-2 border-dashed rounded-lg text-center transition cursor-pointer ${
                  isDraggingFile
                    ? 'border-indigo-500 bg-indigo-50/60'
                    : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-1">
                  <Upload className="w-4 h-4" />
                </div>
                <p className="font-semibold text-slate-700 text-[11px]">
                  Haz clic para seleccionar imagen o arrastra el archivo aquí
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Formatos soportados: JPG, PNG, WEBP (Hasta 10MB)
                </p>
              </div>
            )}

            {/* TAB 3: ENLACE URL */}
            {imageMode === 'url' && (
              <div>
                <input
                  type="url"
                  value={imagen}
                  onChange={(e) => setImagen(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {/* FOTO ACTUAL / PREVISUALIZACIÓN */}
            {imagen && (
              <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-slate-100 border border-slate-300 shrink-0">
                    <img
                      src={imagen}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-[11px] text-emerald-700 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Imagen cargada correctamente
                    </span>
                    <p className="text-[9px] text-slate-400 truncate max-w-56 font-mono">
                      {imagen.startsWith('data:') ? 'Foto capturada / archivo local' : imagen}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setImageMode('camera');
                      startCamera();
                    }}
                    title="Tomar otra foto"
                    className="p-1 text-slate-500 hover:text-indigo-600 rounded hover:bg-slate-100 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImagen('')}
                    title="Eliminar foto"
                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Calzado</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
