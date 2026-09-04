export type ShoeType = 'Deportivo' | 'Casual' | 'Botas' | 'Tacones' | 'Sandalias' | 'Mocasines' | 'Infantil';

export type Currency = 'USD' | 'Bs';

export type UserRole = 'admin' | 'cajera';

export interface ShoeProduct {
  id: string;
  nombre: string;
  sku: string;
  categoria: string;
  marca: string;
  tipo: ShoeType;
  talla: string; // ej: "36", "37", "38", "39", "40", "41", "42", "43", "44"
  color: string;
  moneda: Currency;
  precio: number;      // Precio de venta en USD
  costo: number;       // Costo de compra en USD
  stock: number;       // Cantidad física actual
  stock_minimo: number;// Umbral de alerta para reposición
  activo: boolean;
  imagen?: string;
  created_at: string;
}

export type MovementType = 'entrada' | 'salida_ajuste' | 'venta' | 'devolucion';

export interface StockMovement {
  id: string;
  producto_id: string;
  producto_nombre: string;
  sku: string;
  talla: string;
  marca: string;
  tipo: MovementType;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo: string;
  fecha: string;
  usuario: string;
}

export interface SaleItem {
  producto_id: string;
  nombre_producto: string;
  sku: string;
  talla: string;
  marca: string;
  cantidad: number;
  precio_unitario: number; // en USD
  costo_unitario: number;  // en USD
  subtotal: number;        // en USD
}

export interface SalePayment {
  id: string;
  cuenta: string;         // 'Efectivo USD' | 'Efectivo Bs' | 'Pago Móvil' | 'Zelle' | 'Binance' | 'Cashea'
  moneda: Currency;
  monto: number;          // Monto en la moneda seleccionada
  tasa: number;           // Tasa de cambio aplicada
  monto_equivalente_usd: number;
  referencia?: string;
}

export interface Sale {
  id: string;
  numero_factura: string;
  cliente_nombre: string;
  cliente_apellido?: string;
  cliente_rif?: string;
  cliente_telefono?: string;
  cliente_correo?: string;
  items: SaleItem[];
  subtotal_usd: number;
  descuento_usd: number;
  aplica_iva: boolean;
  porcentaje_iva: number;
  iva_monto_usd: number;
  total_usd: number;
  total_bs: number;
  costo_total_usd: number;
  ganancia_neta_usd: number;
  tasa_cambio: number;
  pagos: SalePayment[];
  fecha: string;          // ISO string
  usuario: string;
  notas?: string;
  created_at: string;
}

export interface AccountBalance {
  id: string;
  nombre: string;
  moneda: Currency;
  saldo: number;
  icono?: string;
}

export interface DailyCashClosure {
  id: string;
  fecha: string; // YYYY-MM-DD
  usuario: string;
  total_ventas_usd: number;
  total_ventas_bs: number;
  cantidad_transacciones: number;
  pares_vendidos: number;
  desglose_cuentas: {
    cuenta: string;
    moneda: Currency;
    monto: number;
    monto_usd: number;
  }[];
  cerrado_at: string;
  notas?: string;
}

export type ReportPeriod = 'hoy' | 'ayer' | 'ultimos_7_dias' | 'este_mes' | 'mes_anterior' | 'personalizado';

export interface SalesReportFilter {
  periodo: ReportPeriod;
  fechaInicio?: string;
  fechaFin?: string;
  marca?: string;
  tipo?: string;
}
