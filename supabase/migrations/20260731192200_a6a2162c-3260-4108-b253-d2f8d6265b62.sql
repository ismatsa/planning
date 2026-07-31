
-- ========== assistant_conversations ==========
CREATE TABLE public.assistant_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Nouvelle conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_conversations TO authenticated;
GRANT ALL ON public.assistant_conversations TO service_role;
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own conversations select" ON public.assistant_conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own conversations insert" ON public.assistant_conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own conversations update" ON public.assistant_conversations FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own conversations delete" ON public.assistant_conversations FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER trg_assistant_conversations_updated
  BEFORE UPDATE ON public.assistant_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== assistant_messages ==========
CREATE TABLE public.assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL DEFAULT '',
  status text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  job_id uuid,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_assistant_messages_conv ON public.assistant_messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_messages TO authenticated;
GRANT ALL ON public.assistant_messages TO service_role;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages select" ON public.assistant_messages FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own messages insert" ON public.assistant_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own messages update" ON public.assistant_messages FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own messages delete" ON public.assistant_messages FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ========== hermes_jobs ==========
CREATE TABLE public.hermes_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_role text NOT NULL,
  conversation_id uuid REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  action_hint text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','processing','needs_information','confirmation_required','completed','failed')),
  result jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  idempotency_key text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE UNIQUE INDEX idx_hermes_jobs_idem ON public.hermes_jobs(user_id, idempotency_key);
CREATE INDEX idx_hermes_jobs_queue ON public.hermes_jobs(status, created_at);
GRANT SELECT ON public.hermes_jobs TO authenticated;
GRANT ALL ON public.hermes_jobs TO service_role;
ALTER TABLE public.hermes_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own jobs select" ON public.hermes_jobs FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ========== assistant_audit_logs ==========
CREATE TABLE public.assistant_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  job_id uuid,
  action text NOT NULL,
  resource text,
  record_id text,
  old_value jsonb,
  new_value jsonb,
  result text NOT NULL DEFAULT 'success',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_assistant_audit_created ON public.assistant_audit_logs(created_at DESC);
GRANT SELECT ON public.assistant_audit_logs TO authenticated;
GRANT ALL ON public.assistant_audit_logs TO service_role;
ALTER TABLE public.assistant_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read assistant audit" ON public.assistant_audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'administrateur'));

-- ========== Realtime ==========
ALTER TABLE public.hermes_jobs REPLICA IDENTITY FULL;
ALTER TABLE public.assistant_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hermes_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assistant_messages;

-- ========== Claim atomique (une seule tâche à la fois) ==========
CREATE OR REPLACE FUNCTION public.hermes_claim_next_job()
RETURNS SETOF public.hermes_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  busy integer;
BEGIN
  -- Remise en file des tâches bloquées (> 10 min en traitement)
  UPDATE public.hermes_jobs
     SET status = 'queued', claimed_at = NULL, attempts = attempts + 1
   WHERE status = 'processing'
     AND claimed_at < now() - interval '10 minutes';

  SELECT count(*) INTO busy FROM public.hermes_jobs WHERE status = 'processing';
  IF busy > 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH nxt AS (
    SELECT id FROM public.hermes_jobs
     WHERE status = 'queued'
     ORDER BY created_at ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.hermes_jobs j
     SET status = 'processing', claimed_at = now()
    FROM nxt
   WHERE j.id = nxt.id
  RETURNING j.*;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.hermes_claim_next_job() FROM PUBLIC, anon, authenticated;

-- ========== Purge 24h (données + fichiers) ==========
CREATE OR REPLACE FUNCTION public.hermes_purge_expired()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  purged integer := 0;
  j record;
  att jsonb;
BEGIN
  FOR j IN SELECT * FROM public.hermes_jobs WHERE expires_at < now() LOOP
    FOR att IN SELECT jsonb_array_elements(j.attachments) LOOP
      DELETE FROM storage.objects
       WHERE bucket_id = 'hermes-temporary-files'
         AND name = (att->>'path');
    END LOOP;
    purged := purged + 1;
  END LOOP;

  DELETE FROM public.hermes_jobs WHERE expires_at < now();

  -- Filet de sécurité : tout objet du bucket de plus de 24h
  DELETE FROM storage.objects
   WHERE bucket_id = 'hermes-temporary-files'
     AND created_at < now() - interval '24 hours';

  RETURN purged;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.hermes_purge_expired() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'hermes-purge-expired-hourly',
  '17 * * * *',
  $$SELECT public.hermes_purge_expired();$$
);
