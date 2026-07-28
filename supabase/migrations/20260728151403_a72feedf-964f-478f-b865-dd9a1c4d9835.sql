-- 1. user_permissions: restrict SELECT to admins or own row
DROP POLICY IF EXISTS "Authenticated can read permissions" ON public.user_permissions;
CREATE POLICY "Admins or self can read permissions"
ON public.user_permissions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'administrateur'::app_role) OR user_id = auth.uid());

-- 2. Replace always-true write policies with explicit authenticated-session checks
-- app_settings
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON public.app_settings;
CREATE POLICY "Authenticated users can insert settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.app_settings;
CREATE POLICY "Authenticated users can update settings" ON public.app_settings FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- appointment_intervenants
DROP POLICY IF EXISTS "Authenticated can insert appointment_intervenants" ON public.appointment_intervenants;
CREATE POLICY "Authenticated can insert appointment_intervenants" ON public.appointment_intervenants FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can update appointment_intervenants" ON public.appointment_intervenants;
CREATE POLICY "Authenticated can update appointment_intervenants" ON public.appointment_intervenants FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can delete appointment_intervenants" ON public.appointment_intervenants;
CREATE POLICY "Authenticated can delete appointment_intervenants" ON public.appointment_intervenants FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- appointment_responsibles
DROP POLICY IF EXISTS "Authenticated can insert appointment_responsibles" ON public.appointment_responsibles;
CREATE POLICY "Authenticated can insert appointment_responsibles" ON public.appointment_responsibles FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can update appointment_responsibles" ON public.appointment_responsibles;
CREATE POLICY "Authenticated can update appointment_responsibles" ON public.appointment_responsibles FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can delete appointment_responsibles" ON public.appointment_responsibles;
CREATE POLICY "Authenticated can delete appointment_responsibles" ON public.appointment_responsibles FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- devis
DROP POLICY IF EXISTS "Authenticated can insert devis" ON public.devis;
CREATE POLICY "Authenticated can insert devis" ON public.devis FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can update devis" ON public.devis;
CREATE POLICY "Authenticated can update devis" ON public.devis FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can delete devis" ON public.devis;
CREATE POLICY "Authenticated can delete devis" ON public.devis FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- devis_attachments
DROP POLICY IF EXISTS "Authenticated can insert devis_attachments" ON public.devis_attachments;
CREATE POLICY "Authenticated can insert devis_attachments" ON public.devis_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can delete devis_attachments" ON public.devis_attachments;
CREATE POLICY "Authenticated can delete devis_attachments" ON public.devis_attachments FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- devis_comments
DROP POLICY IF EXISTS "Authenticated can insert devis_comments" ON public.devis_comments;
CREATE POLICY "Authenticated can insert devis_comments" ON public.devis_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- devis_intervenants
DROP POLICY IF EXISTS "Authenticated can insert devis_intervenants" ON public.devis_intervenants;
CREATE POLICY "Authenticated can insert devis_intervenants" ON public.devis_intervenants FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can update devis_intervenants" ON public.devis_intervenants;
CREATE POLICY "Authenticated can update devis_intervenants" ON public.devis_intervenants FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can delete devis_intervenants" ON public.devis_intervenants;
CREATE POLICY "Authenticated can delete devis_intervenants" ON public.devis_intervenants FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- devis_lines
DROP POLICY IF EXISTS "Authenticated can insert devis_lines" ON public.devis_lines;
CREATE POLICY "Authenticated can insert devis_lines" ON public.devis_lines FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can update devis_lines" ON public.devis_lines;
CREATE POLICY "Authenticated can update devis_lines" ON public.devis_lines FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can delete devis_lines" ON public.devis_lines;
CREATE POLICY "Authenticated can delete devis_lines" ON public.devis_lines FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- devis_metiers
DROP POLICY IF EXISTS "Authenticated can insert devis_metiers" ON public.devis_metiers;
CREATE POLICY "Authenticated can insert devis_metiers" ON public.devis_metiers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can update devis_metiers" ON public.devis_metiers;
CREATE POLICY "Authenticated can update devis_metiers" ON public.devis_metiers FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can delete devis_metiers" ON public.devis_metiers;
CREATE POLICY "Authenticated can delete devis_metiers" ON public.devis_metiers FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- devis_responsibles
DROP POLICY IF EXISTS "Authenticated can insert devis_responsibles" ON public.devis_responsibles;
CREATE POLICY "Authenticated can insert devis_responsibles" ON public.devis_responsibles FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can update devis_responsibles" ON public.devis_responsibles;
CREATE POLICY "Authenticated can update devis_responsibles" ON public.devis_responsibles FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can delete devis_responsibles" ON public.devis_responsibles;
CREATE POLICY "Authenticated can delete devis_responsibles" ON public.devis_responsibles FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- disponibilite_postes
DROP POLICY IF EXISTS "Authenticated users can insert dispos" ON public.disponibilite_postes;
CREATE POLICY "Authenticated users can insert dispos" ON public.disponibilite_postes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update dispos" ON public.disponibilite_postes;
CREATE POLICY "Authenticated users can update dispos" ON public.disponibilite_postes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete dispos" ON public.disponibilite_postes;
CREATE POLICY "Authenticated users can delete dispos" ON public.disponibilite_postes FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- exception_disponibilites
DROP POLICY IF EXISTS "Authenticated users can insert exceptions" ON public.exception_disponibilites;
CREATE POLICY "Authenticated users can insert exceptions" ON public.exception_disponibilites FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update exceptions" ON public.exception_disponibilites;
CREATE POLICY "Authenticated users can update exceptions" ON public.exception_disponibilites FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete exceptions" ON public.exception_disponibilites;
CREATE POLICY "Authenticated users can delete exceptions" ON public.exception_disponibilites FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- postes
DROP POLICY IF EXISTS "Authenticated users can insert postes" ON public.postes;
CREATE POLICY "Authenticated users can insert postes" ON public.postes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update postes" ON public.postes;
CREATE POLICY "Authenticated users can update postes" ON public.postes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete postes" ON public.postes;
CREATE POLICY "Authenticated users can delete postes" ON public.postes FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- rdv_attachments
DROP POLICY IF EXISTS "Authenticated can insert rdv_attachments" ON public.rdv_attachments;
CREATE POLICY "Authenticated can insert rdv_attachments" ON public.rdv_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated can delete rdv_attachments" ON public.rdv_attachments;
CREATE POLICY "Authenticated can delete rdv_attachments" ON public.rdv_attachments FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- rendez_vous
DROP POLICY IF EXISTS "Authenticated users can insert rdvs" ON public.rendez_vous;
CREATE POLICY "Authenticated users can insert rdvs" ON public.rendez_vous FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can update rdvs" ON public.rendez_vous;
CREATE POLICY "Authenticated users can update rdvs" ON public.rendez_vous FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authenticated users can delete rdvs" ON public.rendez_vous;
CREATE POLICY "Authenticated users can delete rdvs" ON public.rendez_vous FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- 3. SECURITY DEFINER functions: remove execute rights from anonymous/public
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;