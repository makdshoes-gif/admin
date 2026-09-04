import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign, Tag, Boxes, ShieldAlert } from 'lucide-react';
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
            <h3 className="font-bold text-sm text-slate-900">
              {editingProduct ? 'Editar Calzado' : 'Nuevo Modelo de Calzado'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
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

          {/* Optional Image URL */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              URL Imagen de Calzado (Opcional)
            </label>
            <input
              type="url"
              value={imagen}
              onChange={(e) => setImagen(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
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
