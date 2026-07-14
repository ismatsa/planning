
DROP POLICY IF EXISTS "Authenticated can delete devis_comments" ON public.devis_comments;
CREATE POLICY "Users can delete own devis_comments"
ON public.devis_comments FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own devis_comments"
ON public.devis_comments FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
