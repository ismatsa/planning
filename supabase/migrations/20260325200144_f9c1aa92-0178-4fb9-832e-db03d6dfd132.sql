
CREATE TABLE public.appointment_responsibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.rendez_vous(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(appointment_id, user_id)
);

CREATE TABLE public.appointment_intervenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.rendez_vous(id) ON DELETE CASCADE,
  intervenant_id uuid NOT NULL REFERENCES public.intervenants(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(appointment_id, intervenant_id)
);

ALTER TABLE public.appointment_responsibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_intervenants ENABLE ROW LEVEL SECURITY;

-- RLS for appointment_responsibles
CREATE POLICY "Authenticated can read appointment_responsibles"
  ON public.appointment_responsibles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert appointment_responsibles"
  ON public.appointment_responsibles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update appointment_responsibles"
  ON public.appointment_responsibles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete appointment_responsibles"
  ON public.appointment_responsibles FOR DELETE TO authenticated USING (true);

-- RLS for appointment_intervenants
CREATE POLICY "Authenticated can read appointment_intervenants"
  ON public.appointment_intervenants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert appointment_intervenants"
  ON public.appointment_intervenants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update appointment_intervenants"
  ON public.appointment_intervenants FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete appointment_intervenants"
  ON public.appointment_intervenants FOR DELETE TO authenticated USING (true);
