ALTER TABLE public.devis ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

CREATE OR REPLACE FUNCTION public.devis_track_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status_changed_at := now();
    IF NEW.statut = 'envoye' AND NEW.sent_at IS NULL THEN
      NEW.sent_at := now();
    END IF;
  ELSIF NEW.statut IS DISTINCT FROM OLD.statut THEN
    NEW.status_changed_at := now();
    IF NEW.statut = 'envoye' AND NEW.sent_at IS NULL THEN
      NEW.sent_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS devis_track_status_change ON public.devis;
CREATE TRIGGER devis_track_status_change
BEFORE INSERT OR UPDATE ON public.devis
FOR EACH ROW EXECUTE FUNCTION public.devis_track_status_change();
