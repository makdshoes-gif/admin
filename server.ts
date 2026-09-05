import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { checkDatabaseConnection, getNeonSql, initDatabaseSchema, getNeonTables, getNeonTableData } from './server/db.js';
import { verifyBdvPayment, getBdvApiConfig, getRecentVerifications } from './server/bdv.js';

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

function readServerStore(): ServerStoreState {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
      return {
        products: Array.isArray(data.products) ? data.products : [],
        sales: Array.isArray(data.sales) ? data.sales : [],
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

  const initial: ServerStoreState = {
    products: initialProducts,
    sales: initialSales,
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

  // JSON middleware
  app.use(express.json());

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
  app.get('/api/store/state', (req, res) => {
    const store = readServerStore();
    res.json({
      success: true,
      source: 'server_store',
      data: store,
    });
  });

  app.post('/api/store/sync', (req, res) => {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Cuerpo de sincronización inválido' });
    }

    const current = readServerStore();
    if (Array.isArray(updates.products)) current.products = updates.products;
    if (Array.isArray(updates.sales)) current.sales = updates.sales;
    if (Array.isArray(updates.movements)) current.movements = updates.movements;
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
        return res.json({ source: 'neon_postgres', data: rows });
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
            stock = EXCLUDED.stock,
            precio = EXCLUDED.precio,
            costo = EXCLUDED.costo,
            nombre = EXCLUDED.nombre;
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
              stock = EXCLUDED.stock,
              precio = EXCLUDED.precio,
              costo = EXCLUDED.costo,
              nombre = EXCLUDED.nombre;
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
        return res.json({ source: 'neon_postgres', data: rows });
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
      res.json({ source: 'neon_postgres', data: rows });
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
      res.json({ source: 'neon_postgres', data: rows });
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

  // 10. Vite Middleware for Development / Static serving for Production
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
