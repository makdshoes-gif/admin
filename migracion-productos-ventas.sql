-- Ejecuta esto en el SQL Editor de Neon. No borra nada de lo que ya tienes.

CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  sku TEXT,
  categoria TEXT,
  moneda TEXT NOT NULL DEFAULT 'Bs' CHECK (moneda IN ('Bs', 'USD')),
  precio NUMERIC(14,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos (activo);

CREATE TABLE IF NOT EXISTS ventas (
  id SERIAL PRIMARY KEY,
  moneda TEXT NOT NULL DEFAULT 'Bs' CHECK (moneda IN ('Bs', 'USD')),
  total NUMERIC(14,2) NOT NULL,
  cuenta TEXT NOT NULL,
  cliente_nombre TEXT,
  fecha DATE NOT NULL,
  transaccion_id INTEGER REFERENCES transacciones(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS venta_items (
  id SERIAL PRIMARY KEY,
  venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id),
  nombre_producto TEXT NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(14,2) NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_venta_items_venta ON venta_items (venta_id);
