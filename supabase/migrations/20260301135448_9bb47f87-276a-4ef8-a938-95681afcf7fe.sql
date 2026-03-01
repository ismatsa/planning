ALTER TABLE public.rendez_vous DROP CONSTRAINT IF EXISTS rendez_vous_statut_check;
ALTER TABLE public.rendez_vous
ADD CONSTRAINT rendez_vous_statut_check
CHECK (statut IN ('prevu', 'confirme', 'annule', 'noshow', 'termine'));