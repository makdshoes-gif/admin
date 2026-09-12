import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { 
  checkDatabaseConnection, 
  getNeonSql, 
  initDatabaseSchema, 
  getNeonTables, 
  getNeonTableData,
  getDailyClosures,
  addDailyClosure,
  replaceDailyClosures,
  normalizeProducts,
  normalizeSales,
  normalizeExpenses,
  normalizeBankReconciliations,
} from './server/db.js';
import { verifyBdvPayment, getBdvApiConfig, getRecentVerifications } from './server/bdv.js';
import { analyzeShoeImage, removeBackgroundWithGemini } from './server/shoeAi.js';

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');
const STORE_FILE = path.join(DATA_DIR, 'store_state.json');

export interface ServerStoreState {
  products: any[];
  sales: any[];
  layaways?: any[];
  movements: any[];
  accounts: any[];
  cashClosures: any[];
  expenses: any[];
  bankMovements: any[];
  currencyPurchases: any[];
  exchangeRate: number;
  adminPin: string;
  updatedAt: string;
}

const DEFAULT_ACCOUNTS = [
  { id: 'acc-1', nombre: 'Efectivo USD', moneda: 'USD', saldo: 0.00, icono: 'Banknote' },
  { id: 'acc-2', nombre: 'Efectivo Bs', moneda: 'Bs', saldo: 0.00, icono: 'Banknote' },
  { id: 'acc-3', nombre: 'Pago Móvil (BDV)', moneda: 'Bs', saldo: 0.00, icono: 'Smartphone' },
  { id: 'acc-pos', nombre: 'Punto de Venta', moneda: 'Bs', saldo: 0.00, icono: 'CreditCard' },
  { id: 'acc-4', nombre: 'Zelle', moneda: 'USD', saldo: 0.00, icono: 'CreditCard' },
  { id: 'acc-5', nombre: 'Binance USDT', moneda: 'USD', saldo: 0.00, icono: 'Coins' },
  { id: 'acc-6', nombre: 'Cashea', moneda: 'USD', saldo: 0.00, icono: 'CircleDollarSign' },
];

const SAMPLE_ADIZERO_PRODUCTS = [
  {
    id: 'prod-adizero-purehustle-40',
    nombre: 'Adidas Adizero PureHustle Cleats White & Silver',
    sku: 'ADI-ADZ-WHTSLV-40',
    categoria: 'Calzado',
    marca: 'Adidas',
    tipo: 'Deportivo',
    talla: '40',
    color: 'Blanco y Plata Metálica',
    moneda: 'USD',
    precio: 75.0,
    costo: 42.0,
    stock: 6,
    stock_minimo: 2,
    activo: true,
    imagen: '/adizero-purehustle-studio.jpg',
    descripcion: 'Calzado deportivo de alto rendimiento Adidas Adizero PureHustle con placa de tracción de tacos metálicos, acabado en plata reflectante, capellada ultraligera transpirable y amortiguación receptiva para campo y entrenamiento.',
    genero: 'Unisex',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-adizero-purehustle-41',
    nombre: 'Adidas Adizero PureHustle Cleats White & Silver',
    sku: 'ADI-ADZ-WHTSLV-41',
    categoria: 'Calzado',
    marca: 'Adidas',
    tipo: 'Deportivo',
    talla: '41',
    color: 'Blanco y Plata Metálica',
    moneda: 'USD',
    precio: 75.0,
    costo: 42.0,
    stock: 8,
    stock_minimo: 2,
    activo: true,
    imagen: '/adizero-purehustle-studio.jpg',
    descripcion: 'Calzado deportivo de alto rendimiento Adidas Adizero PureHustle con placa de tracción de tacos metálicos, acabado en plata reflectante, capellada ultraligera transpirable y amortiguación receptiva para campo y entrenamiento.',
    genero: 'Unisex',
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-adizero-purehustle-42',
    nombre: 'Adidas Adizero PureHustle Cleats White & Silver',
    sku: 'ADI-ADZ-WHTSLV-42',
    categoria: 'Calzado',
    marca: 'Adidas',
    tipo: 'Deportivo',
    talla: '42',
    color: 'Blanco y Plata Metálica',
    moneda: 'USD',
    precio: 75.0,
    costo: 42.0,
    stock: 5,
    stock_minimo: 2,
    activo: true,
    imagen: '/adizero-purehustle-studio.jpg',
    descripcion: 'Calzado deportivo de alto rendimiento Adidas Adizero PureHustle con placa de tracción de tacos metálicos, acabado en plata reflectante, capellada ultraligera transpirable y amortiguación receptiva para campo y entrenamiento.',
    genero: 'Unisex',
    created_at: new Date().toISOString(),
  }
];

