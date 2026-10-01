import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let sqlClient: NeonQueryFunction<false, false> | null = null;
let isInitialized = false;

// PostgreSQL (y por lo tanto Neon) devuelve las columnas NUMERIC/DECIMAL como
// strings, no como números JS, para evitar pérdida de precisión. Nuestro
// esquema usa NUMERIC para todos los campos de dinero/tasas, así que cada fila
// leída directo de la BD necesita estos campos convertidos de vuelta a número
// antes de enviarse al cliente — si no, cosas como `total_usd.toFixed(2)` o
// `sum + row.total_usd` se rompen (concatenación de texto en vez de suma).
function normalizeNumericFields<T extends Record<string, any>>(row: T, fields: string[]): T {
  const out: any = { ...row };
  for (const field of fields) {
    if (out[field] !== null && out[field] !== undefined && out[field] !== '') {
      const n = Number(out[field]);
      if (!Number.isNaN(n)) out[field] = n;
    }
  }
  return out;
}

function normalizeNumericRows<T extends Record<string, any>>(rows: T[], fields: string[]): T[] {
  return rows.map((row) => normalizeNumericFields(row, fields));
}

export const NUMERIC_FIELDS = {
  shoe_products: ['precio', 'costo'],
  sales_transactions: [
    'subtotal_usd',
    'descuento_usd',
    'porcentaje_iva',
    'iva_monto_usd',
    'total_usd',
    'total_bs',
    'costo_total_usd',
    'ganancia_neta_usd',
    'tasa_cambio',
    'total_positivo_inmediato_usd',
    'total_cashea_pendiente_usd',
  ],
  expenses: ['monto', 'tasa_cambio', 'monto_usd', 'monto_bs'],
  bank_reconciliations: ['monto_bs', 'monto_usd'],
  layaways: [
    'total_usd',
    'total_bs',
    'tasa_cambio',
    'total_abonado_usd',
    'total_abonado_bs',
    'saldo_pendiente_usd',
    'saldo_pendiente_bs',
  ],
};

export function normalizeProducts<T extends Record<string, any>>(rows: T[]): T[] {
  return normalizeNumericRows(rows, NUMERIC_FIELDS.shoe_products);
}

export function normalizeSales<T extends Record<string, any>>(rows: T[]): T[] {
  return normalizeNumericRows(rows, NUMERIC_FIELDS.sales_transactions);
}

export function normalizeExpenses<T extends Record<string, any>>(rows: T[]): T[] {
  return normalizeNumericRows(rows, NUMERIC_FIELDS.expenses);
}

export function normalizeBankReconciliations<T extends Record<string, any>>(rows: T[]): T[] {
  return normalizeNumericRows(rows, NUMERIC_FIELDS.bank_reconciliations);
}

export function normalizeLayaways<T extends Record<string, any>>(rows: T[]): T[] {
  return normalizeNumericRows(rows, NUMERIC_FIELDS.layaways);
}

export async function getDailyClosures(): Promise<any[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  try {
    const rows = await sql`SELECT * FROM cash_closures ORDER BY fecha DESC, created_at DESC`;
    return rows;
  } catch (err) {
    console.error('Error obteniendo cierres de caja:', err);
    return [];
  }
}

export async function addDailyClosure(closure: any): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    await sql`
      INSERT INTO cash_closures (
        id, fecha, monto_apertura_usd, monto_apertura_bs, total_ventas_usd, total_ventas_bs,
        totales_por_cuenta, monto_declarado_usd, monto_declarado_bs, diferencia_usd, diferencia_bs,
        tasa_bcv, usuario, observaciones, estado
      ) VALUES (
        ${closure.id}, ${closure.fecha}, ${closure.monto_apertura_usd || 0}, ${closure.monto_apertura_bs || 0},
        ${closure.total_ventas_usd || 0}, ${closure.total_ventas_bs || 0}, ${JSON.stringify(closure.totales_por_cuenta || {})},
        ${closure.monto_declarado_usd || 0}, ${closure.monto_declarado_bs || 0}, ${closure.diferencia_usd || 0},
        ${closure.diferencia_bs || 0}, ${closure.tasa_bcv || 0}, ${closure.usuario || ''}, ${closure.observaciones || ''},
        ${closure.estado || 'cerrado'}
      )
    `;
    return true;
  } catch (err) {
    console.error('Error insertando cierre de caja:', err);
    return false;
  }
}

export async function replaceDailyClosures(closures: any[]): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    for (const c of closures) {
      await addDailyClosure(c);
    }
    return true;
  } catch {
    return false;
  }
}

export function getNeonSql(): NeonQueryFunction<false, false> | null {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim() === '') {
    return null;
  }

  if (!sqlClient) {
    try {
      sqlClient = neon(databaseUrl);
    } catch (err) {
      console.error('Error al inicializar cliente Neon:', err);
      return null;
    }
  }

  return sqlClient;
}

