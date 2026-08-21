-- Ejecuta esto en el SQL Editor de Neon. No borra nada de lo que ya tienes.

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_apellido TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS numero_factura TEXT; -- número de factura o recibo, escrito por la cajera
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS aplica_iva BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS porcentaje_iva NUMERIC(5,2) NOT NULL DEFAULT 16;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS descuento NUMERIC(14,2) NOT NULL DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS subtotal NUMERIC(14,2);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS iva_monto NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Para las ventas que ya existían: el total que ya tenían pasa a ser también su subtotal
-- (no llevaban IVA ni descuento separado), así no se pierde ni se altera nada de lo ya registrado.
UPDATE ventas SET subtotal = total WHERE subtotal IS NULL;
