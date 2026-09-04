import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoeProduct,
  StockMovement,
  Sale,
  AccountBalance,
  DailyCashClosure,
  UserRole,
  Expense,
  BankMovement,
  CurrencyPurchase,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_MOVEMENTS,
  INITIAL_ACCOUNTS,
  INITIAL_SALES,
  INITIAL_EXCHANGE_RATE,
  INITIAL_EXPENSES,
  INITIAL_BANK_MOVEMENTS,
  INITIAL_CURRENCY_PURCHASES,
} from '../data/initialData';
import { fetchLiveBcvRate, BcvRateInfo } from '../services/bcvService';
import { 
  fetchExpensesApi, 
  saveExpenseApi, 
  deleteExpenseApi,
  fetchBankReconciliationsApi,
  saveBankReconciliationApi,
  updateBankReconciliationApi
} from '../services/api';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'success' | 'info' | 'critical';
  time: string;
  read: boolean;
}

interface StoreContextType {
  products: ShoeProduct[];
  movements: StockMovement[];
  sales: Sale[];
  accounts: AccountBalance[];
  exchangeRate: number;
  userRole: UserRole;
  cashClosures: DailyCashClosure[];
  notifications: ToastNotification[];
  criticalStockProducts: ShoeProduct[];
  bcvInfo: BcvRateInfo;
  isBcvSyncing: boolean;
  isAutoSyncEnabled: boolean;
  syncBcvRate: (silent?: boolean) => Promise<void>;
  setIsAutoSyncEnabled: (enabled: boolean) => void;
  setUserRole: (role: UserRole) => void;
  setExchangeRate: (rate: number, isManual?: boolean) => void;
  addProduct: (product: Omit<ShoeProduct, 'id' | 'created_at'>) => void;
  updateProduct: (id: string, updates: Partial<ShoeProduct>) => void;
  adjustStock: (
    productId: string,
    quantityChange: number,
    motivo: string,
    movementType?: 'entrada' | 'salida_ajuste' | 'devolucion'
  ) => void;
  deleteProduct: (id: string) => void;
  recordSale: (
    saleData: Omit<Sale, 'id' | 'created_at' | 'costo_total_usd' | 'ganancia_neta_usd'>
  ) => Sale;
  recordCashClosure: (
    notas?: string
  ) => DailyCashClosure;
  expenses: Expense[];
  bankMovements: BankMovement[];
  currencyPurchases: CurrencyPurchase[];
  addExpense: (expense: Omit<Expense, 'id' | 'created_at'>) => void;
  deleteExpense: (id: string) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  addBankMovement: (movement: Omit<BankMovement, 'id' | 'created_at'>) => void;
  updateBankMovement: (id: string, updates: Partial<BankMovement>) => void;
  importBankMovements: (movements: Omit<BankMovement, 'id' | 'created_at'>[]) => number;
  addCurrencyPurchase: (purchase: Omit<CurrencyPurchase, 'id' | 'created_at'>) => void;
  deleteCurrencyPurchase: (id: string) => void;
  markNotificationsAsRead: () => void;
  clearNotification: (id: string) => void;
  resetToDemoData: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEY = 'makd_shop_store_v2';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<ShoeProduct[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_products`);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_movements`);
    return saved ? JSON.parse(saved) : INITIAL_MOVEMENTS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_sales`);
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  const [accounts, setAccounts] = useState<AccountBalance[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_accounts`);
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_expenses`);
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [bankMovements, setBankMovements] = useState<BankMovement[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_bank_movements`);
    return saved ? JSON.parse(saved) : INITIAL_BANK_MOVEMENTS;
  });

  const [currencyPurchases, setCurrencyPurchases] = useState<CurrencyPurchase[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_currency_purchases`);
    return saved ? JSON.parse(saved) : INITIAL_CURRENCY_PURCHASES;
  });

  const [exchangeRate, setExchangeRateState] = useState<number>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_rate`);
    return saved ? Number(saved) : INITIAL_EXCHANGE_RATE;
  });

  const [bcvInfo, setBcvInfo] = useState<BcvRateInfo>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_bcv_info`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      rate: INITIAL_EXCHANGE_RATE,
      officialDate: new Date().toISOString(),
      lastSyncedAt: 'Al inicio',
      source: 'Banco Central de Venezuela (BCV)',
      status: 'synced',
    };
  });

  const [isBcvSyncing, setIsBcvSyncing] = useState<boolean>(false);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(true);

  const [userRole, setUserRole] = useState<UserRole>('admin');

  const [cashClosures, setCashClosures] = useState<DailyCashClosure[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_closures`);
    return saved ? JSON.parse(saved) : [];
  });

  const [notifications, setNotifications] = useState<ToastNotification[]>([
    {
      id: 'notif-init-1',
      title: 'Alerta de Stock Crítico',
      message: 'Adidas Samba OG talla 39 se encuentra agotado (0 pares).',
      type: 'critical',
      time: 'Hace 10 min',
      read: false,
    },
    {
      id: 'notif-init-2',
      title: 'Alerta de Reposición',
      message: 'Nike Air Force 1 talla 38 tiene solo 2 pares disponibles.',
      type: 'warning',
      time: 'Hace 30 min',
      read: false,
    }
  ]);

  // Persist whenever state changes
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_products`, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_movements`, JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_sales`, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_accounts`, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_rate`, exchangeRate.toString());
  }, [exchangeRate]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_closures`, JSON.stringify(cashClosures));
  }, [cashClosures]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_bank_movements`, JSON.stringify(bankMovements));
  }, [bankMovements]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_currency_purchases`, JSON.stringify(currencyPurchases));
  }, [currencyPurchases]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}_bcv_info`, JSON.stringify(bcvInfo));
  }, [bcvInfo]);

  // Sync expenses and bank reconciliations from Neon backend if configured
  useEffect(() => {
    fetchExpensesApi().then((neonExpenses) => {
      if (neonExpenses && neonExpenses.length > 0) {
        setExpenses((prev) => {
          // Merge remote with local to avoid losing new local items
          const existingIds = new Set(prev.map(e => e.id));
          const toAdd = neonExpenses.filter(e => !existingIds.has(e.id));
          return [...toAdd, ...prev];
        });
      }
    });

    fetchBankReconciliationsApi().then((neonMovements) => {
      if (neonMovements && neonMovements.length > 0) {
        setBankMovements((prev) => {
          const existingIds = new Set(prev.map(m => m.id));
          const toAdd = neonMovements.filter(m => !existingIds.has(m.id));
          return [...toAdd, ...prev];
        });
      }
    });
  }, []);

  const addNotification = useCallback((
    title: string,
    message: string,
    type: 'warning' | 'success' | 'info' | 'critical'
  ) => {
    const newNotif: ToastNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      message,
      type,
      time: 'Ahora',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
  }, []);

  const syncBcvRate = useCallback(async (silent = false) => {
    setIsBcvSyncing(true);
    try {
      const liveData = await fetchLiveBcvRate();
      const newRate = liveData.rate;
      
      setExchangeRateState((currentRate) => {
        if (Math.abs(currentRate - newRate) > 0.01) {
          addNotification(
            'Tasa BCV Sincronizada en Vivo',
            `Tasa oficial del BCV actualizada: ${newRate.toFixed(2)} Bs/USD (Fuente: ${liveData.source})`,
            'success'
          );
        } else if (!silent) {
          addNotification(
            'Tasa BCV al Día',
            `La tasa oficial confirmada por el BCV se mantiene en ${newRate.toFixed(2)} Bs/USD.`,
            'info'
          );
        }
        return newRate;
      });

      setBcvInfo({
        rate: newRate,
        officialDate: liveData.officialDate,
        lastSyncedAt: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        source: liveData.source,
        status: 'synced',
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Fallo de conexión';
      setBcvInfo((prev) => ({
        ...prev,
        status: 'error',
        error: errorMsg,
        lastSyncedAt: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
      }));

      if (!silent) {
        addNotification(
          'Alerta de Sincronización BCV',
          `No se pudo consultar la API del BCV en este instante (${errorMsg}). Se mantendrá la tasa local de ${exchangeRate.toFixed(2)} Bs/USD.`,
          'warning'
        );
      }
    } finally {
      setIsBcvSyncing(false);
    }
  }, [addNotification, exchangeRate]);

  // Auto-sync BCV on initial mount
  useEffect(() => {
    syncBcvRate(true);
  }, [syncBcvRate]);

  // Periodic real-time background sync every 3 minutes (180,000 ms)
  useEffect(() => {
    if (!isAutoSyncEnabled) return;
    const interval = setInterval(() => {
      syncBcvRate(true);
    }, 180000);
    return () => clearInterval(interval);
  }, [isAutoSyncEnabled, syncBcvRate]);

  const setExchangeRate = (rate: number, isManual = true) => {
    setExchangeRateState(rate);
    if (isManual) {
      setBcvInfo((prev) => ({
        ...prev,
        rate,
        status: 'manual',
        source: 'Ajuste Manual por Administrador',
        lastSyncedAt: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' }),
      }));
    }
    addNotification(
      'Tasa BCV Actualizada',
      `Nueva tasa establecida en ${rate.toFixed(2)} Bs/USD ${isManual ? '(Ajuste manual)' : '(Oficial)'}`,
      'info'
    );
  };

  const criticalStockProducts = useMemo(() => {
    return products.filter((p) => p.activo && p.stock <= p.stock_minimo);
  }, [products]);

  // Add Product
  const addProduct = (productData: Omit<ShoeProduct, 'id' | 'created_at'>) => {
    const newId = `prod-${Date.now()}`;
    const newProduct: ShoeProduct = {
      ...productData,
      id: newId,
      created_at: new Date().toISOString(),
    };

    setProducts((prev) => [newProduct, ...prev]);

    // If it has initial stock > 0, record movement
    if (newProduct.stock > 0) {
      const initialMovement: StockMovement = {
        id: `mov-${Date.now()}`,
        producto_id: newId,
        producto_nombre: newProduct.nombre,
        sku: newProduct.sku,
        talla: newProduct.talla,
        marca: newProduct.marca,
        tipo: 'entrada',
        cantidad: newProduct.stock,
        stock_anterior: 0,
        stock_nuevo: newProduct.stock,
        motivo: 'Inventario inicial al crear calzado',
        fecha: new Date().toISOString(),
        usuario: userRole === 'admin' ? 'Administrador' : 'Cajera',
      };
      setMovements((prev) => [initialMovement, ...prev]);
    }

    addNotification(
      'Producto Creado',
      `${newProduct.nombre} (Talla ${newProduct.talla}) agregado con éxito.`,
      'success'
    );
  };

  // Update Product
  const updateProduct = (id: string, updates: Partial<ShoeProduct>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return { ...p, ...updates };
        }
        return p;
      })
    );
    addNotification('Producto Actualizado', 'Información del calzado guardada.', 'info');
  };

  // Adjust stock in real time (Manual Batch entry, Scrap adjustment, Return)
  const adjustStock = (
    productId: string,
    quantityChange: number,
    motivo: string,
    movementType: 'entrada' | 'salida_ajuste' | 'devolucion' = quantityChange >= 0 ? 'entrada' : 'salida_ajuste'
  ) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const previousStock = product.stock;
    const newStock = Math.max(0, previousStock + quantityChange);
    const actualChange = newStock - previousStock;

    if (actualChange === 0) return;

    // Update product stock
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: newStock } : p))
    );

    // Record movement
    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      producto_id: product.id,
      producto_nombre: product.nombre,
      sku: product.sku,
      talla: product.talla,
      marca: product.marca,
      tipo: movementType,
      cantidad: actualChange,
      stock_anterior: previousStock,
      stock_nuevo: newStock,
      motivo: motivo || (actualChange > 0 ? 'Entrada de mercancía' : 'Ajuste de inventario'),
      fecha: new Date().toISOString(),
      usuario: userRole === 'admin' ? 'Administrador' : 'Cajera',
    };

    setMovements((prev) => [movement, ...prev]);

    // Real-time alerts
    if (newStock === 0) {
      addNotification(
        '¡Calzado Agotado!',
        `${product.nombre} (Talla ${product.talla}) quedó sin existencias.`,
        'critical'
      );
    } else if (newStock <= product.stock_minimo) {
      addNotification(
        'Alerta de Reposición',
        `${product.nombre} (Talla ${product.talla}) llegó a ${newStock} pares (Mín: ${product.stock_minimo}).`,
        'warning'
      );
    } else {
      addNotification(
        'Stock Actualizado',
        `${product.nombre} (Talla ${product.talla}): ${previousStock} ➔ ${newStock} pares.`,
        'success'
      );
    }
  };

  // Delete product
  const deleteProduct = (id: string) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addNotification('Producto Eliminado', `${product.nombre} retirado del catálogo.`, 'info');
  };

  // Record Sale (Instant real-time stock deduction, movement logging, financial balance update)
  const recordSale = (
    saleData: Omit<Sale, 'id' | 'created_at' | 'costo_total_usd' | 'ganancia_neta_usd'>
  ): Sale => {
    const saleId = `sale-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // 1. Calculate total cost and net profit
    let totalCosto = 0;
    const saleMovements: StockMovement[] = [];

    // 2. Real-time stock deductions
    setProducts((prevProducts) => {
      const updated = [...prevProducts];

      saleData.items.forEach((item) => {
        const prodIndex = updated.findIndex((p) => p.id === item.producto_id);
        if (prodIndex !== -1) {
          const prod = updated[prodIndex];
          const stockAnterior = prod.stock;
          const stockNuevo = Math.max(0, stockAnterior - item.cantidad);
          const itemCosto = typeof item.costo_unitario === 'number' ? item.costo_unitario : prod.costo;
          totalCosto += itemCosto * item.cantidad;

          updated[prodIndex] = {
            ...prod,
            stock: stockNuevo,
          };

          // Prepare stock movement
          saleMovements.push({
            id: `mov-${Date.now()}-${item.producto_id}`,
            producto_id: prod.id,
            producto_nombre: prod.nombre,
            sku: prod.sku,
            talla: prod.talla,
            marca: prod.marca,
            tipo: 'venta',
            cantidad: -item.cantidad,
            stock_anterior: stockAnterior,
            stock_nuevo: stockNuevo,
            motivo: `Venta Factura #${saleData.numero_factura}`,
            fecha: timestamp,
            usuario: userRole === 'admin' ? 'Administrador' : 'Cajera',
          });

          // Check if newly depleted
          if (stockNuevo === 0) {
            addNotification(
              '¡Producto Agotado en Venta!',
              `${prod.nombre} (Talla ${prod.talla}) quedó sin existencias.`,
              'critical'
            );
          } else if (stockNuevo <= prod.stock_minimo) {
            addNotification(
              'Alerta de Reposición Post-Venta',
              `${prod.nombre} (Talla ${prod.talla}) bajo umbral mínimo (${stockNuevo} pares restantes).`,
              'warning'
            );
          }
        } else {
          totalCosto += item.costo_unitario * item.cantidad;
        }
      });

      return updated;
    });

    // 3. Append all sale movements
    if (saleMovements.length > 0) {
      setMovements((prev) => [...saleMovements, ...prev]);
    }

    // 4. Update accounts balances based on payments
    setAccounts((prevAccounts) => {
      const updatedAccounts = [...prevAccounts];
      saleData.pagos.forEach((pago) => {
        const accIndex = updatedAccounts.findIndex((acc) => acc.nombre === pago.cuenta);
        if (accIndex !== -1) {
          updatedAccounts[accIndex] = {
            ...updatedAccounts[accIndex],
            saldo: updatedAccounts[accIndex].saldo + pago.monto,
          };
        }
      });
      return updatedAccounts;
    });

    // 5. Finalize Sale Record
    const gananciaNeta = saleData.total_usd - totalCosto;
    const completedSale: Sale = {
      ...saleData,
      id: saleId,
      costo_total_usd: totalCosto,
      ganancia_neta_usd: gananciaNeta,
      created_at: timestamp,
    };

    setSales((prev) => [completedSale, ...prev]);

    addNotification(
      'Venta Exitosa',
      `Factura #${completedSale.numero_factura} por $${completedSale.total_usd.toFixed(2)} (${completedSale.items.reduce((s, i) => s + i.cantidad, 0)} pares)`,
      'success'
    );

    return completedSale;
  };

  // Record Cash Register Closure (Arqueo de caja diario)
  const recordCashClosure = (notas?: string): DailyCashClosure => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter((s) => s.fecha.startsWith(todayStr));

    const totalUsd = todaySales.reduce((sum, s) => sum + s.total_usd, 0);
    const totalBs = todaySales.reduce((sum, s) => sum + s.total_bs, 0);
    const paresVendidos = todaySales.reduce(
      (sum, s) => sum + s.items.reduce((acc, it) => acc + it.cantidad, 0),
      0
    );

    // Sum breakdown by account for today
    const accountsMap: Record<string, { moneda: 'USD' | 'Bs'; monto: number; monto_usd: number }> = {};

    todaySales.forEach((s) => {
      s.pagos.forEach((p) => {
        if (!accountsMap[p.cuenta]) {
          accountsMap[p.cuenta] = {
            moneda: p.moneda,
            monto: 0,
            monto_usd: 0,
          };
        }
        accountsMap[p.cuenta].monto += p.monto;
        accountsMap[p.cuenta].monto_usd += p.monto_equivalente_usd;
      });
    });

    const desglose = Object.entries(accountsMap).map(([cuenta, data]) => ({
      cuenta,
      moneda: data.moneda,
      monto: data.monto,
      monto_usd: data.monto_usd,
    }));

    const closure: DailyCashClosure = {
      id: `close-${Date.now()}`,
      fecha: todayStr,
      usuario: userRole === 'admin' ? 'Administrador' : 'Cajera',
      total_ventas_usd: totalUsd,
      total_ventas_bs: totalBs,
      cantidad_transacciones: todaySales.length,
      pares_vendidos: paresVendidos,
      desglose_cuentas: desglose,
      cerrado_at: new Date().toISOString(),
      notas,
    };

    setCashClosures((prev) => [closure, ...prev]);
    addNotification(
      'Cierre de Caja Guardado',
      `Arqueo de ${todayStr} registrado con $${totalUsd.toFixed(2)} en ${todaySales.length} ventas.`,
      'success'
    );

    return closure;
  };

  // Add Expense
  const addExpense = (expenseData: Omit<Expense, 'id' | 'created_at'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };

    // Update expenses list
    setExpenses((prev) => [newExpense, ...prev]);

    // Deduct from account balance if account matches
    setAccounts((prevAccounts) =>
      prevAccounts.map((acc) => {
        if (acc.nombre.toLowerCase().includes(expenseData.cuenta_origen.toLowerCase()) ||
            expenseData.cuenta_origen.toLowerCase().includes(acc.nombre.toLowerCase())) {
          const deduct = acc.moneda === 'USD' ? expenseData.monto_usd : expenseData.monto_bs;
          return {
            ...acc,
            saldo: Math.max(0, acc.saldo - deduct),
          };
        }
        return acc;
      })
    );

    // Save to Neon API in background
    saveExpenseApi(newExpense).catch((e) => console.warn('Could not sync expense to Neon:', e));

    addNotification(
      'Gasto Registrado',
      `${expenseData.categoria}: $${expenseData.monto_usd.toFixed(2)} (${expenseData.descripcion})`,
      'info'
    );
  };

  const deleteExpense = (id: string) => {
    const target = expenses.find((e) => e.id === id);
    if (!target) return;

    setExpenses((prev) => prev.filter((e) => e.id !== id));

    // Revert account balance
    setAccounts((prevAccounts) =>
      prevAccounts.map((acc) => {
        if (acc.nombre.toLowerCase().includes(target.cuenta_origen.toLowerCase()) ||
            target.cuenta_origen.toLowerCase().includes(acc.nombre.toLowerCase())) {
          const refund = acc.moneda === 'USD' ? target.monto_usd : target.monto_bs;
          return {
            ...acc,
            saldo: acc.saldo + refund,
          };
        }
        return acc;
      })
    );

    deleteExpenseApi(id).catch((e) => console.warn('Could not delete expense on Neon:', e));

    addNotification('Gasto Eliminado', `Se eliminó el gasto "${target.descripcion}".`, 'info');
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const updated = { ...e, ...updates };
          saveExpenseApi(updated).catch((err) => console.warn('Could not update expense on Neon:', err));
          return updated;
        }
        return e;
      })
    );
  };

  // Bank Movements & Conciliation
  const addBankMovement = (movData: Omit<BankMovement, 'id' | 'created_at'>) => {
    const newMovement: BankMovement = {
      ...movData,
      id: `bm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };

    setBankMovements((prev) => [newMovement, ...prev]);
    saveBankReconciliationApi(newMovement).catch((e) => console.warn('Could not save bank movement:', e));

    addNotification(
      'Movimiento Bancario Agregado',
      `${newMovement.banco} - Ref: ${newMovement.referencia} (${newMovement.tipo === 'credito_ingreso' ? '+' : '-'}${newMovement.monto_bs.toLocaleString('es-VE')} Bs)`,
      'info'
    );
  };

  const updateBankMovement = (id: string, updates: Partial<BankMovement>) => {
    setBankMovements((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const updated = { ...m, ...updates };
          updateBankReconciliationApi(id, updates).catch((e) => console.warn('Could not update bank movement:', e));
          return updated;
        }
        return m;
      })
    );
  };

  // Batch import bank movements (e.g. from BDV statement)
  const importBankMovements = (movements: Omit<BankMovement, 'id' | 'created_at'>[]): number => {
    const newItems: BankMovement[] = movements.map((mov, idx) => ({
      ...mov,
      id: `bm-bdv-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    }));

    setBankMovements((prev) => [...newItems, ...prev]);

    // Save asynchronously to Neon if table exists
    newItems.forEach((item) => {
      saveBankReconciliationApi(item).catch(() => {});
    });

    addNotification(
      'Movimientos BDV Importados',
      `Se incorporaron con éxito ${newItems.length} movimientos de la cuenta Banco de Venezuela a la conciliación.`,
      'success'
    );

    return newItems.length;
  };

  // Currency Purchases (Conversión de Bs a Divisas / Binance / Zelle)
  const addCurrencyPurchase = (purchaseData: Omit<CurrencyPurchase, 'id' | 'created_at'>) => {
    const newPurchase: CurrencyPurchase = {
      ...purchaseData,
      id: `cp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };

    setCurrencyPurchases((prev) => [newPurchase, ...prev]);

    // 1. Descontar los Bolívares del saldo en Bs (Pago Móvil / Efectivo Bs)
    setAccounts((prevAccounts) =>
      prevAccounts.map((acc) => {
        if (acc.moneda === 'Bs' && acc.nombre.toLowerCase().includes('pago móvil')) {
          return {
            ...acc,
            saldo: Math.max(0, acc.saldo - purchaseData.monto_bs_gastado),
          };
        }
        return acc;
      })
    );

    // 2. Acreditar los Dólares al saldo positivo en USD (Binance / Zelle / Efectivo)
    setAccounts((prevAccounts) =>
      prevAccounts.map((acc) => {
        const methodLower = purchaseData.metodo.toLowerCase();
        if (
          (methodLower.includes('binance') && acc.nombre.toLowerCase().includes('binance')) ||
          (methodLower.includes('zelle') && acc.nombre.toLowerCase().includes('zelle')) ||
          (methodLower.includes('efectivo') && acc.nombre.toLowerCase().includes('efectivo usd'))
        ) {
          return {
            ...acc,
            saldo: acc.saldo + purchaseData.monto_usd_recibido,
          };
        }
        return acc;
      })
    );

    addNotification(
      'Compra de Divisas Registrada',
      `Conversión: -${purchaseData.monto_bs_gastado.toLocaleString('es-VE')} Bs ➔ +$${purchaseData.monto_usd_recibido.toFixed(2)} (${purchaseData.metodo})`,
      'success'
    );
  };

  const deleteCurrencyPurchase = (id: string) => {
    const target = currencyPurchases.find((c) => c.id === id);
    if (!target) return;

    setCurrencyPurchases((prev) => prev.filter((c) => c.id !== id));

    // Revertir balances
    setAccounts((prevAccounts) =>
      prevAccounts.map((acc) => {
        if (acc.moneda === 'Bs' && acc.nombre.toLowerCase().includes('pago móvil')) {
          return {
            ...acc,
            saldo: acc.saldo + target.monto_bs_gastado,
          };
        }
        const methodLower = target.metodo.toLowerCase();
        if (
          (methodLower.includes('binance') && acc.nombre.toLowerCase().includes('binance')) ||
          (methodLower.includes('zelle') && acc.nombre.toLowerCase().includes('zelle')) ||
          (methodLower.includes('efectivo') && acc.nombre.toLowerCase().includes('efectivo usd'))
        ) {
          return {
            ...acc,
            saldo: Math.max(0, acc.saldo - target.monto_usd_recibido),
          };
        }
        return acc;
      })
    );

    addNotification('Registro Eliminado', 'Se anuló la compra de divisas seleccionada.', 'info');
  };

  const markNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const resetToDemoData = () => {
    setProducts(INITIAL_PRODUCTS);
    setMovements(INITIAL_MOVEMENTS);
    setSales(INITIAL_SALES);
    setAccounts(INITIAL_ACCOUNTS);
    setExchangeRateState(INITIAL_EXCHANGE_RATE);
    setExpenses(INITIAL_EXPENSES);
    setBankMovements(INITIAL_BANK_MOVEMENTS);
    setCurrencyPurchases(INITIAL_CURRENCY_PURCHASES);
    setCashClosures([]);
    localStorage.removeItem(`${STORAGE_KEY}_products`);
    localStorage.removeItem(`${STORAGE_KEY}_movements`);
    localStorage.removeItem(`${STORAGE_KEY}_sales`);
    localStorage.removeItem(`${STORAGE_KEY}_accounts`);
    localStorage.removeItem(`${STORAGE_KEY}_rate`);
    localStorage.removeItem(`${STORAGE_KEY}_closures`);
    localStorage.removeItem(`${STORAGE_KEY}_expenses`);
    localStorage.removeItem(`${STORAGE_KEY}_bank_movements`);
    localStorage.removeItem(`${STORAGE_KEY}_currency_purchases`);
    addNotification('Datos Restaurados', 'Catálogo, compras de divisas, gastos y conciliaciones restablecidos.', 'info');
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        movements,
        sales,
        accounts,
        exchangeRate,
        userRole,
        cashClosures,
        notifications,
        criticalStockProducts,
        bcvInfo,
        isBcvSyncing,
        isAutoSyncEnabled,
        syncBcvRate,
        setIsAutoSyncEnabled,
        setUserRole,
        setExchangeRate,
        addProduct,
        updateProduct,
        adjustStock,
        deleteProduct,
        recordSale,
        recordCashClosure,
        expenses,
        bankMovements,
        currencyPurchases,
        addExpense,
        deleteExpense,
        updateExpense,
        addBankMovement,
        updateBankMovement,
        importBankMovements,
        addCurrencyPurchase,
        deleteCurrencyPurchase,
        markNotificationsAsRead,
        clearNotification,
        resetToDemoData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
