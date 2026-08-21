-- Ejecuta esto en el SQL Editor de Neon. No borra nada de lo que ya tienes.

CREATE TABLE IF NOT EXISTS facturas (
  id SERIAL PRIMARY KEY,
  venta_id INTEGER NOT NULL REFERENCES ventas(id),
  numero_control TEXT,
  rango_asignado TEXT,
  fecha_asignacion TEXT,
  codigo_respuesta TEXT,
  mensaje_respuesta TEXT,
  cliente_rif TEXT,
  cliente_nombre TEXT,
  cliente_direccion TEXT,
  cliente_telefono TEXT,
  cliente_correo TEXT,
  estado TEXT NOT NULL DEFAULT 'emitida' CHECK (estado IN ('emitida', 'error', 'enviada_correo')),
  respuesta_cruda JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facturas_venta ON facturas (venta_id);
