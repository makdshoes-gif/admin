-- Ejecuta esto en el SQL Editor de Neon. No borra nada de lo que ya tienes.

ALTER TABLE facturas ADD COLUMN IF NOT EXISTS cliente_apellido TEXT;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS numero_recibo TEXT;      -- factura/recibo manual (independiente del numeroControl del SENIAT)
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS aplica_iva BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS descuento NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Permite emitir un "recibo" simple (sin pasar por el proveedor SENIAT) mientras
-- ese proveedor no esté contratado/configurado todavía.
ALTER TABLE facturas DROP CONSTRAINT IF EXISTS facturas_estado_check;
ALTER TABLE facturas ADD CONSTRAINT facturas_estado_check CHECK (estado IN ('emitida', 'error', 'enviada_correo', 'recibo_manual'));
