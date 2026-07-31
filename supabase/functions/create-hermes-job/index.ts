// Edge Function appelée UNIQUEMENT par le chatbot Lovable (utilisateur connecté).
// Vérifie l'utilisateur + son rôle, valide les fichiers privés, crée une tâche Hermes.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const ALLOWED_HINTS = [
  'devis', 'reference_piece', 'client_vehicule', 'creer_rdv', 'modifier_rdv', 'libre',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) return json({ error: 'unauthorized' }, 401);
  const userId = claimsData.claims.sub as string;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Compte actif ?
  const { data: profile } = await admin
    .from('profiles').select('active').eq('id', userId).maybeSingle();
  if (profile && profile.active === false) return json({ error: 'account_disabled' }, 403);

  const { data: roles } = await admin
    .from('user_roles').select('role').eq('user_id', userId);
  const userRole = roles?.some((r: any) => r.role === 'administrateur')
    ? 'administrateur' : 'contributeur';

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }

  const message = String(body.message ?? '').slice(0, 8000);
  const actionHint = ALLOWED_HINTS.includes(body.action_hint) ? body.action_hint : 'libre';
  const idempotencyKey = String(body.idempotency_key ?? crypto.randomUUID()).slice(0, 200);
  const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 10) : [];

  if (!message.trim() && attachments.length === 0) {
    return json({ error: 'empty_request' }, 400);
  }

  // Conversation résolue côté serveur : une seule session active par utilisateur.
  // Le conversation_id / hermes_session_id envoyés par le frontend sont ignorés.
  const ASSISTANT = 'powertech';
  let conversationId: string | null = null;
  {
    const { data: conv } = await admin
      .from('assistant_conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('assistant', ASSISTANT)
      .maybeSingle();
    conversationId = conv?.id ?? null;
    if (!conversationId) {
      const { data: created, error: convError } = await admin
        .from('assistant_conversations')
        .insert({ user_id: userId, assistant: ASSISTANT, title: 'Assistant Powertech' })
        .select('id')
        .single();
      if (convError) {
        // Course entre deux onglets : on relit la conversation existante
        const { data: again } = await admin
          .from('assistant_conversations')
          .select('id').eq('user_id', userId).eq('assistant', ASSISTANT).maybeSingle();
        conversationId = again?.id ?? null;
      } else {
        conversationId = created?.id ?? null;
      }
    }
  }
  if (!conversationId) return json({ error: 'conversation_unavailable' }, 500);

  // Les fichiers doivent être dans le dossier privé de l'utilisateur
  const safeAttachments: any[] = [];
  for (const a of attachments) {
    const path = String(a?.path ?? '');
    if (!path.startsWith(`${userId}/`)) return json({ error: 'forbidden_attachment' }, 403);
    safeAttachments.push({
      path,
      name: String(a?.name ?? 'fichier').slice(0, 200),
      type: String(a?.type ?? ''),
      size: Number(a?.size ?? 0),
    });
  }

  // Idempotence : renvoie la tâche existante
  const { data: existing } = await admin
    .from('hermes_jobs').select('id, status')
    .eq('user_id', userId).eq('idempotency_key', idempotencyKey).maybeSingle();
  if (existing) return json({ job_id: existing.id, status: existing.status, duplicate: true });

  const { data: job, error } = await admin
    .from('hermes_jobs')
    .insert({
      user_id: userId,
      user_role: userRole,
      conversation_id: conversationId,
      message,
      action_hint: actionHint,
      attachments: safeAttachments,
      idempotency_key: idempotencyKey,
      status: 'queued',
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    })
    .select('id, status')
    .single();

  if (error || !job) {
    console.error('insert job failed', error);
    return json({ error: 'job_creation_failed' }, 500);
  }

  await admin.from('assistant_audit_logs').insert({
    user_id: userId,
    job_id: job.id,
    action: 'assistant.job_created',
    resource: 'hermes_jobs',
    record_id: job.id,
    new_value: { action_hint: actionHint, attachments: safeAttachments.length },
    result: 'success',
  });

  // Position dans la file (jamais exposée en détail au frontend)
  const { count } = await admin
    .from('hermes_jobs')
    .select('id', { count: 'exact', head: true })
    .in('status', ['queued', 'processing']);

  return json({ job_id: job.id, status: job.status, conversation_id: conversationId, queued: (count ?? 1) > 1 });
});
