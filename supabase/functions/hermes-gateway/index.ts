// Passerelle sécurisée pour le profil Hermes externe (polling sortant).
// Authentification : header `x-hermes-token` == secret HERMES_GATEWAY_TOKEN.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { resolveAssistantContent, buildResultPayload, STATUS_LABELS } from './content.ts';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hermes-token',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GATEWAY_TOKEN = Deno.env.get('HERMES_GATEWAY_TOKEN');
const BUCKET = 'hermes-temporary-files';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Un seul message assistant par job : créé au premier événement, mis à jour ensuite.
async function upsertAssistantMessage(job: any, content: string, status: string, result?: unknown) {
  if (!job.conversation_id) return;

  const { data: existing } = await admin
    .from('assistant_messages')
    .select('id')
    .eq('job_id', job.id)
    .eq('role', 'assistant')
    .maybeSingle();

  if (existing) {
    await admin.from('assistant_messages')
      .update({ content, status, result: result ?? null })
      .eq('id', existing.id);
  } else {
    await admin.from('assistant_messages').insert({
      conversation_id: job.conversation_id,
      user_id: job.user_id,
      role: 'assistant',
      content,
      status,
      job_id: job.id,
      result: result ?? null,
    });
  }

  await admin.from('assistant_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', job.conversation_id);
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (!GATEWAY_TOKEN) return json({ error: 'gateway_not_configured' }, 503);
  const provided = req.headers.get('x-hermes-token') ?? '';
  if (!timingSafeEqual(provided, GATEWAY_TOKEN)) return json({ error: 'unauthorized' }, 401);
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = new URL(req.url);
  const route = url.pathname.split('/').filter(Boolean).pop();

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  // ── POST /next-job ────────────────────────────────────────────────
  if (route === 'next-job') {
    const { data, error } = await admin.rpc('hermes_claim_next_job');
    if (error) {
      console.error('claim error', error);
      return json({ error: 'claim_failed' }, 500);
    }
    const job = Array.isArray(data) ? data[0] : data;
    if (!job) return json({ job: null });

    // URLs signées temporaires (1h) pour les fichiers privés
    const attachments: any[] = [];
    for (const a of (job.attachments ?? [])) {
      const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(a.path, 3600);
      attachments.push({ ...a, signed_url: signed?.signedUrl ?? null });
    }

    await upsertAssistantMessage(job, STATUS_LABELS.processing, 'processing', { status: 'processing' });

    return json({
      job: {
        id: job.id,
        user_id: job.user_id,
        user_role: job.user_role,
        conversation_id: job.conversation_id,
        message: job.message,
        action_hint: job.action_hint,
        attachments,
        created_at: job.created_at,
        expires_at: job.expires_at,
      },
    });
  }

  const jobId = body.job_id;
  if (!jobId) return json({ error: 'job_id_required' }, 400);
  const { data: job } = await admin.from('hermes_jobs').select('*').eq('id', jobId).maybeSingle();
  if (!job) return json({ error: 'job_not_found' }, 404);

  // ── POST /update-job ──────────────────────────────────────────────
  if (route === 'update-job') {
    const allowed = ['processing', 'needs_information', 'confirmation_required'];
    const status = allowed.includes(body.status) ? body.status : 'processing';
    const patch: Record<string, unknown> = { status };
    if (body.missing_fields) patch.missing_fields = body.missing_fields;
    if (body.warnings) patch.warnings = body.warnings;
    if (body.result !== undefined) patch.result = body.result;

    const { error } = await admin.from('hermes_jobs').update(patch).eq('id', jobId);
    if (error) return json({ error: 'update_failed' }, 500);

    const text = resolveAssistantContent(body, status);
    await upsertAssistantMessage({ ...job, status }, text, status, buildResultPayload(body, status));


    await admin.from('assistant_audit_logs').insert({
      user_id: job.user_id, job_id: jobId, action: `assistant.${status}`,
      resource: 'hermes_jobs', record_id: jobId,
      new_value: { missing_fields: body.missing_fields ?? [], warnings: body.warnings ?? [] },
      result: 'pending',
    });

    return json({ ok: true, status });
  }

  // ── POST /complete-job ────────────────────────────────────────────
  if (route === 'complete-job') {
    if (job.status === 'completed' || job.status === 'failed') {
      return json({ ok: true, status: job.status, duplicate: true });
    }
    const status = body.status === 'failed' ? 'failed' : 'completed';
    const result = body.result ?? null;

    const { error } = await admin.from('hermes_jobs').update({
      status,
      result,
      warnings: body.warnings ?? [],
      missing_fields: [],
      completed_at: new Date().toISOString(),
    }).eq('id', jobId);
    if (error) return json({ error: 'complete_failed' }, 500);

    const text = String(body.message ?? (status === 'completed' ? 'Action réalisée.' : 'Erreur lors du traitement.'));
    await addAssistantMessage({ ...job, status }, text, status, result);

    const changes = Array.isArray(body.changes) ? body.changes : [];
    if (changes.length === 0) {
      await admin.from('assistant_audit_logs').insert({
        user_id: job.user_id, job_id: jobId, action: `assistant.${status}`,
        resource: 'hermes_jobs', record_id: jobId,
        new_value: result, result: status === 'completed' ? 'success' : 'error',
        error: status === 'failed' ? String(body.error ?? text) : null,
      });
    } else {
      await admin.from('assistant_audit_logs').insert(changes.map((c: any) => ({
        user_id: job.user_id,
        job_id: jobId,
        action: String(c.action ?? 'assistant.change'),
        resource: c.resource ?? null,
        record_id: c.record_id ? String(c.record_id) : null,
        old_value: c.old_value ?? null,
        new_value: c.new_value ?? null,
        result: status === 'completed' ? 'success' : 'error',
        error: status === 'failed' ? String(body.error ?? text) : null,
      })));
    }

    return json({ ok: true, status });
  }

  return json({ error: 'not_found' }, 404);
});
