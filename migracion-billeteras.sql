-- Ejecuta esto en el SQL Editor de Neon. No borra nada de lo que ya tienes.

-- 1. Agregar columna de moneda a las cuentas (todo lo que ya existe queda como 'Bs')
ALTER TABLE cuentas ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'Bs' CHECK (moneda IN ('Bs', 'USD'));

-- 2. Si tenías "Zelle" registrada como cuenta en bolívares, la pasamos a USD (Zelle es en dólares)
UPDATE cuentas SET moneda = 'USD' WHERE nombre = 'Zelle';

-- 3. Agregar las cuentas nuevas en dólares (si no existen ya)
INSERT INTO cuentas (nombre, moneda) VALUES
  ('Binance', 'USD'), ('Divisas', 'USD')
ON CONFLICT (nombre) DO NOTHING;

-- 4. Tabla para registrar los cambios de divisa (compra/venta de dólares)
CREATE TABLE IF NOT EXISTS cambios_divisa (
  id SERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'venta')),
  monto_bs NUMERIC(14,2) NOT NULL,
  monto_usd NUMERIC(14,2) NOT NULL,
  tasa NUMERIC(14,4) NOT NULL,
  cuenta_bs TEXT NOT NULL,
  cuenta_usd TEXT NOT NULL,
  fecha DATE NOT NULL,
  justificacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Agregar columna de moneda a las transacciones (todo lo que ya tienes queda como 'Bs', que es correcto)
ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'Bs' CHECK (moneda IN ('Bs', 'USD'));

-- 6. Columna para vincular las 2 transacciones que nacen de un mismo cambio de divisa
ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS cambio_id INTEGER REFERENCES cambios_divisa(id);

-- 7. Índice para poder filtrar rápido por moneda
CREATE INDEX IF NOT EXISTS idx_transacciones_moneda ON transacciones (moneda);
