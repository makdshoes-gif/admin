-- Ejecuta esto en el SQL Editor de Neon. No borra nada de lo que ya tienes.

ALTER TABLE productos ADD COLUMN IF NOT EXISTS marca TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tipo TEXT;   -- Calzado, Ropa, Accesorios, Otro...
ALTER TABLE productos ADD COLUMN IF NOT EXISTS talla TEXT;  -- ej: "38", "M", "Único"
