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
  ],
  expenses: ['monto', 'tasa_cambio', 'monto_usd', 'monto_bs'],
  bank_reconciliations: ['monto_bs', 'monto_usd'],
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
  databaseName?: string;
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

    // Check count of records
    const prodCount = await sql`SELECT COUNT(*) as count FROM shoe_products`;
    const salesCount = await sql`SELECT COUNT(*) as count FROM sales_transactions`;

    return {
      connected: true,
      message: 'Conectado exitosamente a la base de datos Neon PostgreSQL',
      databaseName: dbName,
      productsCount: Number(prodCount[0]?.count || 0),
      salesCount: Number(salesCount[0]?.count || 0),
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

    isInitialized = true;
    console.log('✅ Esquema Neon PostgreSQL verificado e inicializado correctamente.');
  } catch (error) {
    console.error('Error al inicializar tablas en Neon:', error);
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

