ALTER TABLE public.postes ADD COLUMN IF NOT EXISTS color_hex text;

ALTER TABLE public.postes
  ADD CONSTRAINT postes_color_hex_format
  CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9A-Fa-f]{6}$');