function readServerStore(): ServerStoreState {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
      return {
        products: Array.isArray(data.products) && data.products.length > 0 ? data.products : SAMPLE_ADIZERO_PRODUCTS,
        sales: Array.isArray(data.sales) ? data.sales : [],
        layaways: Array.isArray(data.layaways) ? data.layaways : [],
        movements: Array.isArray(data.movements) ? data.movements : [],
        accounts: Array.isArray(data.accounts) && data.accounts.length > 0 ? data.accounts : DEFAULT_ACCOUNTS,
        cashClosures: Array.isArray(data.cashClosures) ? data.cashClosures : [],
        expenses: Array.isArray(data.expenses) ? data.expenses : [],
        bankMovements: Array.isArray(data.bankMovements) ? data.bankMovements : [],
        currencyPurchases: Array.isArray(data.currencyPurchases) ? data.currencyPurchases : [],
        exchangeRate: typeof data.exchangeRate === 'number' ? data.exchangeRate : 68.50,
        adminPin: data.adminPin || '1234',
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.error('Error reading server store:', e);
  }

  // Fallback to legacy files if present
  let initialProducts: any[] = [];
  let initialSales: any[] = [];
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      initialProducts = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf-8'));
    }
    if (fs.existsSync(SALES_FILE)) {
      initialSales = JSON.parse(fs.readFileSync(SALES_FILE, 'utf-8'));
    }
  } catch (e) {}

  if (!initialProducts || initialProducts.length === 0) {
    initialProducts = SAMPLE_ADIZERO_PRODUCTS;
  }

  const initial: ServerStoreState = {
    products: initialProducts,
    sales: initialSales,
    layaways: [],
    movements: [],
    accounts: DEFAULT_ACCOUNTS,
    cashClosures: [],
    expenses: [],
    bankMovements: [],
    currencyPurchases: [],
    exchangeRate: 68.50,
    adminPin: '1234',
    updatedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  } catch (e) {}

  return initial;
}

function writeServerStore(state: ServerStoreState) {
  try {
    state.updatedAt = new Date().toISOString();
    fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2), 'utf-8');
    // Mirror to legacy files for backward compatibility
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(state.products, null, 2), 'utf-8');
    fs.writeFileSync(SALES_FILE, JSON.stringify(state.sales, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing server store:', e);
  }
}

function readLocalProducts(): any[] {
  return readServerStore().products;
}

function writeLocalProducts(products: any[]) {
  const store = readServerStore();
  store.products = products;
  writeServerStore(store);
}

function readLocalSales(): any[] {
  return readServerStore().sales;
}

