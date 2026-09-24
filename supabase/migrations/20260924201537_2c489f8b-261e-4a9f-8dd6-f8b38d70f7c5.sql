CREATE OR REPLACE FUNCTION public.rdv_history_record(_rdv uuid, _action text, _changes jsonb, _snapshot jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _last public.rdv_history; _m jsonb; g text; _a jsonb; _r jsonb; _common jsonb;
BEGIN
  IF _action = 'update' AND (_changes IS NULL OR _changes = '{}'::jsonb) THEN RETURN; END IF;
  IF _action = 'update' THEN
    SELECT * INTO _last FROM public.rdv_history
      WHERE rdv_id = _rdv AND user_id IS NOT DISTINCT FROM _uid AND action IN ('create','update')
        AND created_at > now() - interval '15 seconds'
      ORDER BY created_at DESC LIMIT 1;
    IF FOUND THEN
      IF _last.action = 'create' THEN RETURN; END IF;
      -- scalar fields: keep first old, latest new
      SELECT COALESCE(jsonb_object_agg(k, CASE WHEN _last.changes ? k AND _changes ? k
            THEN jsonb_build_object('old', _last.changes->k->'old', 'new', _changes->k->'new')
            ELSE COALESCE(_changes->k, _last.changes->k) END), '{}'::jsonb)
        INTO _m
        FROM (SELECT jsonb_object_keys(_last.changes) k UNION SELECT jsonb_object_keys(_changes)) s
        WHERE k NOT LIKE '%\_ajoutes' AND k NOT LIKE '%\_retires';
      -- drop scalar fields back to original value
      SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb) INTO _m
        FROM jsonb_each(_m) WHERE (value->'old') IS DISTINCT FROM (value->'new');
      -- actor sets: union, then cancel items both added and removed
      FOREACH g IN ARRAY ARRAY['responsables','intervenants'] LOOP
        SELECT COALESCE(jsonb_agg(DISTINCT x), '[]'::jsonb) INTO _a FROM (
          SELECT jsonb_array_elements(COALESCE(_last.changes->(g||'_ajoutes')->'new','[]')) x
          UNION ALL SELECT jsonb_array_elements(COALESCE(_changes->(g||'_ajoutes')->'new','[]'))) s;
        SELECT COALESCE(jsonb_agg(DISTINCT x), '[]'::jsonb) INTO _r FROM (
          SELECT jsonb_array_elements(COALESCE(_last.changes->(g||'_retires')->'new','[]')) x
          UNION ALL SELECT jsonb_array_elements(COALESCE(_changes->(g||'_retires')->'new','[]'))) s;
        SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO _common FROM jsonb_array_elements(_a) x WHERE _r @> jsonb_build_array(x);
        SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO _a FROM jsonb_array_elements(_a) x WHERE NOT _common @> jsonb_build_array(x);
        SELECT COALESCE(jsonb_agg(x), '[]'::jsonb) INTO _r FROM jsonb_array_elements(_r) x WHERE NOT _common @> jsonb_build_array(x);
        IF jsonb_array_length(_a) > 0 THEN _m := _m || jsonb_build_object(g||'_ajoutes', jsonb_build_object('old', NULL, 'new', _a)); END IF;
        IF jsonb_array_length(_r) > 0 THEN _m := _m || jsonb_build_object(g||'_retires', jsonb_build_object('old', NULL, 'new', _r)); END IF;
      END LOOP;
      IF _m = '{}'::jsonb THEN
        DELETE FROM public.rdv_history WHERE id = _last.id;
      ELSE
        UPDATE public.rdv_history SET changes = _m WHERE id = _last.id;
      END IF;
      RETURN;
    END IF;
  END IF;
  INSERT INTO public.rdv_history(rdv_id, action, user_id, user_name, changes, snapshot)
  VALUES (_rdv, _action, _uid, public.rdv_history_actor_name(_uid), COALESCE(_changes,'{}'::jsonb), _snapshot);
END $$;
REVOKE EXECUTE ON FUNCTION public.rdv_history_record(uuid,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;

-- Remove already-recorded bogus entries where an actor was both added and removed
DELETE FROM public.rdv_history h WHERE action='update' AND NOT EXISTS (
  SELECT 1 FROM jsonb_each(h.changes) e
  WHERE e.key NOT IN ('responsables_ajoutes','responsables_retires','intervenants_ajoutes','intervenants_retires')
) AND COALESCE(h.changes->'responsables_ajoutes'->'new','[]') = COALESCE(h.changes->'responsables_retires'->'new','[]')
  AND COALESCE(h.changes->'intervenants_ajoutes'->'new','[]') = COALESCE(h.changes->'intervenants_retires'->'new','[]');