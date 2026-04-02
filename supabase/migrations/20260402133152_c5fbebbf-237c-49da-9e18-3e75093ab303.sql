ALTER TABLE public.devis_lines ADD COLUMN discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.devis_lines ADD COLUMN discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0;