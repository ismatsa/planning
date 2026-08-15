CREATE OR REPLACE FUNCTION public.save_planning_layout(p_items jsonb, p_expected_version timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v timestamptz;
  itm jsonb;
  i integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentification requise';
  END IF;

  INSERT INTO public.planning_layout_meta (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
  SELECT updated_at INTO v FROM public.planning_layout_meta WHERE id = 1 FOR UPDATE;

  IF p_expected_version IS NOT NULL AND v IS NOT NULL AND v > p_expected_version THEN
    RETURN jsonb_build_object('ok', false, 'conflict', true, 'version', v);
  END IF;

  DELETE FROM public.planning_layout_items WHERE true;

  FOR itm IN SELECT * FROM jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) LOOP
    INSERT INTO public.planning_layout_items (type, poste_id, metier_id, position, label)
    VALUES (
      itm->>'type',
      nullif(itm->>'poste_id', ''),
      nullif(itm->>'metier_id', ''),
      i,
      nullif(itm->>'label', '')
    );
    i := i + 1;
  END LOOP;

  UPDATE public.planning_layout_meta SET updated_at = now(), updated_by = auth.uid() WHERE id = 1;
  SELECT updated_at INTO v FROM public.planning_layout_meta WHERE id = 1;

  RETURN jsonb_build_object('ok', true, 'conflict', false, 'version', v);
END;
$function$;