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

export interface BdvVerificationData {
  referencia: string;
  telefono_origen: string;
  cedula_cliente: string;
  banco_origen: string;
  monto_bs: number;
  monto_usd?: number;
}

export interface BdvVerificationResponse {
  aprobado: boolean;
  codigo_aprobacion: string;
  referencia: string;
  monto_bs: number;
  monto_usd_estimado?: number;
  telefono_origen: string;
  cedula_cliente: string;
  banco_origen: string;
  cuenta_receptora: string;
  fecha_transaccion: string;
  modo: 'PRODUCCION' | 'SANDBOX_VERIFICADO';
  mensaje: string;
}

export interface NeonDbStatus {
  connected: boolean;
  message: string;
  databaseName?: string;
  productsCount?: number;
  salesCount?: number;
  error?: string;
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

export type ExpenseCategory =
  | 'Alquiler de Local'
  | 'Nómina y Sueldos'
  | 'Servicios Públicos (Luz/Agua/Internet)'
  | 'Fletes y Transporte'
  | 'Compra de Mercancía / Proveedores'
  | 'Empaques, Bolsas y Cajas'
  | 'Publicidad y Redes Sociales'
  | 'Mantenimiento y Reparaciones'
  | 'Impuestos y Tasas Municipales'
  | 'Comisiones y Gastos Bancarios'
  | 'Otros Gastos Operativos';

export interface Expense {
  id: string;
  fecha: string; // YYYY-MM-DD
  categoria: ExpenseCategory;
  descripcion: string;
  beneficiario?: string;
  cuenta_origen: string; // 'Efectivo USD', 'Efectivo Bs', 'Pago Móvil BDV', etc.
  moneda: Currency;
  monto: number;
  tasa_cambio: number;
  monto_usd: number;
  monto_bs: number;
  comprobante_ref?: string;
  registrado_por: string;
  notas?: string;
  created_at: string;
}

export interface BankMovement {
  id: string;
  fecha: string;
  banco: string; // 'Banco de Venezuela (0102)', 'Banesco (0134)', 'Mercantil (0105)', etc.
  tipo: 'credito_ingreso' | 'debito_egreso';
  referencia: string;
  descripcion: string;
  monto_bs: number;
  monto_usd?: number;
  estado_conciliacion: 'conciliado' | 'pendiente' | 'discrepancia';
  vinculado_tipo?: 'venta' | 'gasto' | 'transferencia' | 'otro';
  vinculado_id?: string;
  notas?: string;
  created_at: string;
}

export interface NeonTableColumn {
  column_name: string;
  data_type: string;
}

export interface NeonTableInfo {
  table_name: string;
  row_count?: number;
}

export type CurrencyPurchaseMethod =
  | 'Binance P2P (USDT)'
  | 'Zelle'
  | 'Dólares Efectivo'
  | 'Transferencia USD';

export interface CurrencyPurchase {
  id: string;
  fecha: string; // YYYY-MM-DD
  metodo: CurrencyPurchaseMethod;
  monto_bs_gastado: number; // Bolívares que se descuentan del balance positivo en Bs
  tasa_compra: number;      // Tasa en Bs por cada $
  monto_usd_recibido: number; // Dólares netos que se acreditan al balance positivo en USD
  comision_usd?: number;
  referencia?: string;      // N° de orden Binance, ID de Zelle, etc.
  usuario: string;
  notas?: string;
  created_at: string;
}

export interface BdvParsedMovement {
  id: string;
  fecha: string;
  referencia: string;
  descripcion: string;
  tipo: 'credito_ingreso' | 'debito_egreso';
  monto_bs: number;
  saldo_bs?: number;
  estado_conciliacion: 'conciliado' | 'pendiente' | 'discrepancia';
  venta_id?: string;
  factura_ref?: string;
  cliente?: string;
}

