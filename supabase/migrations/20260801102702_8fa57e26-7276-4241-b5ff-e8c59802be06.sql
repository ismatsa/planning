CREATE TABLE public.notification_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  item_key text NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_reads TO authenticated;
GRANT ALL ON public.notification_reads TO service_role;

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own notification reads"
  ON public.notification_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users create their own notification reads"
  ON public.notification_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update their own notification reads"
  ON public.notification_reads FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete their own notification reads"
  ON public.notification_reads FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_notification_reads_user ON public.notification_reads(user_id);