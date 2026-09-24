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
        SELECT jsonb_object_agg(k, CASE
            WHEN _last.changes ? k AND _changes ? k AND (k LIKE '%\_ajoutes' OR k LIKE '%\_retires')
              THEN jsonb_build_object('old', NULL, 'new', (_last.changes->k->'new') || (_changes->k->'new'))
            WHEN _last.changes ? k AND _changes ? k
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