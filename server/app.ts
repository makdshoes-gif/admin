import express, { Request, Response, NextFunction } from 'express';
import {
  checkDatabaseConnection,
  getNeonSql,
  initDatabaseSchema,
  getNeonTables,
  getNeonTableData,
  getStoreSetting,
  setStoreSetting,
  getStockMovements,
  addStockMovement,
  replaceStockMovements,
  getDailyClosures,
  addDailyClosure,
  replaceDailyClosures,
} from './db.js';
import { verifyBdvPayment, getBdvApiConfig, getRecentVerifications } from './bdv.js';

// Every route in this file talks ONLY to Neon Postgres. There is no local-file
// or in-memory fallback for real data, on purpose: on serverless platforms
// (Vercel) the filesystem is ephemeral/isolated per instance, so a "fallback"
// that looked like it worked was actually the root cause of data disappearing
// between devices. If DATABASE_URL isn't configured, endpoints fail loudly
// (503) instead of pretending to save something that will vanish.

const DB_NOT_CONFIGURED = {
  error: 'DATABASE_URL no está configurada en las variables de entorno de este entorno (Vercel/local). Agrega tu cadena de conexión de Neon en Project Settings → Environment Variables y vuelve a desplegar.',
};

function requireDb(res: Response): boolean {
  if (!getNeonSql()) {
    res.status(503).json(DB_NOT_CONFIGURED);
    return false;
  }
  return true;
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Make sure schema exists before handling any /api request (cheap no-op after first run per instance)
  app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (getNeonSql()) await initDatabaseSchema();
    } catch (e) {
      console.error('Error inicializando schema Neon:', e);
    }
    next();
  });

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'MAKD SHOP API',
      timestamp: new Date().toISOString(),
      dbConfigured: Boolean(getNeonSql()),
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

  // 3. Global Store Synchronization API (master state across all devices)
  app.get('/api/store/state', async (req, res) => {
    if (!requireDb(res)) return;
    const sql = getNeonSql()!;
    try {
      const [products, sales, movements, closures, expenses, accounts, adminPin, exchangeRate] = await Promise.all([
        sql`SELECT * FROM shoe_products ORDER BY nombre ASC`,
        sql`SELECT * FROM sales_transactions ORDER BY fecha DESC`,
        getStockMovements(),
        getDailyClosures(),
        sql`SELECT * FROM expenses ORDER BY fecha DESC, created_at DESC`,
        getStoreSetting('accounts'),
        getStoreSetting('admin_pin'),
        getStoreSetting('exchange_rate'),
      ]);

      res.json({
        success: true,
        source: 'neon_postgres',
        data: {
          products,
          sales,
          movements,
          cashClosures: closures,
          expenses,
          accounts,
          adminPin,
          exchangeRate,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.post('/api/store/sync', async (req, res) => {
    if (!requireDb(res)) return;
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Cuerpo de sincronización inválido' });
    }

    try {
      const sql = getNeonSql()!;

      if (Array.isArray(updates.products)) {
        await sql`DELETE FROM shoe_products`;
        for (const p of updates.products) {
          await upsertProduct(p);
        }
      }
      if (Array.isArray(updates.sales)) {
        await sql`DELETE FROM sales_transactions`;
        for (const s of updates.sales) {
          await upsertSale(s);
        }
      }
      if (Array.isArray(updates.movements)) await replaceStockMovements(updates.movements);
      if (Array.isArray(updates.accounts)) await setStoreSetting('accounts', updates.accounts);
      if (Array.isArray(updates.cashClosures)) await replaceDailyClosures(updates.cashClosures);
      if (Array.isArray(updates.expenses)) {
        await sql`DELETE FROM expenses`;
        for (const e of updates.expenses) {
          await upsertExpense(e);
        }
      }
      if (typeof updates.exchangeRate === 'number') await setStoreSetting('exchange_rate', updates.exchangeRate);
      if (typeof updates.adminPin === 'string') await setStoreSetting('admin_pin', updates.adminPin);

      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // 4. Products API (Neon only)
  async function upsertProduct(p: any) {
    const sql = getNeonSql()!;
    await sql`
      INSERT INTO shoe_products (
        id, nombre, marca, modelo, color, genero, categoria,
        talla, sku, precio, costo, stock, stock_minimo, stock_maximo,
        imagen_url, ubicacion, descripcion
      ) VALUES (
        ${p.id}, ${p.nombre}, ${p.marca}, ${p.modelo || ''}, ${p.color || ''},
        ${p.genero || p.tipo || 'Unisex'}, ${p.categoria || 'Casual'}, ${p.talla}, ${p.sku},
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
        imagen_url = EXCLUDED.imagen_url,
        ubicacion = EXCLUDED.ubicacion,
        descripcion = EXCLUDED.descripcion;
    `;
  }

  app.get('/api/products', async (req, res) => {
    if (!requireDb(res)) return;
    try {
      const sql = getNeonSql()!;
      const rows = await sql`SELECT * FROM shoe_products ORDER BY nombre ASC`;
      res.json({ source: 'neon_postgres', data: rows });
    } catch (err: unknown) {
      res.status(500).json({ source: 'error', error: String(err), data: [] });
    }
  });

  app.post('/api/products', async (req, res) => {
    if (!requireDb(res)) return;
    const p = req.body;
    if (!p || !p.id) {
      return res.status(400).json({ saved: false, error: 'Datos de producto inválidos' });
    }
    try {
      await upsertProduct(p);
      res.json({ saved: true, id: p.id, product: p });
    } catch (err: unknown) {
      res.status(500).json({ saved: false, error: String(err) });
    }
  });

  app.delete('/api/products/:id', async (req, res) => {
    if (!requireDb(res)) return;
    const { id } = req.params;
    try {
      const sql = getNeonSql()!;
      await sql`DELETE FROM shoe_products WHERE id = ${id}`;
      res.json({ success: true, id });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.post('/api/products/bulk', async (req, res) => {
    if (!requireDb(res)) return;
    const { products, replaceExisting } = req.body;
    if (!Array.isArray(products)) {
      return res.status(400).json({ success: false, error: 'Se esperaba un arreglo de productos' });
    }
    try {
      const sql = getNeonSql()!;
      if (replaceExisting) await sql`DELETE FROM shoe_products`;
      for (const p of products) {
        await upsertProduct(p);
      }
      const countRes = await sql`SELECT COUNT(*) as count FROM shoe_products`;
      res.json({ success: true, count: products.length, total: Number(countRes[0]?.count || 0) });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // 5. Sales API (Neon only)
  async function upsertSale(s: any) {
    const sql = getNeonSql()!;
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

  app.get('/api/sales', async (req, res) => {
    if (!requireDb(res)) return;
    try {
      const sql = getNeonSql()!;
      const rows = await sql`SELECT * FROM sales_transactions ORDER BY fecha DESC`;
      res.json({ source: 'neon_postgres', data: rows });
    } catch (err: unknown) {
      res.status(500).json({ source: 'error', error: String(err), data: [] });
    }
  });

  app.post('/api/sales', async (req, res) => {
    if (!requireDb(res)) return;
    const s = req.body;
    if (!s || !s.id) {
      return res.status(400).json({ saved: false, error: 'Datos de venta inválidos' });
    }
    try {
      const sql = getNeonSql()!;
      await upsertSale(s);

      // Deduct stock for each sold item
      if (Array.isArray(s.items)) {
        for (const item of s.items) {
          await sql`
            UPDATE shoe_products
            SET stock = GREATEST(0, stock - ${item.cantidad})
            WHERE id = ${item.producto_id};
          `;
        }
      }

      // Update account balances based on payments
      if (Array.isArray(s.pagos)) {
        const accounts = (await getStoreSetting<any[]>('accounts')) || [];
        s.pagos.forEach((pago: any) => {
          const acc = accounts.find((a: any) => a.nombre === pago.cuenta);
          if (acc) acc.saldo = (Number(acc.saldo) || 0) + Number(pago.monto || 0);
        });
        await setStoreSetting('accounts', accounts);
      }

      res.json({ saved: true, id: s.id });
    } catch (err: unknown) {
      res.status(500).json({ saved: false, error: String(err) });
    }
  });

  // 6. Stock Movements API (Neon only, JSONB)
  app.get('/api/movements', async (req, res) => {
    if (!requireDb(res)) return;
    try {
      res.json({ success: true, data: await getStockMovements() });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.post('/api/movements', async (req, res) => {
    if (!requireDb(res)) return;
    const m = req.body;
    if (!m || !m.id) return res.status(400).json({ success: false, error: 'Movimiento inválido' });
    try {
      await addStockMovement(m);
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // 7. Accounts API (Neon setting)
  app.get('/api/accounts', async (req, res) => {
    if (!requireDb(res)) return;
    try {
      res.json({ success: true, data: await getStoreSetting('accounts') });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.post('/api/accounts', async (req, res) => {
    if (!requireDb(res)) return;
    const { accounts } = req.body;
    if (!Array.isArray(accounts)) return res.status(400).json({ success: false, error: 'accounts debe ser un arreglo' });
    try {
      await setStoreSetting('accounts', accounts);
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // 8. Daily Cash Closures API (Neon only, JSONB)
  app.get('/api/closures', async (req, res) => {
    if (!requireDb(res)) return;
    try {
      res.json({ success: true, data: await getDailyClosures() });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.post('/api/closures', async (req, res) => {
    if (!requireDb(res)) return;
    const closure = req.body;
    if (!closure || !closure.id) return res.status(400).json({ success: false, error: 'Cierre inválido' });
    try {
      await addDailyClosure(closure);
      res.json({ success: true });
    } catch (err: unknown) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // 9. BDV Payment Verification API
  app.get('/api/bdv/status', (req, res) => {
    res.json(getBdvApiConfig());
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
      res.status(400).json({ aprobado: false, mensaje: message });
    }
  });

  app.get('/api/bdv/historial', async (req, res) => {
    if (getNeonSql()) {
      try {
        const sql = getNeonSql()!;
        const rows = await sql`SELECT datos_bdv FROM bdv_verifications ORDER BY created_at DESC LIMIT 50`;
        return res.json(rows.map((r: any) => r.datos_bdv));
      } catch (err) {
        console.error('Error leyendo historial BDV de Neon:', err);
      }
    }
    res.json(getRecentVerifications());
  });

  // 10. Expenses API
  async function upsertExpense(exp: any) {
    const sql = getNeonSql()!;
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
  }

  app.get('/api/expenses', async (req, res) => {
    if (!requireDb(res)) return;
    try {
      const sql = getNeonSql()!;
      const rows = await sql`SELECT * FROM expenses ORDER BY fecha DESC, created_at DESC`;
      res.json({ source: 'neon_postgres', data: rows });
    } catch (err: unknown) {
      res.status(500).json({ source: 'error', error: String(err), data: [] });
    }
  });

  app.post('/api/expenses', async (req, res) => {
    if (!requireDb(res)) return;
    try {
      await upsertExpense(req.body);
      res.json({ saved: true, id: req.body.id });
    } catch (err: unknown) {
      res.status(500).json({ saved: false, error: String(err) });
    }
  });

  app.delete('/api/expenses/:id', async (req, res) => {
    if (!requireDb(res)) return;
    try {
      const sql = getNeonSql()!;
      await sql`DELETE FROM expenses WHERE id = ${req.params.id}`;
      res.json({ deleted: true });
    } catch (err: unknown) {
      res.status(500).json({ deleted: false, error: String(err) });
    }
  });

  // 11. Bank Reconciliations API
  app.get('/api/bank-reconciliations', async (req, res) => {
    if (!requireDb(res)) return;
    try {
      const sql = getNeonSql()!;
      const rows = await sql`SELECT * FROM bank_reconciliations ORDER BY fecha DESC, created_at DESC`;
      res.json({ source: 'neon_postgres', data: rows });
    } catch (err: unknown) {
      res.status(500).json({ source: 'error', error: String(err), data: [] });
    }
  });

  app.post('/api/bank-reconciliations', async (req, res) => {
    if (!requireDb(res)) return;
    const item = req.body;
    try {
      const sql = getNeonSql()!;
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
    if (!requireDb(res)) return;
    const { id } = req.params;
    const { estado_conciliacion, notas, vinculado_tipo, vinculado_id } = req.body;
    try {
      const sql = getNeonSql()!;
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

  return app;
}
