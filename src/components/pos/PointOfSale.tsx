import React, { useState, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Check,
  AlertCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Coins,
  Percent,
  User,
  Phone,
  FileText,
  DollarSign,
  Layers,
  Sparkles,
  RotateCcw,
  Landmark,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useStore } from '../../context/StoreContext';
import { ShoeProduct, SaleItem, SalePayment, Sale } from '../../types';
import { ReceiptModal } from '../common/ReceiptModal';
import { BdvVerificationModal } from '../common/BdvVerificationModal';

export const PointOfSale: React.FC = () => {
  const {
    products,
    exchangeRate,
    accounts,
    recordSale,
    userRole
  } = useStore();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedSize, setSelectedSize] = useState('Todas');

  // Cart State
  const [cart, setCart] = useState<{ product: ShoeProduct; quantity: number }[]>([]);
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [applyIva, setApplyIva] = useState(false);
  const ivaPercent = 16;

  // Customer Data
  const [customerName, setCustomerName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerRif, setCustomerRif] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Payment State (Mixed payments)
  const [isMixedPaymentOpen, setIsMixedPaymentOpen] = useState(false);
  const [singlePaymentAccount, setSinglePaymentAccount] = useState('Efectivo USD');
  const [mixedPayments, setMixedPayments] = useState<SalePayment[]>([]);

  // BDV Verification State
  const [showBdvModal, setShowBdvModal] = useState(false);
  const [bdvVerifiedData, setBdvVerifiedData] = useState<{
    referencia: string;
    codigo_aprobacion: string;
    monto_bs: number;
    fecha: string;
  } | null>(null);

  // Post-sale Receipt Modal
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  // Extract unique brands and types
  const brands = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.marca))).sort();
    return ['Todas', ...list];
  }, [products]);

  const shoeTypes = ['Todos', 'Deportivo', 'Casual', 'Botas', 'Tacones', 'Sandalias', 'Mocasines'];
  const shoeSizes = ['Todas', '36', '37', '38', '39', '40', '41', '42', '43', '44'];

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.activo) return false;
      const matchSearch =
        p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.color.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.talla.includes(searchQuery);

      const matchBrand = selectedBrand === 'Todas' || p.marca === selectedBrand;
      const matchType = selectedType === 'Todos' || p.tipo === selectedType;
      const matchSize = selectedSize === 'Todas' || p.talla === selectedSize;

      return matchSearch && matchBrand && matchType && matchSize;
    });
  }, [products, searchQuery, selectedBrand, selectedType, selectedSize]);

  // Cart Calculations
  const subtotalUsd = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.precio * item.quantity, 0);
  }, [cart]);

  const discountUsd = useMemo(() => {
    if (discountType === 'percent') {
      return (subtotalUsd * (discountValue || 0)) / 100;
    }
    if (discountType === 'fixed') {
      return Math.min(subtotalUsd, discountValue || 0);
    }
    return 0;
  }, [subtotalUsd, discountType, discountValue]);

  const ivaUsd = useMemo(() => {
    if (!applyIva) return 0;
    return (subtotalUsd - discountUsd) * (ivaPercent / 100);
  }, [subtotalUsd, discountUsd, applyIva, ivaPercent]);

  const totalUsd = Math.max(0, subtotalUsd - discountUsd + ivaUsd);
  const totalBs = totalUsd * exchangeRate;

  // Add to Cart
  const handleAddToCart = (product: ShoeProduct) => {
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          return prev; // cannot exceed available stock
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as { product: ShoeProduct; quantity: number }[];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerLastName('');
    setCustomerRif('');
    setCustomerPhone('');
    setDiscountType('none');
    setDiscountValue(0);
    setMixedPayments([]);
    setBdvVerifiedData(null);
  };

  // Mixed Payment Helper
  const totalPaidUsd = useMemo(() => {
    return mixedPayments.reduce((acc, p) => acc + p.monto_equivalente_usd, 0);
  }, [mixedPayments]);

  const remainingToPayUsd = Math.max(0, totalUsd - totalPaidUsd);

  const handleAddMixedPayment = (accountName: string, amountInput: number, ref?: string) => {
    const acc = accounts.find((a) => a.nombre === accountName);
    if (!acc || amountInput <= 0) return;

    let eqUsd = 0;
    if (acc.moneda === 'Bs') {
      eqUsd = amountInput / exchangeRate;
    } else {
      eqUsd = amountInput;
    }

    const newPayment: SalePayment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      cuenta: acc.nombre,
      moneda: acc.moneda,
      monto: amountInput,
      tasa: acc.moneda === 'Bs' ? exchangeRate : 1,
      monto_equivalente_usd: eqUsd,
      referencia: ref || undefined,
    };

    setMixedPayments((prev) => [...prev, newPayment]);
  };

  const handleRemoveMixedPayment = (id: string) => {
    setMixedPayments((prev) => prev.filter((p) => p.id !== id));
  };

  // Finalize Sale
  const handleFinalizeSale = () => {
    if (cart.length === 0) return;

    // Check payments
    let finalPayments: SalePayment[] = [];
    if (isMixedPaymentOpen) {
      if (Math.abs(totalPaidUsd - totalUsd) > 0.1 && totalPaidUsd < totalUsd) {
        alert(`Falta por cubrir $${(totalUsd - totalPaidUsd).toFixed(2)} para completar el pago.`);
        return;
      }
      finalPayments = mixedPayments;
    } else {
      // Single payment method
      const acc = accounts.find((a) => a.nombre === singlePaymentAccount);
      const isBs = acc?.moneda === 'Bs';
      finalPayments = [
        {
          id: `pay-${Date.now()}`,
          cuenta: singlePaymentAccount,
          moneda: isBs ? 'Bs' : 'USD',
          monto: isBs ? totalBs : totalUsd,
          tasa: isBs ? exchangeRate : 1,
          monto_equivalente_usd: totalUsd,
          referencia: singlePaymentAccount.includes('Pago Móvil') && bdvVerifiedData ? bdvVerifiedData.referencia : undefined,
        },
      ];
    }

    const saleItems: SaleItem[] = cart.map((item) => ({
      producto_id: item.product.id,
      nombre_producto: item.product.nombre,
      sku: item.product.sku,
      talla: item.product.talla,
      marca: item.product.marca,
      cantidad: item.quantity,
      precio_unitario: item.product.precio,
      costo_unitario: item.product.costo,
      subtotal: item.product.precio * item.quantity,
    }));

    const invoiceNumber = `MK-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSale = recordSale({
      numero_factura: invoiceNumber,
      cliente_nombre: customerName.trim() || 'Consumidor',
      cliente_apellido: customerLastName.trim() || 'Final',
      cliente_rif: customerRif.trim() || undefined,
      cliente_telefono: customerPhone.trim() || undefined,
      items: saleItems,
      subtotal_usd: subtotalUsd,
      descuento_usd: discountUsd,
      aplica_iva: applyIva,
      porcentaje_iva: applyIva ? ivaPercent : 0,
      iva_monto_usd: ivaUsd,
      total_usd: totalUsd,
      total_bs: totalBs,
      tasa_cambio: exchangeRate,
      pagos: finalPayments,
      fecha: new Date().toISOString(),
      usuario: userRole === 'admin' ? 'Admin' : 'Cajera',
    });

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // fallback safe
    }

    // Reset Form & open receipt
    handleClearCart();
    setIsMixedPaymentOpen(false);
    setLastSale(newSale);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      
      {/* Top Banner / Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Terminal de Ventas & Facturación</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
              Descuento en Tiempo Real
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecciona el modelo de calzado, ajusta tallas, aplica descuentos y factura en multimoneda con rebaja automática de inventario.
          </p>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Tasa BCV del Día</span>
            <span className="text-sm font-mono font-bold text-indigo-600">1 USD = {exchangeRate.toFixed(2)} Bs</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Catalog (Left) + Cart & Checkout (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Shoe Catalog (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search & Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                id="pos-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por modelo, marca (Nike, Adidas...), SKU o talla..."
                className="w-full pl-9 pr-14 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-1.5 items-center text-xs">
              <span className="text-slate-500 font-semibold flex items-center gap-1 mr-1 text-[11px]">
                <Layers className="w-3 h-3 text-indigo-600" /> Talla:
              </span>
              {shoeSizes.map((sz) => (
                <button
                  key={sz}
                  onClick={() => setSelectedSize(sz)}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors cursor-pointer ${
                    selectedSize === sz
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>

            {/* Filter by Brand & Type */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Marca de Calzado
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  {brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Tipo de Calzado
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  {shoeTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[640px] overflow-y-auto pr-1">
            {filteredProducts.length === 0 ? (
              <div className="col-span-2 py-12 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-500">
                <p className="text-sm font-semibold text-slate-700">No se encontraron pares con esos criterios.</p>
                <p className="text-xs text-slate-400 mt-1">Prueba cambiando la talla o limpiando el filtro de búsqueda.</p>
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const inCart = cart.find((i) => i.product.id === prod.id);
                const isOutOfStock = prod.stock <= 0;
                const isLowStock = prod.stock > 0 && prod.stock <= prod.stock_minimo;

                return (
                  <div
                    key={prod.id}
                    id={`pos-card-${prod.id}`}
                    className={`p-3.5 rounded-xl border bg-white transition-all shadow-xs flex flex-col justify-between ${
                      isOutOfStock
                        ? 'border-slate-200 opacity-60'
                        : 'border-slate-200 hover:border-indigo-400 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Card Image and Badges */}
                      <div className="relative mb-2.5 rounded-lg overflow-hidden bg-slate-100 h-32 flex items-center justify-center border border-slate-200/60">
                        {prod.imagen ? (
                          <img
                            src={prod.imagen}
                            alt={prod.nombre}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-3xl">👟</span>
                        )}

                        {/* Size Badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-mono font-bold">
                          Talla: {prod.talla}
                        </div>

                        {/* Stock Status Badge */}
                        <div className="absolute top-2 right-2">
                          {isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold uppercase">
                              Agotado
                            </span>
                          ) : isLowStock ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                              Últimos {prod.stock}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                              {prod.stock} pares
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Brand & Name */}
                      <div className="text-[10px] uppercase tracking-wider font-bold text-indigo-600">
                        {prod.marca} • {prod.tipo}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1 mt-0.5">
                        {prod.nombre}
                      </h3>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-between">
                        <span>{prod.color}</span>
                        <span className="font-mono text-[10px] text-slate-400">{prod.sku}</span>
                      </div>
                    </div>

                    {/* Price & Add to Cart Button */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-base font-bold text-slate-900 font-mono">
                          ${prod.precio.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {(prod.precio * exchangeRate).toFixed(0)} Bs
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddToCart(prod)}
                        disabled={isOutOfStock || (inCart && inCart.quantity >= prod.stock)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isOutOfStock
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : inCart && inCart.quantity >= prod.stock
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{inCart ? `(${inCart.quantity}) +` : 'Agregar'}</span>
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right Column: Active Cart & Checkout Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-indigo-600" />
                <h2 className="font-bold text-sm text-slate-900">Carrito de Venta</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                  {cart.reduce((s, i) => s + i.quantity, 0)} pares
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Vaciar
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 my-2">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  El carrito está vacío. Haz clic en un zapato del catálogo para agregarlo.
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {item.product.nombre}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        <span className="font-bold text-indigo-600">Talla: {item.product.talla}</span>
                        <span>•</span>
                        <span>${item.product.precio.toFixed(2)} c/u</span>
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                      <button
                        onClick={() => handleUpdateQuantity(item.product.id, -1)}
                        className="text-slate-500 hover:text-slate-900 p-0.5 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-xs font-bold text-slate-900 w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.product.id, 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="text-slate-500 hover:text-slate-900 p-0.5 disabled:opacity-30 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right min-w-16">
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        ${(item.product.precio * item.quantity).toFixed(2)}
                      </div>
                      <button
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-[10px] text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Customer Details Form */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-600" /> Datos del Comprador
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre"
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
                <input
                  type="text"
                  value={customerLastName}
                  onChange={(e) => setCustomerLastName(e.target.value)}
                  placeholder="Apellido"
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customerRif}
                  onChange={(e) => setCustomerRif(e.target.value)}
                  placeholder="Cédula / RIF (ej. V-23.400...)"
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="WhatsApp / Teléfono"
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Discounts and Taxes */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-indigo-600" /> Descuento:
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { label: '0%', val: 0 },
                    { label: '5%', val: 5 },
                    { label: '10%', val: 10 },
                    { label: '15%', val: 15 },
                  ].map((d) => (
                    <button
                      key={d.label}
                      onClick={() => {
                        if (d.val === 0) {
                          setDiscountType('none');
                          setDiscountValue(0);
                        } else {
                          setDiscountType('percent');
                          setDiscountValue(d.val);
                        }
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        (d.val === 0 && discountType === 'none') || (discountType === 'percent' && discountValue === d.val)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tax Toggle */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">IVA (16% SENIAT):</span>
                <button
                  onClick={() => setApplyIva(!applyIva)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    applyIva
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {applyIva ? 'IVA Aplicado (+16%)' : 'Exento de IVA'}
                </button>
              </div>
            </div>

            {/* Payment Method Selector (Single vs Mixed) */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Método de Pago</span>
                <button
                  onClick={() => setIsMixedPaymentOpen(!isMixedPaymentOpen)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold underline cursor-pointer"
                >
                  {isMixedPaymentOpen ? 'Volver a Pago Único' : 'Dividir Pago Mixto'}
                </button>
              </div>

              {!isMixedPaymentOpen ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => setSinglePaymentAccount(acc.nombre)}
                      className={`p-2 rounded-lg text-left border transition text-xs flex items-center justify-between cursor-pointer ${
                        singlePaymentAccount === acc.nombre
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{acc.nombre}</span>
                      <span className="text-[10px] text-slate-400">({acc.moneda})</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="text-[11px] text-slate-700 font-bold">
                    Cobro Multimoneda Combinado:
                  </div>

                  {/* List of current mixed payments */}
                  {mixedPayments.map((pay) => (
                    <div
                      key={pay.id}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{pay.cuenta}:</span>{' '}
                        <span className="font-mono text-indigo-600 font-bold">
                          {pay.moneda === 'Bs' ? `${pay.monto.toFixed(2)} Bs` : `$${pay.monto.toFixed(2)}`}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          (~${pay.monto_equivalente_usd.toFixed(2)})
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveMixedPayment(pay.id)}
                        className="text-rose-600 hover:text-rose-700 text-xs font-bold cursor-pointer"
                      >
                        Quitar
                      </button>
                    </div>
                  ))}

                  {/* Add payment line */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <select
                      id="mixed-pay-account"
                      className="col-span-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.nombre}>
                          {a.nombre}
                        </option>
                      ))}
                    </select>
                    <input
                      id="mixed-pay-amount"
                      type="number"
                      step="0.01"
                      placeholder="Monto"
                      className="col-span-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const selAcc = (document.getElementById('mixed-pay-account') as HTMLSelectElement).value;
                        const amt = parseFloat((document.getElementById('mixed-pay-amount') as HTMLInputElement).value);
                        if (amt > 0) {
                          handleAddMixedPayment(selAcc, amt);
                          (document.getElementById('mixed-pay-amount') as HTMLInputElement).value = '';
                        }
                      }}
                      className="col-span-1 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs cursor-pointer shadow-xs"
                    >
                      + Cobrar
                    </button>
                  </div>

                  <div className="pt-2 flex justify-between text-[11px] font-mono border-t border-slate-200">
                    <span className="text-slate-500">Cubierto: ${totalPaidUsd.toFixed(2)}</span>
                    <span className={remainingToPayUsd > 0.05 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                      Restante: ${remainingToPayUsd.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* BDV Pago Móvil Live Verification Callout */}
              {(singlePaymentAccount.includes('Pago Móvil') || isMixedPaymentOpen) && (
                <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-red-700 font-bold text-xs">
                      <Landmark className="w-3.5 h-3.5" />
                      <span>Conciliación BDV en Línea</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-red-600 border border-red-200">
                      API 0102
                    </span>
                  </div>

                  {bdvVerifiedData ? (
                    <div className="bg-white p-2 rounded-lg border border-emerald-300 text-emerald-900 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="font-bold block text-[11px]">Pago BDV Verificado</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Ref: {bdvVerifiedData.referencia} • {bdvVerifiedData.codigo_aprobacion}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowBdvModal(true)}
                        className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-600">
                        Verifica en segundos que los Bolívares ingresaron a la cuenta BDV.
                      </p>
                      <button
                        type="button"
                        id="open-bdv-verify-btn"
                        onClick={() => setShowBdvModal(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verificar BDV</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Totals Summary */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-800">${subtotalUsd.toFixed(2)}</span>
              </div>
              {discountUsd > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 font-medium">
                  <span>Descuento aplicado:</span>
                  <span className="font-mono">-${discountUsd.toFixed(2)}</span>
                </div>
              )}
              {applyIva && (
                <div className="flex justify-between text-xs text-slate-500">
                  <span>IVA (16%):</span>
                  <span className="font-mono text-slate-800">+${ivaUsd.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-900">TOTAL A PAGAR:</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-indigo-600 font-mono">
                    ${totalUsd.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500 font-mono font-semibold">
                    {totalBs.toFixed(2)} Bs
                  </div>
                </div>
              </div>
            </div>

            {/* Complete Sale Button */}
            <button
              id="complete-sale-btn"
              onClick={handleFinalizeSale}
              disabled={cart.length === 0}
              className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar y Facturar Venta</span>
            </button>

          </div>

        </div>

      </div>

      {/* Post-Sale Receipt Modal */}
      <ReceiptModal sale={lastSale} onClose={() => setLastSale(null)} />

      {/* BDV Live Payment Verification Modal */}
      <BdvVerificationModal
        isOpen={showBdvModal}
        onClose={() => setShowBdvModal(false)}
        expectedAmountBs={totalBs}
        expectedAmountUsd={totalUsd}
        initialCustomerPhone={customerPhone}
        initialCustomerRif={customerRif}
        onVerificationSuccess={(res) => {
          setBdvVerifiedData({
            referencia: res.referencia,
            codigo_aprobacion: res.codigo_aprobacion,
            monto_bs: res.monto_bs,
            fecha: res.fecha_transaccion,
          });
          setShowBdvModal(false);
        }}
      />

    </div>
  );
};
