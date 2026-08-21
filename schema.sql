-- Ejecuta esto una vez en tu base de datos Neon (tienen un editor SQL en su dashboard: "SQL Editor")
-- Si ya tenías la base de datos creada de antes, usa migracion-billeteras.sql en vez de este archivo.

CREATE TABLE IF NOT EXISTS cuentas (
  id SERIAL PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'Bs' CHECK (moneda IN ('Bs', 'USD'))
);

INSERT INTO cuentas (nombre, moneda) VALUES
  ('Efectivo', 'Bs'), ('Pago Móvil', 'Bs'), ('Banco', 'Bs'),
  ('Binance', 'USD'), ('Zelle', 'USD'), ('Divisas', 'USD')
ON CONFLICT (nombre) DO NOTHING;

CREATE TABLE IF NOT EXISTS cambios_divisa (
  id SERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'venta')), -- compra = Bs->USD, venta = USD->Bs
  monto_bs NUMERIC(14,2) NOT NULL,
  monto_usd NUMERIC(14,2) NOT NULL,
  tasa NUMERIC(14,4) NOT NULL,
  cuenta_bs TEXT NOT NULL,
  cuenta_usd TEXT NOT NULL,
  fecha DATE NOT NULL,
  justificacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transacciones (
  id SERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  moneda TEXT NOT NULL DEFAULT 'Bs' CHECK (moneda IN ('Bs', 'USD')),
  monto NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  cuenta TEXT NOT NULL,
  categoria TEXT NOT NULL,
  justificacion TEXT NOT NULL,
  fecha DATE NOT NULL,
  origen TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'bdv_auto', 'banco_importado', 'cambio_divisa' o 'cashea'
  referencia_bdv TEXT, -- para no duplicar movimientos ya conciliados o importados
  orden_cashea TEXT, -- número de orden de Cashea, para no confirmar el mismo pago dos veces
  cambio_id INTEGER REFERENCES cambios_divisa(id), -- si nació de un cambio de divisa, vincula ambos lados
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON transacciones (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_transacciones_moneda ON transacciones (moneda);

ALTER TABLE transacciones ADD CONSTRAINT uq_transacciones_referencia_bdv UNIQUE (referencia_bdv);
ALTER TABLE transacciones ADD CONSTRAINT uq_transacciones_orden_cashea UNIQUE (orden_cashea);

-- ---------- Productos e inventario ----------

CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  sku TEXT,
  categoria TEXT,
  marca TEXT,
  tipo TEXT,   -- Calzado, Ropa, Accesorios, Otro...
  talla TEXT,  -- ej: "38", "M", "Único"
  moneda TEXT NOT NULL DEFAULT 'Bs' CHECK (moneda IN ('Bs', 'USD')),
  precio NUMERIC(14,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 0, -- para alertas de reposición
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos (activo);

-- ---------- Ventas (una venta puede tener varios productos) ----------

CREATE TABLE IF NOT EXISTS ventas (
  id SERIAL PRIMARY KEY,
  moneda TEXT NOT NULL DEFAULT 'Bs' CHECK (moneda IN ('Bs', 'USD')),
  subtotal NUMERIC(14,2),
  descuento NUMERIC(14,2) NOT NULL DEFAULT 0,
  aplica_iva BOOLEAN NOT NULL DEFAULT false,
  porcentaje_iva NUMERIC(5,2) NOT NULL DEFAULT 16,
  iva_monto NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL,
  cuenta TEXT NOT NULL,
  cliente_nombre TEXT,
  cliente_apellido TEXT,
  numero_factura TEXT, -- número de factura o recibo, escrito por la cajera
  fecha DATE NOT NULL,
  transaccion_id INTEGER REFERENCES transacciones(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS venta_items (
  id SERIAL PRIMARY KEY,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id),
  nombre_producto TEXT NOT NULL, -- copia del nombre al momento de la venta, por si el producto cambia o se borra después
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(14,2) NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_venta_items_venta ON venta_items (venta_id);

-- ---------- Tasa de cambio BCV (guardada manualmente, se sugiere sola en Cambio de divisa) ----------

CREATE TABLE IF NOT EXISTS tasas_cambio (
  id SERIAL PRIMARY KEY,
  tasa NUMERIC(14,4) NOT NULL,
  fecha_publicacion DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasas_cambio_fecha ON tasas_cambio (fecha_publicacion DESC, created_at DESC);

-- ---------- Facturas (SENIAT) ----------

CREATE TABLE IF NOT EXISTS facturas (
  id SERIAL PRIMARY KEY,
  venta_id INTEGER NOT NULL REFERENCES ventas(id),
  numero_control TEXT,       -- N° de control fiscal, lo asigna el proveedor SENIAT
  numero_recibo TEXT,        -- factura/recibo manual, independiente del numeroControl
  rango_asignado TEXT,
  fecha_asignacion TEXT,
  codigo_respuesta TEXT,
  mensaje_respuesta TEXT,
  cliente_rif TEXT,
  cliente_nombre TEXT,
  cliente_apellido TEXT,
  cliente_direccion TEXT,
  cliente_telefono TEXT,
  cliente_correo TEXT,
  aplica_iva BOOLEAN NOT NULL DEFAULT true,
  descuento NUMERIC(14,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'emitida' CHECK (estado IN ('emitida', 'error', 'enviada_correo', 'recibo_manual')),
  respuesta_cruda JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facturas_venta ON facturas (venta_id);
