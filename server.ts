import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { checkDatabaseConnection, getNeonSql, initDatabaseSchema } from './server/db.js';
import { verifyBdvPayment, getBdvApiConfig, getRecentVerifications } from './server/bdv.js';

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

  // 4. Products API (from Neon if configured)
  app.get('/api/products', async (req, res) => {
    const sql = getNeonSql();
    if (!sql) {
      return res.json({ source: 'local_fallback', data: [] });
    }
    try {
      const rows = await sql`SELECT * FROM shoe_products ORDER BY nombre ASC`;
      res.json({ source: 'neon_postgres', data: rows });
    } catch (err) {
      res.json({ source: 'local_fallback', error: String(err), data: [] });
    }
  });

  app.post('/api/products', async (req, res) => {
    const sql = getNeonSql();
    if (!sql) {
      return res.json({ saved: false, message: 'DATABASE_URL no configurada en Neon' });
    }
    try {
      const p = req.body;
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
          costo = EXCLUDED.costo,
          nombre = EXCLUDED.nombre;
      `;
      res.json({ saved: true });
    } catch (err: unknown) {
      res.status(500).json({ saved: false, error: String(err) });
    }
  });

  // 5. Sales API (from Neon if configured)
  app.get('/api/sales', async (req, res) => {
    const sql = getNeonSql();
    if (!sql) {
      return res.json({ source: 'local_fallback', data: [] });
    }
    try {
      const rows = await sql`SELECT * FROM sales_transactions ORDER BY fecha DESC`;
      res.json({ source: 'neon_postgres', data: rows });
    } catch (err) {
      res.json({ source: 'local_fallback', error: String(err), data: [] });
    }
  });

  app.post('/api/sales', async (req, res) => {
    const sql = getNeonSql();
    const s = req.body;
    if (!sql) {
      return res.json({ saved: false, message: 'DATABASE_URL no configurada en Neon' });
    }
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

      res.json({ saved: true, id: s.id });
    } catch (err: unknown) {
      console.error('Error guardando venta en Neon:', err);
      res.status(500).json({ saved: false, error: String(err) });
    }
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

  // 7. Vite Middleware for Development / Static serving for Production
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
