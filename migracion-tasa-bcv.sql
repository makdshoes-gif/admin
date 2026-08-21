-- Ejecuta esto en el SQL Editor de Neon. No borra nada de lo que ya tienes.

CREATE TABLE IF NOT EXISTS tasas_cambio (
  id SERIAL PRIMARY KEY,
  tasa NUMERIC(14,4) NOT NULL,
  fecha_publicacion DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasas_cambio_fecha ON tasas_cambio (fecha_publicacion DESC, created_at DESC);
