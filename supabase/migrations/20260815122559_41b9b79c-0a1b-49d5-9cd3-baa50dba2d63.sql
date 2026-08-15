CREATE TABLE public.planning_layout_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL,
  poste_id text REFERENCES public.postes(id) ON DELETE CASCADE,
  metier_id text REFERENCES public.metiers(id) ON DELETE CASCADE,
  position integer NOT NULL,
  label text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT planning_layout_items_type_chk CHECK (type IN ('poste','small_separator','large_separator')),
  CONSTRAINT planning_layout_items_poste_chk CHECK (
    (type = 'poste' AND poste_id IS NOT NULL) OR (type <> 'poste' AND poste_id IS NULL)
  )
);

CREATE UNIQUE INDEX planning_layout_items_poste_unique ON public.planning_layout_items(poste_id) WHERE poste_id IS NOT NULL;
CREATE INDEX planning_layout_items_position_idx ON public.planning_layout_items(position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_layout_items TO authenticated;
GRANT ALL ON public.planning_layout_items TO service_role;

ALTER TABLE public.planning_layout_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read planning layout"
  ON public.planning_layout_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert planning layout"
  ON public.planning_layout_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update planning layout"
  ON public.planning_layout_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete planning layout"
  ON public.planning_layout_items FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_planning_layout_items_updated_at
  BEFORE UPDATE ON public.planning_layout_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.planning_layout_meta (
  id integer NOT NULL PRIMARY KEY DEFAULT 1,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT planning_layout_meta_singleton CHECK (id = 1)
);

GRANT SELECT ON public.planning_layout_meta TO authenticated;
GRANT ALL ON public.planning_layout_meta TO service_role;

ALTER TABLE public.planning_layout_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read planning layout meta"
  ON public.planning_layout_meta FOR SELECT TO authenticated USING (true);

INSERT INTO public.planning_layout_meta (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.save_planning_layout(p_items jsonb, p_expected_version timestamp with time zone DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  DELETE FROM public.planning_layout_items;

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
$$;

REVOKE EXECUTE ON FUNCTION public.save_planning_layout(jsonb, timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_planning_layout(jsonb, timestamp with time zone) TO authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.planning_layout_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.planning_layout_meta;