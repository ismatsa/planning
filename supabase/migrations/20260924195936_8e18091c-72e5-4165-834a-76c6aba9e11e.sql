CREATE TABLE public.rdv_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rdv_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create','update','delete')),
  user_id uuid,
  user_name text,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rdv_history_rdv_idx ON public.rdv_history(rdv_id, created_at DESC);
GRANT SELECT ON public.rdv_history TO authenticated;
GRANT ALL ON public.rdv_history TO service_role;
ALTER TABLE public.rdv_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read rdv history" ON public.rdv_history FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.rdv_history_actor_name(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(p.company,''), p.email) FROM public.profiles p WHERE p.id = _uid
$$;
REVOKE EXECUTE ON FUNCTION public.rdv_history_actor_name(uuid) FROM PUBLIC, anon, authenticated;

-- Merge into recent event of same user (same save) or insert
CREATE OR REPLACE FUNCTION public.rdv_history_record(_rdv uuid, _action text, _changes jsonb, _snapshot jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _last public.rdv_history;
BEGIN
  IF _action = 'update' AND (_changes IS NULL OR _changes = '{}'::jsonb) THEN RETURN; END IF;
  IF _action = 'update' THEN
    SELECT * INTO _last FROM public.rdv_history
      WHERE rdv_id = _rdv AND user_id IS NOT DISTINCT FROM _uid AND action IN ('create','update')
        AND created_at > now() - interval '15 seconds'
      ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN
      IF _last.action = 'create' THEN RETURN; END IF;
      UPDATE public.rdv_history SET changes = (
        SELECT jsonb_object_agg(k, CASE WHEN _last.changes ? k AND _changes ? k
            THEN jsonb_build_object('old', _last.changes->k->'old', 'new', _changes->k->'new')
            ELSE COALESCE(_changes->k, _last.changes->k) END)
        FROM (SELECT jsonb_object_keys(_last.changes) k UNION SELECT jsonb_object_keys(_changes)) s
      ) WHERE id = _last.id;
      RETURN;
    END IF;
  END IF;
  INSERT INTO public.rdv_history(rdv_id, action, user_id, user_name, changes, snapshot)
  VALUES (_rdv, _action, _uid, public.rdv_history_actor_name(_uid), COALESCE(_changes,'{}'::jsonb), _snapshot);
END $$;
REVOKE EXECUTE ON FUNCTION public.rdv_history_record(uuid,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rdv_history_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o jsonb; _n jsonb; _c jsonb := '{}'::jsonb; k text;
  _fields text[] := ARRAY['poste_id','debut','fin','client_nom','client_tel','notes','statut','marque','modele','annee','vin','billing_responsible_user_id','client_id','vehicule_id'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.rdv_history_record(NEW.id, 'create', '{}'::jsonb, to_jsonb(NEW)); RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.rdv_history_record(OLD.id, 'delete', '{}'::jsonb, to_jsonb(OLD)); RETURN OLD;
  END IF;
  _o := to_jsonb(OLD); _n := to_jsonb(NEW);
  FOREACH k IN ARRAY _fields LOOP
    IF (_o->k) IS DISTINCT FROM (_n->k) THEN
      _c := _c || jsonb_build_object(k, jsonb_build_object('old', _o->k, 'new', _n->k));
    END IF;
  END LOOP;
  PERFORM public.rdv_history_record(NEW.id, 'update', _c, NULL);
  RETURN NEW;
END $$;
CREATE TRIGGER rdv_history_trigger AFTER INSERT OR UPDATE OR DELETE ON public.rendez_vous
FOR EACH ROW EXECUTE FUNCTION public.rdv_history_trg();

-- Actors (responsables / intervenants)
CREATE OR REPLACE FUNCTION public.rdv_actor_history_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _rdv uuid; _key text; _val text; _added boolean := TG_OP = 'INSERT';
BEGIN
  IF TG_TABLE_NAME = 'appointment_responsibles' THEN
    _key := 'responsables';
    _rdv := CASE WHEN _added THEN NEW.appointment_id ELSE OLD.appointment_id END;
    _val := CASE WHEN _added THEN NEW.user_id::text ELSE OLD.user_id::text END;
  ELSE
    _key := 'intervenants';
    _rdv := CASE WHEN _added THEN NEW.appointment_id ELSE OLD.appointment_id END;
    _val := CASE WHEN _added THEN NEW.intervenant_id::text ELSE OLD.intervenant_id::text END;
  END IF;
  -- skip when parent appointment is being deleted
  IF NOT EXISTS (SELECT 1 FROM public.rendez_vous WHERE id = _rdv) THEN RETURN NULL; END IF;
  PERFORM public.rdv_history_record(_rdv, 'update',
    jsonb_build_object(_key || CASE WHEN _added THEN '_ajoutes' ELSE '_retires' END,
      jsonb_build_object('old', NULL, 'new', jsonb_build_array(_val))), NULL);
  RETURN NULL;
END $$;
CREATE TRIGGER rdv_resp_history AFTER INSERT OR DELETE ON public.appointment_responsibles
FOR EACH ROW EXECUTE FUNCTION public.rdv_actor_history_trg();
CREATE TRIGGER rdv_interv_history AFTER INSERT OR DELETE ON public.appointment_intervenants
FOR EACH ROW EXECUTE FUNCTION public.rdv_actor_history_trg();
REVOKE EXECUTE ON FUNCTION public.rdv_history_trg() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rdv_actor_history_trg() FROM PUBLIC, anon, authenticated;