// Prépare (sans envoyer) un brouillon de relance WhatsApp via la file Hermes.
// Le navigateur n'appelle jamais Hermes directement : cette fonction crée une tâche
// rattachée à l'utilisateur authentifié et à sa conversation active.
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
const ASSISTANT = 'powertech';

/** "+212|0619113324" ou format libre -> "212619113324" */
function toWhatsAppNumber(stored?: string | null): string | null {
  if (!stored) return null;
  let cc = '212';
  let num = stored;
  if (stored.includes('|')) {
    const [c, n] = stored.split('|', 2);
    cc = (c || '+212').replace(/\D/g, '');
    num = n || '';
  } else {
    const digits = stored.replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) {
      const d = digits.slice(1);
      cc = d.slice(0, 3);
      num = d.slice(3);
    } else {
      num = digits;
    }
  }
  num = (num || '').replace(/\D/g, '').replace(/^0/, '');
  if (!num || num.length < 6) return null;
  return `${cc}${num}`;
}

function firstName(client: any): string | null {
  if (!client) return null;
  if (client.type_client === 'societe') return (client.raison_sociale || '').trim() || null;
  return (client.prenom || '').trim() || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
    authHeader.replace('Bearer ', ''),
  );
  if (claimsError || !claimsData?.claims?.sub) return json({ error: 'unauthorized' }, 401);
  const userId = claimsData.claims.sub as string;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: profile } = await admin
    .from('profiles').select('active').eq('id', userId).maybeSingle();
  if (profile && profile.active === false) return json({ error: 'account_disabled' }, 403);

  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', userId);
  const userRole = roles?.some((r: any) => r.role === 'administrateur')
    ? 'administrateur' : 'contributeur';

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const devisId = String(body?.devis_id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(devisId)) return json({ error: 'invalid_devis_id' }, 400);

  const { data: devis } = await admin
    .from('devis')
    .select('id, statut, sent_at, last_follow_up_at, follow_up_count, client_id, vehicule_id, client_nom, client_tel, marque, modele, annee')
    .eq('id', devisId)
    .maybeSingle();
  if (!devis) return json({ error: 'devis_not_found' }, 404);
  if (devis.statut !== 'envoye') return json({ error: 'devis_not_sent' }, 400);

  // Contexte minimal résolu côté serveur (pas de VIN complet, prix, pièces ni notes).
  let client: any = null;
  if (devis.client_id) {
    const { data } = await admin
      .from('clients')
      .select('type_client, prenom, nom, raison_sociale, telephone')
      .eq('id', devis.client_id).maybeSingle();
    client = data;
  }
  let vehicule: any = null;
  if (devis.vehicule_id) {
    const { data } = await admin
      .from('vehicules').select('marque, modele, annee').eq('id', devis.vehicule_id).maybeSingle();
    vehicule = data;
  }

  const waNumber = toWhatsAppNumber(client?.telephone || devis.client_tel);
  if (!waNumber) return json({ error: 'no_whatsapp_number' }, 422);

  const prenom = firstName(client);
  const vehiculeLabel = [
    vehicule?.marque ?? devis.marque,
    vehicule?.modele ?? devis.modele,
    vehicule?.annee ?? devis.annee,
  ].filter(Boolean).join(' ') || null;

  // Conversation active de l'utilisateur (jamais choisie par le frontend)
  let conversationId: string | null = null;
  {
    const { data: conv } = await admin
      .from('assistant_conversations')
      .select('id').eq('user_id', userId).eq('assistant', ASSISTANT).maybeSingle();
    conversationId = conv?.id ?? null;
    if (!conversationId) {
      const { data: created } = await admin
        .from('assistant_conversations')
        .insert({ user_id: userId, assistant: ASSISTANT, title: 'Assistant Powertech' })
        .select('id').maybeSingle();
      conversationId = created?.id ?? null;
    }
  }
  if (!conversationId) return json({ error: 'conversation_unavailable' }, 500);

  const context = {
    devis_id: devis.id,
    prenom: prenom ?? null,
    vehicule: vehiculeLabel,
    date_envoi: devis.sent_at ?? null,
    derniere_relance: devis.last_follow_up_at ?? null,
    relances: devis.follow_up_count ?? 0,
  };

  const message = [
    'Prépare UNIQUEMENT un brouillon de message WhatsApp de relance en français.',
    'Règles : un seul message, poli, aimable, concis, générique, sans pression commerciale.',
    'Interdits : prix, liste de pièces, détails techniques, dates internes, notes d\'atelier, statut de paiement.',
    'Demande simplement si le client souhaite un complément d\'information ou donner suite au devis.',
    'Si le prénom est absent, utilise une formule neutre (« Bonjour, »).',
    'Réponds avec le texte du message uniquement.',
    `Contexte : ${JSON.stringify(context)}`,
  ].join('\n');

  const idempotencyKey = `relance:${devis.id}:${Math.floor(Date.now() / 60000)}`;

  const { data: existing } = await admin
    .from('hermes_jobs').select('id, status')
    .eq('user_id', userId).eq('idempotency_key', idempotencyKey).maybeSingle();
  if (existing) {
    return json({ job_id: existing.id, status: existing.status, wa_number: waNumber, duplicate: true });
  }

  const { data: job, error } = await admin
    .from('hermes_jobs')
    .insert({
      user_id: userId,
      user_role: userRole,
      conversation_id: conversationId,
      message,
      action_hint: 'libre',
      attachments: [],
      idempotency_key: idempotencyKey,
      status: 'queued',
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    })
    .select('id, status').single();

  if (error || !job) {
    console.error('follow-up job insert failed', error);
    return json({ error: 'job_creation_failed' }, 500);
  }

  await admin.from('assistant_audit_logs').insert({
    user_id: userId,
    job_id: job.id,
    action: 'devis.followup_prepared',
    resource: 'devis',
    record_id: devis.id,
    new_value: { channel: 'whatsapp', prepared: true },
    result: 'success',
  });

  return json({ job_id: job.id, status: job.status, wa_number: waNumber });
});