function writeLocalSales(sales: any[]) {
  const store = readServerStore();
  store.sales = sales;
  writeServerStore(store);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON & URL-encoded middleware (25MB limit for high-res camera sneaker photos)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'MAKD SHOP API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // 2. Neon Database Status
  app.get('/api/db/status', async (req, res) => {
    try {
      const status = await checkDatabaseConnection();
      res.json(status);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ connected: false, error: msg });
    }
  });

  // 3. Neon DB Seed / Sync Demo Data
  app.post('/api/db/seed', async (req, res) => {
    const sql = getNeonSql();
    if (!sql) {
      return res.status(400).json({
        success: false,
        message: 'DATABASE_URL no configurada en Neon',
      });
    }

    try {
      await initDatabaseSchema();
      const { products, sales } = req.body;

      if (Array.isArray(products) && products.length > 0) {
        for (const p of products) {
          await sql`
            INSERT INTO shoe_products (
              id, nombre, marca, modelo, color, genero, categoria,
              talla, sku, precio, costo, stock, stock_minimo, stock_maximo,
              imagen_url, ubicacion, descripcion
            ) VALUES (
              ${p.id}, ${p.nombre}, ${p.marca}, ${p.modelo || ''}, ${p.color || ''},
              ${p.genero || 'Unisex'}, ${p.categoria || 'Casual'}, ${p.talla}, ${p.sku},
              ${p.precio}, ${p.costo}, ${p.stock}, ${p.stock_minimo || 3}, ${p.stock_maximo || 30},
              ${p.imagen_url || null}, ${p.ubicacion || 'Almacén'}, ${p.descripcion || ''}
            )
            ON CONFLICT (id) DO UPDATE SET
              stock = EXCLUDED.stock,
              precio = EXCLUDED.precio,
              costo = EXCLUDED.costo;
          `;
        }
      }

      if (Array.isArray(sales) && sales.length > 0) {
        for (const s of sales) {
          await sql`
            INSERT INTO sales_transactions (
              id, numero_factura, cliente_nombre, cliente_apellido,
              cliente_rif, cliente_telefono, subtotal_usd, descuento_usd,
              aplica_iva, porcentaje_iva, iva_monto_usd, total_usd, total_bs,
              costo_total_usd, ganancia_neta_usd, tasa_cambio, items, pagos,
              fecha, usuario
            ) VALUES (
              ${s.id}, ${s.numero_factura}, ${s.cliente_nombre || ''}, ${s.cliente_apellido || ''},
              ${s.cliente_rif || null}, ${s.cliente_telefono || null},
              ${s.subtotal_usd}, ${s.descuento_usd || 0}, ${Boolean(s.aplica_iva)},
              ${s.porcentaje_iva || 0}, ${s.iva_monto_usd || 0}, ${s.total_usd}, ${s.total_bs},
              ${s.costo_total_usd || 0}, ${s.ganancia_neta_usd || 0}, ${s.tasa_cambio},
              ${JSON.stringify(s.items)}, ${JSON.stringify(s.pagos)},
              ${s.fecha}, ${s.usuario || 'Cajero'}
            )
            ON CONFLICT (id) DO NOTHING;
          `;
        }
      }

      const prodCount = await sql`SELECT COUNT(*) as count FROM shoe_products`;
      const salesCount = await sql`SELECT COUNT(*) as count FROM sales_transactions`;

      res.json({
        success: true,
        message: 'Datos de la zapatería sincronizados exitosamente con Neon PostgreSQL',
        productsCount: Number(prodCount[0]?.count || 0),
        salesCount: Number(salesCount[0]?.count || 0),
      });
    } catch (err: unknown) {
      console.error('Error al poblar Neon:', err);
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  });

  // 4. Global Store Synchronization API (Master State across all devices)
  app.get('/api/store/state', async (req, res) => {
    const sql = getNeonSql();
    if (sql) {
      try {
        await initDatabaseSchema();
        const [products, sales, expenses, reconciliations, closures] = await Promise.all([
          sql`SELECT * FROM shoe_products ORDER BY nombre ASC`,
          sql`SELECT * FROM sales_transactions ORDER BY fecha DESC`,
          sql`SELECT * FROM expenses ORDER BY fecha DESC, created_at DESC`,
          sql`SELECT * FROM bank_reconciliations ORDER BY fecha DESC, created_at DESC`,
          sql`SELECT * FROM cash_closures ORDER BY fecha DESC, created_at DESC`,
        ]);
        const store = readServerStore();
        return res.json({
          success: true,
          source: 'neon_postgres',
          data: {
            products: normalizeProducts(products as any[]),
            sales: normalizeSales(sales as any[]),
            movements: store.movements || [],
            cashClosures: closures || [],
            expenses: normalizeExpenses(expenses as any[]),
            accounts: store.accounts || DEFAULT_ACCOUNTS,
            layaways: store.layaways || [],
            bankMovements: normalizeBankReconciliations(reconciliations as any[]),
            currencyPurchases: store.currencyPurchases || [],
            exchangeRate: store.exchangeRate || 807.39,
            adminPin: store.adminPin || '1234',
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error('Neon /api/store/state fetch error, using local fallback:', err);
      }
    }
    const store = readServerStore();
    res.json({
      success: true,
      source: 'server_store',
      data: {
        ...store,
        products: normalizeProducts(store.products || []),
        sales: normalizeSales(store.sales || []),
        expenses: normalizeExpenses(store.expenses || []),
      },
    });
  });

  app.post('/api/store/sync', (req, res) => {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Cuerpo de sincronización inválido' });
    }

    const current = readServerStore();
    if (Array.isArray(updates.products)) {
      if (updates.products.length > 0 || updates.allowEmpty) {
        current.products = updates.products;
      }
    }
    if (Array.isArray(updates.sales)) {
      if (updates.sales.length > 0 || updates.allowEmpty) {
        current.sales = updates.sales;
      }
    }
    if (Array.isArray(updates.layaways)) {
      if (updates.layaways.length > 0 || updates.allowEmpty) {
        current.layaways = updates.layaways;
      }
    }
    if (Array.isArray(updates.movements)) {
      if (updates.movements.length > 0 || updates.allowEmpty) {
        current.movements = updates.movements;
      }
    }
    if (Array.isArray(updates.accounts)) current.accounts = updates.accounts;
    if (Array.isArray(updates.cashClosures)) current.cashClosures = updates.cashClosures;
    if (Array.isArray(updates.expenses)) current.expenses = updates.expenses;
    if (typeof updates.exchangeRate === 'number') current.exchangeRate = updates.exchangeRate;
    if (typeof updates.adminPin === 'string') current.adminPin = updates.adminPin;

    writeServerStore(current);
    res.json({ success: true, data: current });
  });

  // Products API (Neon or Local JSON persistence)
  app.get('/api/products', async (req, res) => {
    const sql = getNeonSql();
    if (sql) {
      try {
        const rows = await sql`SELECT * FROM shoe_products ORDER BY nombre ASC`;
        return res.json({ source: 'neon_postgres', data: normalizeProducts(rows as any[]) });
      } catch (err) {
        console.error('Neon products fetch error, using local fallback:', err);
      }
    }
    const local = readLocalProducts();
    res.json({ source: 'local_file', data: local });
  });

  app.post('/api/products', async (req, res) => {
    const p = req.body;
    if (!p || !p.id) {
      return res.status(400).json({ saved: false, error: 'Datos de producto inválidos' });
    }

    // Always update server store
    const store = readServerStore();
    const existingIndex = store.products.findIndex((item: any) => item.id === p.id);
    if (existingIndex >= 0) {
      store.products[existingIndex] = { ...store.products[existingIndex], ...p };
    } else {
      store.products.unshift(p);
    }
    writeServerStore(store);

    const sql = getNeonSql();
    if (sql) {
      try {
        await sql`
          INSERT INTO shoe_products (
            id, nombre, marca, modelo, color, genero, categoria,
            talla, sku, precio, costo, stock, stock_minimo, stock_maximo,
            imagen_url, ubicacion, descripcion
          ) VALUES (
            ${p.id}, ${p.nombre}, ${p.marca}, ${p.modelo || ''}, ${p.color || ''},
            ${p.genero || 'Unisex'}, ${p.categoria || 'Casual'}, ${p.talla}, ${p.sku},
            ${p.precio}, ${p.costo}, ${p.stock}, ${p.stock_minimo || 3}, ${p.stock_maximo || 30},
            ${p.imagen_url || p.imagen || null}, ${p.ubicacion || 'Almacén'}, ${p.descripcion || ''}
          )
          ON CONFLICT (id) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            marca = EXCLUDED.marca,
            modelo = EXCLUDED.modelo,
            color = EXCLUDED.color,
            genero = EXCLUDED.genero,
            categoria = EXCLUDED.categoria,
            talla = EXCLUDED.talla,
            sku = EXCLUDED.sku,
            precio = EXCLUDED.precio,
            costo = EXCLUDED.costo,
            stock = EXCLUDED.stock,
            stock_minimo = EXCLUDED.stock_minimo,
            stock_maximo = EXCLUDED.stock_maximo,
            imagen_url = COALESCE(EXCLUDED.imagen_url, shoe_products.imagen_url),
            ubicacion = EXCLUDED.ubicacion,
            descripcion = EXCLUDED.descripcion;
        `;
      } catch (err: unknown) {
        console.error('Error saving product to Neon:', err);
      }
    }

    res.json({ saved: true, id: p.id, product: p });
  });

  // Delete product API
  app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const store = readServerStore();
    store.products = store.products.filter((item: any) => item.id !== id);
    writeServerStore(store);

    const sql = getNeonSql();
    if (sql) {
      try {
        await sql`DELETE FROM shoe_products WHERE id = ${id}`;
      } catch (err) {
        console.error('Error deleting product from Neon:', err);
      }
    }

    res.json({ success: true, id });
  });

  // Bulk products import API
  app.post('/api/products/bulk', async (req, res) => {
    const { products, replaceExisting } = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ success: false, error: 'Se esperaba un arreglo de productos' });
    }

    let finalProducts: any[] = [];
    if (replaceExisting) {
      finalProducts = products;
    } else {
      const current = readLocalProducts();
      const existingMap = new Map(current.map((item: any) => [item.id, item]));
      products.forEach((p: any) => {
        existingMap.set(p.id, p);
      });
      finalProducts = Array.from(existingMap.values());
    }
    writeLocalProducts(finalProducts);

    const sql = getNeonSql();
    if (sql) {
      try {
        await initDatabaseSchema();
        if (replaceExisting) {
          await sql`DELETE FROM shoe_products`;
        }
        for (const p of products) {
          await sql`
            INSERT INTO shoe_products (
              id, nombre, marca, modelo, color, genero, categoria,
              talla, sku, precio, costo, stock, stock_minimo, stock_maximo,
              imagen_url, ubicacion, descripcion
            ) VALUES (
              ${p.id}, ${p.nombre}, ${p.marca}, ${p.modelo || ''}, ${p.color || ''},
              ${p.genero || 'Unisex'}, ${p.categoria || 'Casual'}, ${p.talla}, ${p.sku},
              ${p.precio}, ${p.costo}, ${p.stock}, ${p.stock_minimo || 3}, ${p.stock_maximo || 30},
              ${p.imagen_url || p.imagen || null}, ${p.ubicacion || 'Almacén'}, ${p.descripcion || ''}
            )
            ON CONFLICT (id) DO UPDATE SET
              nombre = EXCLUDED.nombre,
              marca = EXCLUDED.marca,
              modelo = EXCLUDED.modelo,
              color = EXCLUDED.color,
              genero = EXCLUDED.genero,
              categoria = EXCLUDED.categoria,
              talla = EXCLUDED.talla,
              sku = EXCLUDED.sku,
              precio = EXCLUDED.precio,
              costo = EXCLUDED.costo,
              stock = EXCLUDED.stock,
              stock_minimo = EXCLUDED.stock_minimo,
              stock_maximo = EXCLUDED.stock_maximo,
              imagen_url = COALESCE(EXCLUDED.imagen_url, shoe_products.imagen_url),
              ubicacion = EXCLUDED.ubicacion,
              descripcion = EXCLUDED.descripcion;
          `;
        }
      } catch (err) {
        console.error('Error in bulk Neon insert:', err);
      }
    }

    res.json({ success: true, count: products.length, total: finalProducts.length });
  });

  // 5. Sales API (Neon or Local JSON persistence)
  app.get('/api/sales', async (req, res) => {
    const sql = getNeonSql();
    if (sql) {
      try {
        const rows = await sql`SELECT * FROM sales_transactions ORDER BY fecha DESC`;
        return res.json({ source: 'neon_postgres', data: normalizeSales(rows as any[]) });
      } catch (err) {
        console.error('Neon sales fetch error, using local fallback:', err);
      }
    }
    const local = readLocalSales();
    res.json({ source: 'local_file', data: local });
  });

  app.post('/api/sales', async (req, res) => {
    const s = req.body;
    if (!s || !s.id) {
      return res.status(400).json({ saved: false, error: 'Datos de venta inválidos' });
    }

    const store = readServerStore();
    store.sales.unshift(s);

    // Also deduct product stock in server store
    if (Array.isArray(s.items)) {
      s.items.forEach((item: any) => {
        const prodIndex = store.products.findIndex((p: any) => p.id === item.producto_id);
        if (prodIndex >= 0) {
          const prev = Number(store.products[prodIndex].stock || 0);
          const next = Math.max(0, prev - Number(item.cantidad || 0));
          store.products[prodIndex].stock = next;
        }
      });
    }

    // Also update accounts in server store
    if (Array.isArray(s.pagos)) {
      s.pagos.forEach((pago: any) => {
        const accIndex = store.accounts.findIndex((a: any) => a.nombre === pago.cuenta);
        if (accIndex >= 0) {
          store.accounts[accIndex].saldo = (Number(store.accounts[accIndex].saldo) || 0) + Number(pago.monto || 0);
        }
      });
    }

    writeServerStore(store);

    const sql = getNeonSql();
    if (sql) {
      try {
        await sql`
          INSERT INTO sales_transactions (
            id, numero_factura, cliente_nombre, cliente_apellido,
            cliente_rif, cliente_telefono, subtotal_usd, descuento_usd,
            aplica_iva, porcentaje_iva, iva_monto_usd, total_usd, total_bs,
            costo_total_usd, ganancia_neta_usd, tasa_cambio, items, pagos,
            fecha, usuario
          ) VALUES (
            ${s.id}, ${s.numero_factura}, ${s.cliente_nombre || ''}, ${s.cliente_apellido || ''},
            ${s.cliente_rif || null}, ${s.cliente_telefono || null},
            ${s.subtotal_usd}, ${s.descuento_usd || 0}, ${Boolean(s.aplica_iva)},
            ${s.porcentaje_iva || 0}, ${s.iva_monto_usd || 0}, ${s.total_usd}, ${s.total_bs},
            ${s.costo_total_usd || 0}, ${s.ganancia_neta_usd || 0}, ${s.tasa_cambio},
            ${JSON.stringify(s.items)}, ${JSON.stringify(s.pagos)},
            ${s.fecha}, ${s.usuario || 'Cajera'}
          )
          ON CONFLICT (id) DO NOTHING;
        `;

        // Also adjust product stock in Neon if items present
        if (Array.isArray(s.items)) {
          for (const item of s.items) {
            await sql`
              UPDATE shoe_products
              SET stock = GREATEST(0, stock - ${item.cantidad})
              WHERE id = ${item.producto_id};
            `;
          }
        }
      } catch (err) {
        console.error('Error saving sale to Neon:', err);
      }
    }

    res.json({ saved: true, id: s.id });
  });

  // Update Sale (e.g. modify sale date)
  app.patch('/api/sales/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const store = readServerStore();
    const saleIndex = store.sales.findIndex((item: any) => item.id === id);
    if (saleIndex >= 0) {
      store.sales[saleIndex] = { ...store.sales[saleIndex], ...updates };
      writeServerStore(store);

      const sql = getNeonSql();
      if (sql && updates.fecha) {
        try {
          await sql`UPDATE sales_transactions SET fecha = ${updates.fecha} WHERE id = ${id}`;
        } catch (err) {
          console.error('Error updating sale date in Neon:', err);
        }
      }
      return res.json({ success: true, sale: store.sales[saleIndex] });
    }
    res.status(404).json({ success: false, error: 'Venta no encontrada' });
  });

  // Layaways API (Sistema de Apartados)
  app.get('/api/layaways', (req, res) => {
    const store = readServerStore();
    res.json({ success: true, data: store.layaways || [] });
  });

  app.post('/api/layaways', (req, res) => {
    const layaway = req.body;
    if (!layaway || !layaway.id) {
      return res.status(400).json({ success: false, error: 'Datos de apartado inválidos' });
    }
    const store = readServerStore();
    if (!store.layaways) store.layaways = [];
    const existingIndex = store.layaways.findIndex((item: any) => item.id === layaway.id);
    if (existingIndex >= 0) {
      store.layaways[existingIndex] = { ...store.layaways[existingIndex], ...layaway };
    } else {
      store.layaways.unshift(layaway);
    }
    writeServerStore(store);
    res.json({ success: true, layaway });
  });

  app.put('/api/layaways/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const store = readServerStore();
    if (!store.layaways) store.layaways = [];
    const index = store.layaways.findIndex((item: any) => item.id === id);
    if (index >= 0) {
      store.layaways[index] = { ...store.layaways[index], ...updates };
      writeServerStore(store);
      return res.json({ success: true, layaway: store.layaways[index] });
    }
    res.status(404).json({ success: false, error: 'Apartado no encontrado' });
  });

  app.delete('/api/layaways/:id', (req, res) => {
    const { id } = req.params;
    const store = readServerStore();
    if (!store.layaways) store.layaways = [];
    store.layaways = store.layaways.filter((item: any) => item.id !== id);
    writeServerStore(store);
    res.json({ success: true, id });
  });

  // Movements API
  app.get('/api/movements', (req, res) => {
    const store = readServerStore();
    res.json({ success: true, data: store.movements });
  });

  app.post('/api/movements', (req, res) => {
    const m = req.body;
    if (m && m.id) {
      const store = readServerStore();
      store.movements.unshift(m);
      writeServerStore(store);
    }
    res.json({ success: true });
  });

  // Accounts API
  app.get('/api/accounts', (req, res) => {
    const store = readServerStore();
    res.json({ success: true, data: store.accounts });
  });

  app.post('/api/accounts', (req, res) => {
    const { accounts } = req.body;
    if (Array.isArray(accounts)) {
      const store = readServerStore();
      store.accounts = accounts;
      writeServerStore(store);
    }
    res.json({ success: true });
  });

  // Cash Closures API
  app.get('/api/closures', (req, res) => {
    const store = readServerStore();
    res.json({ success: true, data: store.cashClosures });
  });

  app.post('/api/closures', (req, res) => {
    const closure = req.body;
    if (closure && closure.id) {
      const store = readServerStore();
      store.cashClosures.unshift(closure);
      writeServerStore(store);
    }
    res.json({ success: true });
  });

  // 6. BDV Payment Verification API
  app.get('/api/bdv/status', (req, res) => {
    const config = getBdvApiConfig();
    res.json(config);
  });

  app.post('/api/bdv/verificar', async (req, res) => {
    try {
      const { referencia, telefono_origen, cedula_cliente, banco_origen, monto_bs, monto_usd } = req.body;
      const result = await verifyBdvPayment({
        referencia,
        telefono_origen,
        cedula_cliente,
        banco_origen,
        monto_bs,
        monto_usd,
      });
      res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(400).json({
        aprobado: false,
        mensaje: message,
      });
    }
  });

  app.get('/api/bdv/historial', (req, res) => {
    res.json(getRecentVerifications());
  });

  // 7. Expenses API (Gastos Operativos & Finanzas de Fin de Mes)
  app.get('/api/expenses', async (req, res) => {
    const sql = getNeonSql();
    if (!sql) {
      return res.json({ source: 'local_fallback', data: [] });
    }
    try {
      await initDatabaseSchema();
      const rows = await sql`SELECT * FROM expenses ORDER BY fecha DESC, created_at DESC`;
      res.json({ source: 'neon_postgres', data: normalizeExpenses(rows as any[]) });
    } catch (err: unknown) {
      console.error('Error al obtener gastos de Neon:', err);
      res.json({ source: 'local_fallback', error: String(err), data: [] });
    }
  });

  app.post('/api/expenses', async (req, res) => {
    const sql = getNeonSql();
    const exp = req.body;
    if (!sql) {
      return res.json({ saved: false, message: 'DATABASE_URL no configurada en Neon' });
    }
    try {
      await initDatabaseSchema();
      await sql`
        INSERT INTO expenses (
          id, fecha, categoria, descripcion, beneficiario,
          cuenta_origen, moneda, monto, tasa_cambio, monto_usd, monto_bs,
          comprobante_ref, registrado_por, notas
        ) VALUES (
          ${exp.id}, ${exp.fecha}, ${exp.categoria}, ${exp.descripcion}, ${exp.beneficiario || ''},
          ${exp.cuenta_origen}, ${exp.moneda}, ${exp.monto}, ${exp.tasa_cambio}, ${exp.monto_usd}, ${exp.monto_bs},
          ${exp.comprobante_ref || null}, ${exp.registrado_por || 'Admin'}, ${exp.notas || ''}
        )
        ON CONFLICT (id) DO UPDATE SET
          fecha = EXCLUDED.fecha,
          categoria = EXCLUDED.categoria,
          descripcion = EXCLUDED.descripcion,
          monto = EXCLUDED.monto,
          monto_usd = EXCLUDED.monto_usd,
          monto_bs = EXCLUDED.monto_bs;
      `;
      res.json({ saved: true, id: exp.id });
    } catch (err: unknown) {
      console.error('Error guardando gasto en Neon:', err);
      res.status(500).json({ saved: false, error: String(err) });
    }
  });

  app.delete('/api/expenses/:id', async (req, res) => {
    const sql = getNeonSql();
    const { id } = req.params;
    if (!sql) {
      return res.json({ deleted: false, message: 'DATABASE_URL no configurada' });
    }
    try {
      await sql`DELETE FROM expenses WHERE id = ${id}`;
      res.json({ deleted: true });
    } catch (err: unknown) {
      res.status(500).json({ deleted: false, error: String(err) });
    }
  });

  // 8. Neon Database Explorer API (Para ver tablas e información previa de conciliación en Neon)
  app.get('/api/db/tables', async (req, res) => {
    try {
      const tables = await getNeonTables();
      res.json({ success: true, tables });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.get('/api/db/table-data', async (req, res) => {
    const tableName = req.query.table as string;
    const limit = Number(req.query.limit || 50);
    if (!tableName) {
      return res.status(400).json({ success: false, error: 'Parámetro table requerido' });
    }
    try {
      const data = await getNeonTableData(tableName, limit);
      res.json({ success: true, ...data });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // 9. Bank Reconciliations API (Conciliación Bancaria con Neon)
  app.get('/api/bank-reconciliations', async (req, res) => {
    const sql = getNeonSql();
    if (!sql) {
      return res.json({ source: 'local_fallback', data: [] });
    }
    try {
      await initDatabaseSchema();
      const rows = await sql`SELECT * FROM bank_reconciliations ORDER BY fecha DESC, created_at DESC`;
      res.json({ source: 'neon_postgres', data: normalizeBankReconciliations(rows as any[]) });
    } catch (err: unknown) {
      res.json({ source: 'local_fallback', error: String(err), data: [] });
    }
  });

  app.post('/api/bank-reconciliations', async (req, res) => {
    const sql = getNeonSql();
    const item = req.body;
    if (!sql) {
      return res.json({ saved: false, message: 'DATABASE_URL no configurada' });
    }
    try {
      await initDatabaseSchema();
      await sql`
        INSERT INTO bank_reconciliations (
          id, fecha, banco, tipo, referencia, descripcion,
          monto_bs, monto_usd, estado_conciliacion, vinculado_tipo, vinculado_id, notas
        ) VALUES (
          ${item.id}, ${item.fecha}, ${item.banco}, ${item.tipo}, ${item.referencia}, ${item.descripcion},
          ${item.monto_bs}, ${item.monto_usd || null}, ${item.estado_conciliacion || 'pendiente'},
          ${item.vinculado_tipo || null}, ${item.vinculado_id || null}, ${item.notas || ''}
        )
        ON CONFLICT (id) DO UPDATE SET
          estado_conciliacion = EXCLUDED.estado_conciliacion,
          vinculado_tipo = EXCLUDED.vinculado_tipo,
          vinculado_id = EXCLUDED.vinculado_id,
          notas = EXCLUDED.notas;
      `;
      res.json({ saved: true, id: item.id });
    } catch (err: unknown) {
      res.status(500).json({ saved: false, error: String(err) });
    }
  });

  app.put('/api/bank-reconciliations/:id', async (req, res) => {
    const sql = getNeonSql();
    const { id } = req.params;
    const { estado_conciliacion, notas, vinculado_tipo, vinculado_id } = req.body;
    if (!sql) {
      return res.json({ updated: false, message: 'DATABASE_URL no configurada' });
    }
    try {
      await sql`
        UPDATE bank_reconciliations
        SET 
          estado_conciliacion = COALESCE(${estado_conciliacion}, estado_conciliacion),
          notas = COALESCE(${notas}, notas),
          vinculado_tipo = COALESCE(${vinculado_tipo}, vinculado_tipo),
          vinculado_id = COALESCE(${vinculado_id}, vinculado_id)
        WHERE id = ${id};
      `;
      res.json({ updated: true });
    } catch (err: unknown) {
      res.status(500).json({ updated: false, error: String(err) });
    }
  });

  // 10. Gemini AI Shoe Image Recognition & Merchandising API
  const handleShoeAnalysis = async (req: express.Request, res: express.Response) => {
    // Enable CORS & Preflight headers
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    try {
      const { imageBase64, userHint } = req.body || {};
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Se requiere una imagen en formato Base64 para analizar el calzado.',
        });
      }

      const analysis = await analyzeShoeImage(imageBase64, userHint);

      // Return unified response compatible with both frontend interfaces
      res.json({
        ...analysis,
        // Also provide keys from user's custom prompt format
        marcaModelo: `${analysis.marca} ${analysis.modelo}`.trim(),
        estiloCategoria: analysis.tipo,
        colores: analysis.color,
        materiales: analysis.material,
        tituloComercial: analysis.nombre,
        descripcionTienda: analysis.descripcion_comercial,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[API analyze-shoe error]:', msg);
      res.status(500).json({
        success: false,
        error: msg,
      });
    }
  };

  // Support multiple endpoint paths and any HTTP verb to ensure maximum compatibility
  app.all('/api/ai/analyze-shoe', handleShoeAnalysis);
  app.all('/api/analyze-shoe', handleShoeAnalysis);
  app.all('/api/shoe-ai', handleShoeAnalysis);
  app.all('/api/ai/shoe', handleShoeAnalysis);

  // Background removal API endpoint
  const handleRemoveBackground = async (req: express.Request, res: express.Response) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    try {
      const { imageBase64 } = req.body || {};
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ success: false, error: 'Se requiere una imagen en Base64' });
      }

      const whiteBgImage = await removeBackgroundWithGemini(imageBase64);
      if (whiteBgImage) {
        return res.json({ success: true, imageBase64: whiteBgImage });
      }
      return res.status(422).json({ success: false, error: 'No se pudo generar fondo de estudio con IA' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: msg });
    }
  };

  app.all('/api/ai/remove-background', handleRemoveBackground);
  app.all('/api/remove-background', handleRemoveBackground);

  // 10. Catálogo Público & Sincronización GitHub (makdshoes-gif/makd)
  app.get('/api/catalog/products', async (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const sql = getNeonSql();
    if (sql) {
      try {
        const rows = await sql`SELECT * FROM shoe_products WHERE stock > 0 ORDER BY nombre ASC`;
        const products = normalizeProducts(rows as any[]);
        return res.json({
          success: true,
          count: products.length,
          actualizado: new Date().toISOString(),
          products,
        });
      } catch (err) {
        console.error('Error obteniendo productos de Neon para catálogo:', err);
      }
    }
    const localProducts = readLocalProducts().filter((p) => Number(p.stock) > 0);
    res.json({ success: true, count: localProducts.length, products: localProducts });
  });

  app.post('/api/catalog/sync-github', async (req, res) => {
    try {
      const {
        token,
        owner = 'makdshoes-gif',
        repo = 'makd',
        branch = 'main',
        htmlContent,
        jsonContent,
        commitMessage,
      } = req.body || {};

      if (!token || typeof token !== 'string' || !token.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Se requiere un Token Personal de Acceso (PAT) de GitHub con permisos de escritura.',
        });
      }

      if (!htmlContent || typeof htmlContent !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'No se recibió el contenido HTML del catálogo a sincronizar.',
        });
      }

      const cleanToken = token.trim();
      const targetOwner = owner.trim() || 'makdshoes-gif';
      const targetRepo = repo.trim() || 'makd';
      const targetBranch = branch.trim() || 'main';

      const githubHeaders: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${cleanToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'MAKD-SHOP-App',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      };

      // Función auxiliar para obtener el SHA canónico de un archivo en GitHub
      const getAuthoritativeSha = async (filePath: string): Promise<string | undefined> => {
        const timestamp = Date.now();
        // 1. Contents endpoint con cache-busting
        try {
          const shaRes = await fetch(
            `https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${filePath}?ref=${encodeURIComponent(targetBranch)}&_cb=${timestamp}`,
            { headers: githubHeaders }
          );
          if (shaRes.ok) {
            const shaData: any = await shaRes.json();
            if (shaData && typeof shaData.sha === 'string') return shaData.sha;
          } else if (shaRes.status === 404) {
            return undefined;
          }
        } catch (e) {
          console.warn(`[ServerGitHub] Error en consulta directa de SHA para ${filePath}:`, e);
        }

        // 2. Git Trees API de la rama
        try {
          const treeRes = await fetch(
            `https://api.github.com/repos/${targetOwner}/${targetRepo}/git/trees/${encodeURIComponent(targetBranch)}?recursive=1&_cb=${timestamp}`,
            { headers: githubHeaders }
          );
          if (treeRes.ok) {
            const treeData: any = await treeRes.json();
            if (Array.isArray(treeData?.tree)) {
              const item = treeData.tree.find((t: any) => t.path === filePath);
              if (item && item.sha) return item.sha;
              return undefined;
            }
          }
        } catch (e) {
          console.warn(`[ServerGitHub] Error en Git Tree para ${filePath}:`, e);
        }

        return undefined;
      };

      // Función auxiliar para enviar commit con reintento ante conflictos 409
      const putFileWithRetry = async (
        filePath: string,
        base64Content: string,
        msg: string,
        maxRetries = 3
      ): Promise<{ ok: boolean; data?: any; status: number; error?: string }> => {
        let lastErr = '';
        let lastStat = 0;

        for (let i = 1; i <= maxRetries; i++) {
          const currentSha = await getAuthoritativeSha(filePath);
          const putBody: Record<string, any> = {
            message: msg,
            content: base64Content,
            branch: targetBranch,
          };
          if (currentSha) {
            putBody.sha = currentSha;
          }

          try {
            const putRes = await fetch(
              `https://api.github.com/repos/${targetOwner}/${targetRepo}/contents/${filePath}`,
              {
                method: 'PUT',
                headers: githubHeaders,
                body: JSON.stringify(putBody),
              }
            );

            if (putRes.ok) {
              const data = await putRes.json();
              return { ok: true, data, status: putRes.status };
            }

            const errBody: any = await putRes.json().catch(() => ({}));
            lastStat = putRes.status;
            lastErr = errBody.message || putRes.statusText || 'Error desconocido';

            if (putRes.status === 409 && i < maxRetries) {
              console.warn(
                `[ServerGitHub] Conflicto 409 en ${filePath}. Reintentando con SHA fresco (intento ${i}/${maxRetries})...`
              );
              await new Promise((r) => setTimeout(r, 1000 * i));
              continue;
            }

            return { ok: false, status: putRes.status, error: lastErr };
          } catch (netErr: any) {
            lastStat = 0;
            lastErr = netErr?.message || String(netErr);
            if (i < maxRetries) {
              await new Promise((r) => setTimeout(r, 1000 * i));
              continue;
            }
            return { ok: false, status: 0, error: lastErr };
          }
        }

        return { ok: false, status: lastStat, error: lastErr };
      };

      // 1. Commit de catalogo.html
      const nowStr = new Date().toLocaleString('es-VE');
      const msg = commitMessage || `Actualizar catálogo oficial desde MAKD SHOP - ${nowStr}`;
      const base64Html = Buffer.from(htmlContent, 'utf-8').toString('base64');

      const htmlCommitResult = await putFileWithRetry('catalogo.html', base64Html, msg, 3);

      if (!htmlCommitResult.ok) {
        return res.status(htmlCommitResult.status || 500).json({
          success: false,
          error: `Error de GitHub (${htmlCommitResult.status}): ${htmlCommitResult.error}`,
        });
      }

      const putData = htmlCommitResult.data;

      // 2. Commit de products.json si fue enviado
      if (jsonContent && typeof jsonContent === 'string') {
        try {
          const base64Json = Buffer.from(jsonContent, 'utf-8').toString('base64');
          await putFileWithRetry(
            'products.json',
            base64Json,
            `Actualizar datos JSON del catálogo MAKD SHOP - ${nowStr}`,
            3
          );
        } catch (jsonErr) {
          console.warn('Error no crítico actualizando products.json:', jsonErr);
        }
      }

      const commitUrl =
        putData?.commit?.html_url ||
        `https://github.com/${targetOwner}/${targetRepo}/commits/${targetBranch}`;
      const catalogUrl = `https://${targetOwner}.github.io/${targetRepo}/catalogo.html`;

      return res.json({
        success: true,
        message: 'Catálogo sincronizado exitosamente en GitHub.',
        commitUrl,
        catalogUrl,
        sha: putData?.content?.sha,
      });
    } catch (err: any) {
      console.error('Error sincronizando con GitHub:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Error interno del servidor al sincronizar con GitHub.',
      });
    }
  });

  // 11. Vite Middleware for Development / Static serving for Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 MAKD SHOP Server iniciado en http://0.0.0.0:${PORT}`);
  });
}

startServer();
