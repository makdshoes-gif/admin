import { ShoeProduct, StockMovement, Sale, AccountBalance, Expense, BankMovement, CurrencyPurchase } from '../types';

export const INITIAL_EXCHANGE_RATE = 68.50; // Tasa oficial BCV Bs/USD referencial

// Catálogo limpio para que el usuario registre su inventario real
export const INITIAL_PRODUCTS: ShoeProduct[] = [];

// Historial de movimientos de inventario limpio
export const INITIAL_MOVEMENTS: StockMovement[] = [];

// Cuentas del negocio listas para operar con saldo inicial en cero
export const INITIAL_ACCOUNTS: AccountBalance[] = [
  { id: 'acc-1', nombre: 'Efectivo USD', moneda: 'USD', saldo: 0.00, icono: 'Banknote' },
  { id: 'acc-2', nombre: 'Efectivo Bs', moneda: 'Bs', saldo: 0.00, icono: 'Banknote' },
  { id: 'acc-3', nombre: 'Pago Móvil (BDV)', moneda: 'Bs', saldo: 0.00, icono: 'Smartphone' },
  { id: 'acc-pos', nombre: 'Punto de Venta', moneda: 'Bs', saldo: 0.00, icono: 'CreditCard' },
  { id: 'acc-4', nombre: 'Zelle', moneda: 'USD', saldo: 0.00, icono: 'CreditCard' },
  { id: 'acc-5', nombre: 'Binance USDT', moneda: 'USD', saldo: 0.00, icono: 'Coins' },
  { id: 'acc-6', nombre: 'Cashea', moneda: 'USD', saldo: 0.00, icono: 'CircleDollarSign' },
];

// Ventas registradas limpias
export const INITIAL_SALES: Sale[] = [];

// Gastos operativos limpios
export const INITIAL_EXPENSES: Expense[] = [];

// Movimientos bancarios para conciliación limpios
export const INITIAL_BANK_MOVEMENTS: BankMovement[] = [];

// Compras de divisas (Binance, Zelle, Efectivo) limpias
export const INITIAL_CURRENCY_PURCHASES: CurrencyPurchase[] = [];
