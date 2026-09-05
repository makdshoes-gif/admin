import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let sqlClient: NeonQueryFunction<false, false> | null = null;
let isInitialized = false;

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

    // 7. Table for Stock Movements (flexible JSONB payload, matches src/types.ts StockMovement)
    await sql`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 8. Table for Daily Cash Closures (flexible JSONB payload, matches src/types.ts DailyCashClosure)
    await sql`
      CREATE TABLE IF NOT EXISTS daily_closures (
        id VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        fecha VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 9. Key/value table for small global settings: accounts, admin_pin, exchange_rate, bcv_info, currency_purchases
    await sql`
      CREATE TABLE IF NOT EXISTS store_settings (
        key VARCHAR(50) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    isInitialized = true;
    console.log('✅ Esquema Neon PostgreSQL verificado e inicializado correctamente.');
  } catch (error) {
    console.error('Error al inicializar tablas en Neon:', error);
  }
}

// ---------- Store Settings (accounts, admin_pin, exchange_rate, etc.) ----------

const DEFAULT_ACCOUNTS = [
  { id: 'acc-1', nombre: 'Efectivo USD', moneda: 'USD', saldo: 0.0, icono: 'Banknote' },
  { id: 'acc-2', nombre: 'Efectivo Bs', moneda: 'Bs', saldo: 0.0, icono: 'Banknote' },
  { id: 'acc-3', nombre: 'Pago Móvil (BDV)', moneda: 'Bs', saldo: 0.0, icono: 'Smartphone' },
  { id: 'acc-pos', nombre: 'Punto de Venta', moneda: 'Bs', saldo: 0.0, icono: 'CreditCard' },
  { id: 'acc-4', nombre: 'Zelle', moneda: 'USD', saldo: 0.0, icono: 'CreditCard' },
  { id: 'acc-5', nombre: 'Binance USDT', moneda: 'USD', saldo: 0.0, icono: 'Coins' },
  { id: 'acc-6', nombre: 'Cashea', moneda: 'USD', saldo: 0.0, icono: 'CircleDollarSign' },
];

const SETTING_DEFAULTS: Record<string, unknown> = {
  accounts: DEFAULT_ACCOUNTS,
  admin_pin: '1234',
  exchange_rate: 68.5,
  bcv_info: null,
  currency_purchases: [],
};

export async function getStoreSetting<T = unknown>(key: string): Promise<T> {
  const sql = getNeonSql();
  const fallback = (SETTING_DEFAULTS[key] ?? null) as T;
  if (!sql) return fallback;

  try {
    await initDatabaseSchema();
    const rows = await sql`SELECT value FROM store_settings WHERE key = ${key}`;
    if (rows.length === 0) return fallback;
    return rows[0].value as T;
  } catch (err) {
    console.error(`Error leyendo store_settings[${key}]:`, err);
    return fallback;
  }
}

export async function setStoreSetting(key: string, value: unknown): Promise<void> {
  const sql = getNeonSql();
  if (!sql) throw new Error('DATABASE_URL no configurada en Neon');

  await initDatabaseSchema();
  await sql`
    INSERT INTO store_settings (key, value, updated_at)
    VALUES (${key}, ${JSON.stringify(value)}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
  `;
}

// ---------- Stock Movements ----------

export async function getStockMovements(): Promise<any[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  try {
    await initDatabaseSchema();
    const rows = await sql`SELECT data FROM stock_movements ORDER BY fecha DESC, created_at DESC`;
    return rows.map((r: any) => r.data);
  } catch (err) {
    console.error('Error leyendo stock_movements:', err);
    return [];
  }
}

export async function addStockMovement(movement: any): Promise<void> {
  const sql = getNeonSql();
  if (!sql) throw new Error('DATABASE_URL no configurada en Neon');
  await initDatabaseSchema();
  await sql`
    INSERT INTO stock_movements (id, data, fecha)
    VALUES (${movement.id}, ${JSON.stringify(movement)}, ${movement.fecha || new Date().toISOString()})
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
  `;
}

export async function replaceStockMovements(movements: any[]): Promise<void> {
  const sql = getNeonSql();
  if (!sql) throw new Error('DATABASE_URL no configurada en Neon');
  await initDatabaseSchema();
  await sql`DELETE FROM stock_movements`;
  for (const m of movements) {
    await sql`
      INSERT INTO stock_movements (id, data, fecha)
      VALUES (${m.id}, ${JSON.stringify(m)}, ${m.fecha || new Date().toISOString()})
      ON CONFLICT (id) DO NOTHING;
    `;
  }
}

// ---------- Daily Cash Closures ----------

export async function getDailyClosures(): Promise<any[]> {
  const sql = getNeonSql();
  if (!sql) return [];
  try {
    await initDatabaseSchema();
    const rows = await sql`SELECT data FROM daily_closures ORDER BY created_at DESC`;
    return rows.map((r: any) => r.data);
  } catch (err) {
    console.error('Error leyendo daily_closures:', err);
    return [];
  }
}

export async function addDailyClosure(closure: any): Promise<void> {
  const sql = getNeonSql();
  if (!sql) throw new Error('DATABASE_URL no configurada en Neon');
  await initDatabaseSchema();
  await sql`
    INSERT INTO daily_closures (id, data, fecha)
    VALUES (${closure.id}, ${JSON.stringify(closure)}, ${closure.fecha || null})
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data;
  `;
}

export async function replaceDailyClosures(closures: any[]): Promise<void> {
  const sql = getNeonSql();
  if (!sql) throw new Error('DATABASE_URL no configurada en Neon');
  await initDatabaseSchema();
  await sql`DELETE FROM daily_closures`;
  for (const c of closures) {
    await sql`
      INSERT INTO daily_closures (id, data, fecha)
      VALUES (${c.id}, ${JSON.stringify(c)}, ${c.fecha || null})
      ON CONFLICT (id) DO NOTHING;
    `;
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

