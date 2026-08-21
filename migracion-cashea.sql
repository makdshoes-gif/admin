-- Ejecuta esto en el SQL Editor de Neon. No borra nada de lo que ya tienes.

-- 1. Columna para guardar el número de orden de Cashea en la transacción que genera.
ALTER TABLE transacciones ADD COLUMN IF NOT EXISTS orden_cashea TEXT;

-- 2. Evitar confirmar la misma orden de Cashea dos veces (NULLs se permiten repetidos,
--    así que esto no afecta ninguna transacción que no venga de Cashea).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_transacciones_orden_cashea'
  ) THEN
    ALTER TABLE transacciones ADD CONSTRAINT uq_transacciones_orden_cashea UNIQUE (orden_cashea);
  END IF;
END $$;