export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  tablesCount?: number;
  productsCount?: number;
  salesCount?: number;
  closuresCount?: number;
  expensesCount?: number;
  bankCount?: number;
  layawaysCount?: number;
  databaseName?: string;
  tablesSummary?: Record<string, number>;
  error?: string;
}> {
  const sql = getNeonSql();
  if (!sql) {
    return {
      connected: false,
      message: 'DATABASE_URL no configurada en las variables de entorno. Puedes agregarla en .env o Vercel.',
    };
  }

  try {
    const timeResult = await sql`SELECT current_database() as db, NOW() as current_time`;
    const dbName = timeResult[0]?.db || 'neondb';

    // Ensure tables exist
    await initDatabaseSchema();

    // Check count of records across all core business tables
    const [pRes, sRes, cRes, eRes, bRes, lRes] = await Promise.allSettled([
      sql`SELECT COUNT(*) as count FROM shoe_products`,
      sql`SELECT COUNT(*) as count FROM sales_transactions`,
      sql`SELECT COUNT(*) as count FROM cash_closures`,
      sql`SELECT COUNT(*) as count FROM expenses`,
      sql`SELECT COUNT(*) as count FROM bank_reconciliations`,
      sql`SELECT COUNT(*) as count FROM layaways`,
    ]);

    const getCount = (res: PromiseSettledResult<any>) =>
      res.status === 'fulfilled' && res.value[0]?.count ? Number(res.value[0].count) : 0;

    const productsCount = getCount(pRes);
    const salesCount = getCount(sRes);
    const closuresCount = getCount(cRes);
    const expensesCount = getCount(eRes);
    const bankCount = getCount(bRes);
    const layawaysCount = getCount(lRes);

    return {
      connected: true,
      message: 'Conectado exitosamente a la base de datos Neon PostgreSQL',
      databaseName: dbName,
      productsCount,
      salesCount,
      closuresCount,
      expensesCount,
      bankCount,
      layawaysCount,
      tablesSummary: {
        shoe_products: productsCount,
        sales_transactions: salesCount,
        cash_closures: closuresCount,
        expenses: expensesCount,
        bank_reconciliations: bankCount,
        layaways: layawaysCount,
      },
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      message: 'Error al conectar con Neon PostgreSQL',
      error: errMsg,
    };
  }
}

