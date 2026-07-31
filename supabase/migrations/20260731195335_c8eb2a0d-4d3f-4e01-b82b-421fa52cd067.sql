ALTER TABLE public.assistant_conversations
  ADD COLUMN IF NOT EXISTS hermes_session_id text,
  ADD COLUMN IF NOT EXISTS assistant text NOT NULL DEFAULT 'powertech';

-- Fusion des conversations existantes : on garde la plus ancienne par utilisateur
WITH keep AS (
  SELECT DISTINCT ON (user_id) user_id, id
  FROM public.assistant_conversations
  ORDER BY user_id, created_at ASC
)
UPDATE public.assistant_messages m
   SET conversation_id = k.id
  FROM public.assistant_conversations c
  JOIN keep k ON k.user_id = c.user_id
 WHERE m.conversation_id = c.id
   AND c.id <> k.id;

WITH keep AS (
  SELECT DISTINCT ON (user_id) user_id, id
  FROM public.assistant_conversations
  ORDER BY user_id, created_at ASC
)
UPDATE public.hermes_jobs j
   SET conversation_id = k.id
  FROM public.assistant_conversations c
  JOIN keep k ON k.user_id = c.user_id
 WHERE j.conversation_id = c.id
   AND c.id <> k.id;

WITH keep AS (
  SELECT DISTINCT ON (user_id) user_id, id
  FROM public.assistant_conversations
  ORDER BY user_id, created_at ASC
)
DELETE FROM public.assistant_conversations c
 USING keep k
 WHERE k.user_id = c.user_id
   AND c.id <> k.id;

CREATE UNIQUE INDEX IF NOT EXISTS assistant_conversations_user_assistant_key
  ON public.assistant_conversations (user_id, assistant);