export async function initDatabaseSchema() {
  const sql = getNeonSql();
  if (!sql || isInitialized) return;

  try {
    // 1. Table for Shoe Products
    await sql`
      CREATE TABLE IF NOT EXISTS shoe_products (
        id VARCHAR(64) PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        marca VARCHAR(100) NOT NULL,
        modelo VARCHAR(150),
        color VARCHAR(80),
        genero VARCHAR(50),
        categoria VARCHAR(100),
        talla VARCHAR(20) NOT NULL,
        sku VARCHAR(80) NOT NULL,
        precio NUMERIC(12, 2) NOT NULL,
        costo NUMERIC(12, 2) NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        stock_minimo INTEGER NOT NULL DEFAULT 3,
        stock_maximo INTEGER NOT NULL DEFAULT 30,
        imagen_url TEXT,
        ubicacion VARCHAR(100),
        descripcion TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 2. Table for Sales Transactions
    await sql`
      CREATE TABLE IF NOT EXISTS sales_transactions (
        id VARCHAR(64) PRIMARY KEY,
        numero_factura VARCHAR(50) NOT NULL,
        cliente_nombre VARCHAR(120),
        cliente_apellido VARCHAR(120),
        cliente_rif VARCHAR(50),
        cliente_telefono VARCHAR(50),
        subtotal_usd NUMERIC(12, 2) NOT NULL,
        descuento_usd NUMERIC(12, 2) DEFAULT 0,
        aplica_iva BOOLEAN DEFAULT FALSE,
        porcentaje_iva NUMERIC(5, 2) DEFAULT 0,
        iva_monto_usd NUMERIC(12, 2) DEFAULT 0,
        total_usd NUMERIC(12, 2) NOT NULL,
        total_bs NUMERIC(14, 2) NOT NULL,
        costo_total_usd NUMERIC(12, 2) DEFAULT 0,
        ganancia_neta_usd NUMERIC(12, 2) DEFAULT 0,
        tasa_cambio NUMERIC(10, 2) NOT NULL,
        items JSONB NOT NULL,
        pagos JSONB NOT NULL,
        fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        usuario VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Secuencia persistente de facturación. Neon es la fuente de verdad para
    // evitar que dos terminales generen el mismo número.
    await sql`
      CREATE TABLE IF NOT EXISTS invoice_sequences (
        id VARCHAR(30) PRIMARY KEY,
        last_number INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await sql`
      INSERT INTO invoice_sequences (id, last_number)
      VALUES ('MAKD', COALESCE((
        SELECT MAX(CASE
          WHEN numero_factura ~ '[0-9]+$'
          THEN CAST(SUBSTRING(numero_factura FROM '[0-9]+$') AS INTEGER)
          ELSE 0 END)
        FROM sales_transactions
      ), 0))
      ON CONFLICT (id) DO UPDATE SET
        last_number = GREATEST(invoice_sequences.last_number, EXCLUDED.last_number),
        updated_at = NOW();
    `;

    // 3. Table for Cash Closures (Arqueo de caja)
    await sql`
      CREATE TABLE IF NOT EXISTS cash_closures (
        id VARCHAR(64) PRIMARY KEY,
        fecha VARCHAR(20) NOT NULL,
        monto_apertura_usd NUMERIC(12, 2) DEFAULT 0,
        monto_apertura_bs NUMERIC(14, 2) DEFAULT 0,
        total_ventas_usd NUMERIC(12, 2) DEFAULT 0,
        total_ventas_bs NUMERIC(14, 2) DEFAULT 0,
        totales_por_cuenta JSONB NOT NULL,
        monto_declarado_usd NUMERIC(12, 2) DEFAULT 0,
        monto_declarado_bs NUMERIC(14, 2) DEFAULT 0,
        diferencia_usd NUMERIC(12, 2) DEFAULT 0,
        diferencia_bs NUMERIC(14, 2) DEFAULT 0,
        tasa_bcv NUMERIC(10, 2) NOT NULL,
        usuario VARCHAR(100),
        observaciones TEXT,
        estado VARCHAR(30) DEFAULT 'cerrado',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Columnas para persistir el cierre de caja / arqueo diario tal como lo
    // arma el frontend (evita depender de que las columnas de arriba
    // coincidan exactamente con lo que la app realmente envía).
    await sql`ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS data JSONB`;
    await sql`ALTER TABLE cash_closures ALTER COLUMN totales_por_cuenta DROP NOT NULL`;
    await sql`ALTER TABLE cash_closures ALTER COLUMN tasa_bcv DROP NOT NULL`;

    // Columnas añadidas después del diseño original: permiten guardar el
    // correo del cliente, notas de la venta, y anular una venta con error
    // (en vez de borrarla, se marca como 'anulada' y se conserva el historial).
    // Marca si el producto es original/auténtico o una réplica.
    await sql`ALTER TABLE shoe_products ADD COLUMN IF NOT EXISTS es_original BOOLEAN DEFAULT true`;
    // updated_at: para que la app pueda preguntar "¿cambió algo?" con una
    // consulta barata, en vez de tener que volver a descargar todos los
    // productos (con sus fotos) cada vez que revisa si hay novedades.
    await sql`ALTER TABLE shoe_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`;

    await sql`ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS cliente_correo VARCHAR(150)`;
    await sql`ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS notas TEXT`;
    await sql`ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'completada'`;
    await sql`ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT`;
    await sql`ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS anulada_at TIMESTAMP WITH TIME ZONE`;
    await sql`ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS total_positivo_inmediato_usd NUMERIC(12, 2) DEFAULT 0`;
    await sql`ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS total_cashea_pendiente_usd NUMERIC(12, 2) DEFAULT 0`;
    await sql`ALTER TABLE sales_transactions ADD COLUMN IF NOT EXISTS estado_cashea VARCHAR(30) DEFAULT 'sin_cashea'`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`;
    await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS foto_factura TEXT`;
    await sql`ALTER TABLE bank_reconciliations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`;
    await sql`ALTER TABLE cash_closures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`;

    // 4. Table for BDV Verified Payments
    await sql`
      CREATE TABLE IF NOT EXISTS bdv_verifications (
        id VARCHAR(64) PRIMARY KEY,
        referencia VARCHAR(30) NOT NULL,
        telefono_origen VARCHAR(25) NOT NULL,
        cedula_cliente VARCHAR(30) NOT NULL,
        banco_origen VARCHAR(100) NOT NULL,
        monto_bs NUMERIC(14, 2) NOT NULL,
        monto_usd_estimado NUMERIC(12, 2),
        codigo_aprobacion VARCHAR(50),
        estado VARCHAR(30) NOT NULL,
        mensaje VARCHAR(255),
        datos_bdv JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 5. Table for Expenses (Gastos y Costos Operativos)
    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(64) PRIMARY KEY,
        fecha VARCHAR(20) NOT NULL,
        categoria VARCHAR(100) NOT NULL,
        descripcion TEXT NOT NULL,
        beneficiario VARCHAR(150),
        cuenta_origen VARCHAR(100) NOT NULL,
        moneda VARCHAR(10) NOT NULL,
        monto NUMERIC(14, 2) NOT NULL,
        tasa_cambio NUMERIC(10, 2) NOT NULL,
        monto_usd NUMERIC(12, 2) NOT NULL,
        monto_bs NUMERIC(14, 2) NOT NULL,
        comprobante_ref VARCHAR(80),
        registrado_por VARCHAR(100),
        notas TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 6. Table for Bank Reconciliations (Conciliaciones Bancarias)
    await sql`
      CREATE TABLE IF NOT EXISTS bank_reconciliations (
        id VARCHAR(64) PRIMARY KEY,
        fecha VARCHAR(20) NOT NULL,
        banco VARCHAR(100) NOT NULL,
        tipo VARCHAR(30) NOT NULL,
        referencia VARCHAR(60) NOT NULL,
        descripcion TEXT NOT NULL,
        monto_bs NUMERIC(14, 2) NOT NULL,
        monto_usd NUMERIC(12, 2),
        estado_conciliacion VARCHAR(30) DEFAULT 'pendiente',
        vinculado_tipo VARCHAR(50),
        vinculado_id VARCHAR(64),
        notas TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 7. Table for Layaways (Apartados de Calzado y Abonos)
    await sql`
      CREATE TABLE IF NOT EXISTS layaways (
        id VARCHAR(64) PRIMARY KEY,
        codigo_apartado VARCHAR(50) NOT NULL,
        cliente_nombre VARCHAR(120) NOT NULL,
        cliente_apellido VARCHAR(120),
        cliente_cedula VARCHAR(50),
        cliente_telefono VARCHAR(50),
        items JSONB NOT NULL,
        total_usd NUMERIC(12, 2) NOT NULL,
        total_bs NUMERIC(14, 2) NOT NULL,
        tasa_cambio NUMERIC(10, 2) NOT NULL,
        total_abonado_usd NUMERIC(12, 2) DEFAULT 0,
        total_abonado_bs NUMERIC(14, 2) DEFAULT 0,
        saldo_pendiente_usd NUMERIC(12, 2) DEFAULT 0,
        saldo_pendiente_bs NUMERIC(14, 2) DEFAULT 0,
        abonos JSONB NOT NULL,
        fecha_apartado TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        fecha_vencimiento VARCHAR(30),
        estado VARCHAR(30) DEFAULT 'activo',
        usuario VARCHAR(100),
        notas TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    isInitialized = true;
    console.log('✅ Esquema Neon PostgreSQL verificado e inicializado correctamente.');
  } catch (error) {
    console.error('Error al inicializar tablas en Neon:', error);
  }
}

// ==========================================
// Ventas (sales_transactions)
// ==========================================

export async function getNextInvoiceNumber(): Promise<string | null> {
  const sql = getNeonSql();
  if (!sql) return null;
  try {
    await initDatabaseSchema();
    const rows = await (sql as any).query(
      `INSERT INTO invoice_sequences (id, last_number, updated_at)
       VALUES ('MAKD', 1, NOW())
       ON CONFLICT (id) DO UPDATE SET
         last_number = invoice_sequences.last_number + 1,
         updated_at = NOW()
       RETURNING last_number`,
      []
    );
    const n = Number(rows?.[0]?.last_number) || 1;
    return `MK-${String(n).padStart(6, '0')}`;
  } catch (err) {
    console.error('Error generando número de factura:', err);
    return null;
  }
}

export async function saveSaleAndDeductStock(sale: any): Promise<{
  ok: boolean;
  alreadySaved?: boolean;
  error?: string;
  updatedProducts?: Array<{ id: string; stock: number }>;
}> {
  const sql = getNeonSql();
  if (!sql) return { ok: false, error: 'Base de datos Neon no configurada.' };
  if (!sale?.id || !Array.isArray(sale.items) || sale.items.length === 0) {
    return { ok: false, error: 'La venta no tiene ID o productos.' };
  }

  try {
    await initDatabaseSchema();
    const result = await (sql as any).query(
      `WITH sale_data AS (
         SELECT $1::jsonb AS sale
       ), item_data AS (
         SELECT
           COALESCE(NULLIF(item->>'producto_id',''), NULL) AS producto_id,
           COALESCE(NULLIF(item->>'sku',''), NULL) AS sku,
           COALESCE(NULLIF(item->>'nombre_producto',''), NULL) AS nombre_producto,
           COALESCE(NULLIF(item->>'talla',''), NULL) AS talla,
           GREATEST(1, COALESCE((item->>'cantidad')::numeric, 1))::integer AS cantidad
         FROM sale_data, jsonb_array_elements(sale->'items') item
       ), matched AS (
         SELECT i.*, p.id AS matched_id, p.stock
         FROM item_data i
         LEFT JOIN LATERAL (
           SELECT id, stock FROM shoe_products p
           WHERE (i.producto_id IS NOT NULL AND p.id = i.producto_id)
              OR (i.sku IS NOT NULL AND lower(p.sku) = lower(i.sku))
              OR (i.nombre_producto IS NOT NULL AND i.talla IS NOT NULL
                  AND lower(p.nombre) = lower(i.nombre_producto) AND p.talla = i.talla)
           ORDER BY CASE WHEN i.producto_id IS NOT NULL AND p.id = i.producto_id THEN 1
                         WHEN i.sku IS NOT NULL AND lower(p.sku) = lower(i.sku) THEN 2 ELSE 3 END
           LIMIT 1
         ) p ON TRUE
       ), validation AS (
         SELECT COUNT(*) AS total_items,
                COUNT(matched_id) AS matched_items,
                COALESCE(BOOL_AND(stock >= cantidad), FALSE) AS enough_stock
         FROM matched
       ), inserted AS (
         INSERT INTO sales_transactions (
           id, numero_factura, cliente_nombre, cliente_apellido, cliente_rif,
           cliente_telefono, cliente_correo, subtotal_usd, descuento_usd, aplica_iva,
           porcentaje_iva, iva_monto_usd, total_usd, total_bs, costo_total_usd,
           ganancia_neta_usd, tasa_cambio, items, pagos, fecha, usuario, notas, estado,
           total_positivo_inmediato_usd, total_cashea_pendiente_usd, estado_cashea
         )
         SELECT
           sale->>'id', sale->>'numero_factura', COALESCE(sale->>'cliente_nombre',''),
           COALESCE(sale->>'cliente_apellido',''), COALESCE(sale->>'cliente_rif',''),
           COALESCE(sale->>'cliente_telefono',''), COALESCE(sale->>'cliente_correo',''),
           COALESCE((sale->>'subtotal_usd')::numeric,0), COALESCE((sale->>'descuento_usd')::numeric,0),
           COALESCE((sale->>'aplica_iva')::boolean,FALSE), COALESCE((sale->>'porcentaje_iva')::numeric,0),
           COALESCE((sale->>'iva_monto_usd')::numeric,0), COALESCE((sale->>'total_usd')::numeric,0),
           COALESCE((sale->>'total_bs')::numeric,0), COALESCE((sale->>'costo_total_usd')::numeric,0),
           COALESCE((sale->>'ganancia_neta_usd')::numeric,0), COALESCE((sale->>'tasa_cambio')::numeric,0),
           sale->'items', sale->'pagos', COALESCE(sale->>'fecha',NOW()::text), COALESCE(sale->>'usuario',''),
           COALESCE(sale->>'notas',''), COALESCE(sale->>'estado','completada'),
           COALESCE((sale->>'total_positivo_inmediato_usd')::numeric,0),
           COALESCE((sale->>'total_cashea_pendiente_usd')::numeric,0), COALESCE(sale->>'estado_cashea','sin_cashea')
         FROM sale_data, validation
         WHERE validation.total_items = validation.matched_items
           AND validation.enough_stock
         ON CONFLICT (id) DO NOTHING
         RETURNING id
       ), updated AS (
         UPDATE shoe_products p
         SET stock = p.stock - m.cantidad, updated_at = NOW()
         FROM matched m, inserted ins
         WHERE p.id = m.matched_id
         RETURNING p.id, p.stock
       )
       SELECT
         (SELECT COUNT(*) FROM inserted)::integer AS inserted_count,
         (SELECT COUNT(*) FROM updated)::integer AS updated_count,
         (SELECT COUNT(*) FROM matched)::integer AS total_items,
         (SELECT COUNT(*) FROM matched WHERE matched_id IS NOT NULL)::integer AS matched_items,
         (SELECT COALESCE(BOOL_AND(stock >= cantidad), FALSE) FROM matched) AS enough_stock,
         (SELECT json_agg(json_build_object('id', id, 'stock', stock)) FROM updated) AS updated_products`,
      [JSON.stringify(sale)]
    );

    const row = result?.[0] || {};
    const total = Number(row.total_items) || 0;
    const matched = Number(row.matched_items) || 0;
    const inserted = Number(row.inserted_count) || 0;
    const updated = Number(row.updated_count) || 0;

    if (inserted === 0) {
      const existing = await (sql as any).query(`SELECT id, estado FROM sales_transactions WHERE id = $1`, [sale.id]);
      if (existing?.[0]) return { ok: true, alreadySaved: true, updatedProducts: [] };
    }
    if (total !== matched) return { ok: false, error: 'Uno o más productos de la venta no existen en Neon.' };
    if (!row.enough_stock) return { ok: false, error: 'Stock insuficiente para completar la venta.' };
    if (inserted !== 1 || updated < 1) return { ok: false, error: 'No se pudo registrar la venta y actualizar el inventario.' };
    return { ok: true, updatedProducts: row.updated_products || [] };
  } catch (err) {
    console.error('Error transaccional venta+inventario:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function insertSale(sale: any): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;
  await sql`
    INSERT INTO sales_transactions (
      id, numero_factura, cliente_nombre, cliente_apellido, cliente_rif,
      cliente_telefono, cliente_correo, subtotal_usd, descuento_usd, aplica_iva,
      porcentaje_iva, iva_monto_usd, total_usd, total_bs, costo_total_usd,
      ganancia_neta_usd, tasa_cambio, items, pagos, fecha, usuario, notas, estado,
      total_positivo_inmediato_usd, total_cashea_pendiente_usd, estado_cashea
    ) VALUES (
      ${sale.id}, ${sale.numero_factura}, ${sale.cliente_nombre || ''}, ${sale.cliente_apellido || ''},
      ${sale.cliente_rif || ''}, ${sale.cliente_telefono || ''}, ${sale.cliente_correo || ''},
      ${sale.subtotal_usd || 0}, ${sale.descuento_usd || 0}, ${!!sale.aplica_iva},
      ${sale.porcentaje_iva || 0}, ${sale.iva_monto_usd || 0}, ${sale.total_usd || 0},
      ${sale.total_bs || 0}, ${sale.costo_total_usd || 0}, ${sale.ganancia_neta_usd || 0},
      ${sale.tasa_cambio || 0}, ${JSON.stringify(sale.items || [])}, ${JSON.stringify(sale.pagos || [])},
      ${sale.fecha || new Date().toISOString()}, ${sale.usuario || ''}, ${sale.notas || ''},
      ${sale.estado || 'completada'},
      ${sale.total_positivo_inmediato_usd || 0}, ${sale.total_cashea_pendiente_usd || 0},
      ${sale.estado_cashea || 'sin_cashea'}
    )
    ON CONFLICT (id) DO UPDATE SET
      pagos = EXCLUDED.pagos,
      total_positivo_inmediato_usd = EXCLUDED.total_positivo_inmediato_usd,
      total_cashea_pendiente_usd = EXCLUDED.total_cashea_pendiente_usd,
      estado_cashea = EXCLUDED.estado_cashea,
      estado = EXCLUDED.estado,
      fecha = EXCLUDED.fecha,
      notas = EXCLUDED.notas;
  `;
  return true;
}

export async function deductStockForSaleItems(
  items: any[]
): Promise<{
  ok: boolean;
  error?: string;
  updatedProducts?: Array<{ id: string; stock: number }>;
}> {
  const sql = getNeonSql();

  if (!sql) {
    return { ok: false, error: 'Base de datos Neon no configurada.' };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: 'La venta no contiene productos.' };
  }

  const updatedProducts: Array<{ id: string; stock: number }> = [];

  for (const item of items) {
    const cantidad = Math.max(1, Number(item?.cantidad) || 1);
    const id = item?.producto_id ? String(item.producto_id).trim() : null;
    const sku = item?.sku ? String(item.sku).trim() : null;
    const nombre = item?.nombre_producto ? String(item.nombre_producto).trim() : null;
    const talla = item?.talla ? String(item.talla).trim() : null;

    if (!id && !sku && !(nombre && talla)) {
      return { ok: false, error: `No se pudo identificar el producto vendido: ${JSON.stringify(item)}` };
    }

    try {
      const rows = await (sql as any).query(
        `
        SELECT id, stock
        FROM shoe_products
        WHERE
          ($1::varchar IS NOT NULL AND id = $1::varchar)
          OR
          ($2::varchar IS NOT NULL AND sku IS NOT NULL AND lower(sku) = lower($2::varchar))
          OR
          (
            $3::varchar IS NOT NULL
            AND $4::varchar IS NOT NULL
            AND lower(nombre) = lower($3::varchar)
            AND talla = $4::varchar
          )
        ORDER BY
          CASE
            WHEN $1::varchar IS NOT NULL AND id = $1::varchar THEN 1
            WHEN $2::varchar IS NOT NULL AND sku IS NOT NULL AND lower(sku) = lower($2::varchar) THEN 2
            ELSE 3
          END
        LIMIT 1
        `,
        [id, sku, nombre, talla]
      );

      const product = rows?.[0];

      if (!product) {
        return {
          ok: false,
          error: `No se encontró en Neon el producto vendido. ID=${id || '-'} SKU=${sku || '-'} Nombre=${nombre || '-'} Talla=${talla || '-'}`,
        };
      }

      const stockActual = Number(product.stock) || 0;
      if (stockActual < cantidad) {
        return {
          ok: false,
          error: `Stock insuficiente para ${nombre || sku || id}. Disponible: ${stockActual}, vendido: ${cantidad}.`,
        };
      }

      const updatedRows = await (sql as any).query(
        `
        UPDATE shoe_products
        SET stock = stock - $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, stock
        `,
        [cantidad, product.id]
      );

      const updated = updatedRows?.[0];
      if (!updated) {
        return { ok: false, error: `No se pudo actualizar el stock del producto ${product.id}.` };
      }

      updatedProducts.push({ id: String(updated.id), stock: Number(updated.stock) || 0 });
    } catch (err) {
      console.error('Error descontando stock en Neon para item de venta:', item, err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Error desconocido actualizando inventario.',
      };
    }
  }

  return { ok: true, updatedProducts };
}

export async function updateSale(id: string, updates: Record<string, any>): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;
  const allowed: Record<string, true> = {
    numero_factura: true, fecha: true, notas: true, cliente_nombre: true, cliente_apellido: true,
    cliente_rif: true, cliente_telefono: true, cliente_correo: true,
    pagos: true, total_positivo_inmediato_usd: true, total_cashea_pendiente_usd: true,
    estado_cashea: true, estado: true, motivo_anulacion: true,
  };
  const keys = Object.keys(updates).filter((k) => allowed[k]);
  if (keys.length === 0) return false;
  for (const key of keys) {
    const val = typeof updates[key] === 'object' && updates[key] !== null
      ? JSON.stringify(updates[key])
      : updates[key];
    await (sql as any).query(`UPDATE sales_transactions SET ${key} = $1 WHERE id = $2`, [val, id]);
  }
  return true;
}

// Anular una venta con error: no se borra (se conserva el historial), se
// marca como 'anulada' y el stock de cada producto vendido se restituye.
export async function voidSale(id: string, motivo: string): Promise<{ ok: boolean; items?: any[]; alreadyVoided?: boolean }> {
  const sql = getNeonSql();
  if (!sql) return { ok: false };
  try {
    const result = await (sql as any).query(
      `WITH target AS (
         SELECT id, items, estado FROM sales_transactions WHERE id = $1
       ), item_data AS (
         SELECT
           COALESCE(NULLIF(item->>'producto_id',''), NULL) AS producto_id,
           COALESCE(NULLIF(item->>'sku',''), NULL) AS sku,
           COALESCE(NULLIF(item->>'nombre_producto',''), NULL) AS nombre_producto,
           COALESCE(NULLIF(item->>'talla',''), NULL) AS talla,
           GREATEST(1, COALESCE((item->>'cantidad')::numeric,1))::integer AS cantidad
         FROM target, jsonb_array_elements(COALESCE(target.items,'[]'::jsonb)) item
         WHERE target.estado IS DISTINCT FROM 'anulada'
       ), matched AS (
         SELECT i.*, p.id AS matched_id
         FROM item_data i
         LEFT JOIN LATERAL (
           SELECT id FROM shoe_products p
           WHERE (i.producto_id IS NOT NULL AND p.id = i.producto_id)
              OR (i.sku IS NOT NULL AND lower(p.sku) = lower(i.sku))
              OR (i.nombre_producto IS NOT NULL AND i.talla IS NOT NULL
                  AND lower(p.nombre) = lower(i.nombre_producto) AND p.talla = i.talla)
           ORDER BY CASE WHEN i.producto_id IS NOT NULL AND p.id = i.producto_id THEN 1
                         WHEN i.sku IS NOT NULL AND lower(p.sku) = lower(i.sku) THEN 2 ELSE 3 END
           LIMIT 1
         ) p ON TRUE
       ), grouped AS (
         SELECT matched_id, SUM(cantidad)::integer AS cantidad
         FROM matched WHERE matched_id IS NOT NULL GROUP BY matched_id
       ), restored AS (
         UPDATE shoe_products p
         SET stock = p.stock + g.cantidad, updated_at = NOW()
         FROM grouped g
         WHERE p.id = g.matched_id
         RETURNING p.id, p.stock
       ), marked AS (
         UPDATE sales_transactions s
         SET estado = 'anulada', motivo_anulacion = COALESCE($2,''), anulada_at = NOW()
         WHERE s.id = $1 AND s.estado IS DISTINCT FROM 'anulada'
         RETURNING s.id, s.items
       )
       SELECT
         (SELECT COUNT(*) FROM target)::integer AS found,
         (SELECT estado FROM target LIMIT 1) AS previous_state,
         (SELECT items FROM target LIMIT 1) AS items,
         (SELECT COUNT(*) FROM marked)::integer AS marked_count,
         (SELECT COALESCE(json_agg(json_build_object('id', id, 'stock', stock)), '[]'::json) FROM restored) AS restored_products`,
      [id, motivo || '']
    );
    const row = result?.[0];
    if (!row || Number(row.found) === 0) return { ok: false };
    if (row.previous_state === 'anulada') return { ok: true, alreadyVoided: true, items: row.items || [] };
    if (Number(row.marked_count) !== 1) return { ok: false };
    return { ok: true, items: row.items || [] };
  } catch (err) {
    console.error('Error anulando venta y restituyendo inventario:', err);
    throw err;
  }
}

// ==========================================
// Cierres de caja / arqueo diario (cash_closures.data)
// ==========================================

export async function getSalesClosures(): Promise<any[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  try {
    const rows = await sql`
      SELECT id, data FROM cash_closures
      WHERE data IS NOT NULL
      ORDER BY fecha DESC, created_at DESC
    `;
    return rows.map((r: any) => ({ ...(r.data || {}), id: r.id }));
  } catch (err) {
    console.error('Error obteniendo cierres de caja:', err);
    return [];
  }
}

export async function addSalesClosure(closure: any): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql || !closure?.id) return false;
  await sql`
    INSERT INTO cash_closures (
      id, fecha, data, total_ventas_usd, total_ventas_bs, usuario, observaciones, estado
    ) VALUES (
      ${closure.id}, ${closure.fecha || ''}, ${JSON.stringify(closure)},
      ${closure.total_ventas_usd || 0}, ${closure.total_ventas_bs || 0},
      ${closure.usuario || ''}, ${closure.notas || ''}, 'cerrado'
    )
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
  `;
  return true;
}

// ==========================================
// Versión ligera del estado de la tienda
// ==========================================
// Consulta MUY barata (no trae fotos ni datos completos) que la app usa
// para preguntar "¿cambió algo desde la última vez?" antes de decidir si
// vale la pena volver a descargar todo (incluidas las fotos de productos).
// Esto es lo que evita que cada revisión automática consuma el ancho de
// banda de re-enviar el catálogo completo una y otra vez sin necesidad.
// Antes esta función juntaba productos, ventas, gastos, etc. en UN solo
// "número de versión". El problema: cada venta nueva (que pasa todo el día,
// muchas veces por hora) cambiaba ese número combinado, así que el "¿cambió
// algo?" casi SIEMPRE decía que sí — y la app terminaba re-descargando TODO
// el catálogo, fotos de productos incluidas, en cada sincronización (cada
// 60 segundos, en cada PC/pestaña abierta). Eso fue lo que agotó el ancho
// de banda gratuito de Render.
//
// Ahora se calcula un número de versión POR SEPARADO para cada cosa
// (productos, ventas, gastos, etc.). Así, una venta nueva solo obliga a
// re-descargar ventas (datos livianos, sin fotos) — el catálogo de
// productos con sus fotos solo se vuelve a bajar cuando un producto de
// verdad cambió.
export interface StoreVersion {
  products: string;
  sales: string;
  expenses: string;
  bankReconciliations: string;
  closures: string;
}

export async function getStoreVersion(): Promise<StoreVersion> {
  const sql = getNeonSql();
  const empty: StoreVersion = {
    products: 'no-db', sales: 'no-db', expenses: 'no-db',
    bankReconciliations: 'no-db', closures: 'no-db',
  };
  if (!sql) return empty;
  try {
    const rows = await sql`
      SELECT
        (SELECT COUNT(*) FROM shoe_products) AS p_count,
        (SELECT COALESCE(EXTRACT(EPOCH FROM MAX(updated_at)), 0) FROM shoe_products) AS p_ts,
        (SELECT COUNT(*) FROM sales_transactions) AS s_count,
        (SELECT COALESCE(EXTRACT(EPOCH FROM MAX(GREATEST(created_at, COALESCE(anulada_at, created_at)))), 0) FROM sales_transactions) AS s_ts,
        (SELECT COUNT(*) FROM expenses) AS e_count,
        (SELECT COALESCE(EXTRACT(EPOCH FROM MAX(updated_at)), 0) FROM expenses) AS e_ts,
        (SELECT COUNT(*) FROM bank_reconciliations) AS b_count,
        (SELECT COALESCE(EXTRACT(EPOCH FROM MAX(updated_at)), 0) FROM bank_reconciliations) AS b_ts,
        (SELECT COUNT(*) FROM cash_closures) AS c_count,
        (SELECT COALESCE(EXTRACT(EPOCH FROM MAX(updated_at)), 0) FROM cash_closures) AS c_ts
    `;
    const r: any = rows[0] || {};
    return {
      products: `${r.p_count}-${r.p_ts}`,
      sales: `${r.s_count}-${r.s_ts}`,
      expenses: `${r.e_count}-${r.e_ts}`,
      bankReconciliations: `${r.b_count}-${r.b_ts}`,
      closures: `${r.c_count}-${r.c_ts}`,
    };
  } catch (err) {
    console.error('Error calculando versión de la tienda:', err);
    return {
      products: 'error', sales: 'error', expenses: 'error',
      bankReconciliations: 'error', closures: 'error',
    };
  }
}

export async function getNeonTables(): Promise<{ table_name: string }[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  try {
    const rows = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name ASC;
    `;
    return rows.map((r: any) => ({ table_name: String(r.table_name) }));
  } catch (err) {
    console.error('Error listando tablas en Neon:', err);
    return [];
  }
}

export async function getNeonTableData(tableName: string, limit = 50): Promise<{
  tableName: string;
  rowCount: number;
  columns: string[];
  rows: any[];
}> {
  const sql = getNeonSql();
  if (!sql) {
    throw new Error('Base de datos Neon no conectada');
  }

  // Sanitize table name (only letters, numbers, underscores)
  const cleanName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
  if (!cleanName) {
    throw new Error('Nombre de tabla inválido');
  }

  try {
    // Fetch columns
    const columnsMeta = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = ${cleanName}
      ORDER BY ordinal_position ASC;
    `;
    const columns = columnsMeta.map((c: any) => String(c.column_name));

    // Fetch count (cleanName is strictly sanitized to [a-zA-Z0-9_])
    const countRes = await (sql as any)(`SELECT COUNT(*) as total FROM "${cleanName}"`);
    const rowCount = Number(countRes[0]?.total || 0);

    // Fetch sample rows
    const rows = await (sql as any)(`SELECT * FROM "${cleanName}" ORDER BY 1 DESC LIMIT ${limit}`);

    return {
      tableName: cleanName,
      rowCount,
      columns,
      rows,
    };
  } catch (err: unknown) {
    console.error(`Error consultando tabla ${cleanName} en Neon:`, err);
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg);
  }
}

// ==========================================
// Apartados de Calzado (layaways)
// ==========================================

export async function getLayawaysFromDb(): Promise<any[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  try {
    await initDatabaseSchema();
    const rows = await sql`SELECT * FROM layaways ORDER BY fecha_apartado DESC`;
    return normalizeLayaways(rows as any[]);
  } catch (err) {
    console.error('Error al obtener apartados desde Neon:', err);
    return [];
  }
}

export async function saveLayawayToDb(layaway: any): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql || !layaway || !layaway.id) return false;
  try {
    await initDatabaseSchema();
    await sql`
      INSERT INTO layaways (
        id, codigo_apartado, cliente_nombre, cliente_apellido, cliente_cedula,
        cliente_telefono, items, total_usd, total_bs, tasa_cambio,
        total_abonado_usd, total_abonado_bs, saldo_pendiente_usd, saldo_pendiente_bs,
        abonos, fecha_apartado, fecha_vencimiento, estado, usuario, notas
      ) VALUES (
        ${layaway.id}, ${layaway.codigo_apartado || ''}, ${layaway.cliente_nombre || ''},
        ${layaway.cliente_apellido || ''}, ${layaway.cliente_cedula || ''},
        ${layaway.cliente_telefono || ''}, ${JSON.stringify(layaway.items || [])},
        ${layaway.total_usd || 0}, ${layaway.total_bs || 0}, ${layaway.tasa_cambio || 0},
        ${layaway.total_abonado_usd || 0}, ${layaway.total_abonado_bs || 0},
        ${layaway.saldo_pendiente_usd || 0}, ${layaway.saldo_pendiente_bs || 0},
        ${JSON.stringify(layaway.abonos || [])},
        ${layaway.fecha_apartado || new Date().toISOString()},
        ${layaway.fecha_vencimiento || ''}, ${layaway.estado || 'activo'},
        ${layaway.usuario || ''}, ${layaway.notas || ''}
      )
      ON CONFLICT (id) DO UPDATE SET
        total_abonado_usd = EXCLUDED.total_abonado_usd,
        total_abonado_bs = EXCLUDED.total_abonado_bs,
        saldo_pendiente_usd = EXCLUDED.saldo_pendiente_usd,
        saldo_pendiente_bs = EXCLUDED.saldo_pendiente_bs,
        abonos = EXCLUDED.abonos,
        estado = EXCLUDED.estado,
        notas = EXCLUDED.notas,
        updated_at = NOW();
    `;
    return true;
  } catch (err) {
    console.error('Error al guardar apartado en Neon:', err);
    return false;
  }
}

export async function deleteLayawayFromDb(id: string): Promise<boolean> {
  const sql = getNeonSql();
  if (!sql) return false;
  try {
    await sql`DELETE FROM layaways WHERE id = ${id}`;
    return true;
  } catch (err) {
    console.error('Error al eliminar apartado de Neon:', err);
    return false;
  }
}

