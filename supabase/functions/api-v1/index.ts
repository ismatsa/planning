// Powertech API v1 — API sécurisée pour assistant opérationnel externe
// Auth: Authorization: Bearer <api key>  (jamais journalisée)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, idempotency-key, x-forwarded-for',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const RATE_LIMIT_MAX = 120; // requêtes par fenêtre
const RATE_LIMIT_WINDOW_MS = 60_000;

type Scope =
  | 'clients:read' | 'clients:write'
  | 'vehicles:read' | 'vehicles:write'
  | 'appointments:read' | 'appointments:write'
  | 'quotes:read' | 'quotes:write'
  | 'availability:read'
  | 'maintenance:read' | 'maintenance:write'
  | 'audit:read';

interface Ctx {
  integration: { id: string; name: string; scopes: string[]; expires_at: string | null };
  requestId: string;
  ip: string | null;
  url: URL;
  method: string;
  body: Record<string, unknown>;
  dryRun: boolean;
  idempotencyKey: string | null;
}

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function ok(status: number, data: unknown, meta?: Record<string, unknown>) {
  return json(status, meta ? { data, meta } : { data });
}

function errorResponse(e: ApiError, requestId: string) {
  return json(e.status, {
    error: { code: e.code, message: e.message, details: e.details, request_id: requestId },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function requireScope(ctx: Ctx, scope: Scope) {
  if (!ctx.integration.scopes.includes(scope)) {
    throw new ApiError(403, 'SCOPE_INSUFFISANT', `Permission « ${scope} » requise pour cette opération.`);
  }
}

function assertAllowedFields(body: Record<string, unknown>, allowed: string[], ignore: string[] = []) {
  const unknown = Object.keys(body).filter((k) => !allowed.includes(k) && !ignore.includes(k));
  if (unknown.length) {
    throw new ApiError(400, 'CHAMPS_NON_AUTORISES', 'Certains champs fournis ne sont pas autorisés.', {
      champs: unknown,
    });
  }
}

async function audit(ctx: Ctx, entry: {
  resource: string;
  record_id?: string | null;
  operation: 'create' | 'update' | 'archive' | 'blocked';
  old_value?: unknown;
  new_value?: unknown;
  result: 'success' | 'failed' | 'denied';
  denial_reason?: string | null;
}) {
  await db.from('api_audit_log').insert({
    integration_id: ctx.integration.id,
    integration_name: ctx.integration.name,
    resource: entry.resource,
    record_id: entry.record_id ?? null,
    operation: entry.operation,
    old_value: entry.old_value ?? null,
    new_value: entry.new_value ?? null,
    result: entry.result,
    denial_reason: entry.denial_reason ?? null,
    request_id: ctx.requestId,
    ip_address: ctx.ip,
  });
}

// ---------- Auth & rate limit ----------

async function authenticate(req: Request): Promise<Ctx['integration']> {
  const header = req.headers.get('Authorization') ?? '';
  if (!header.toLowerCase().startsWith('bearer ')) {
    throw new ApiError(401, 'CLE_API_MANQUANTE', 'Clé API manquante. Utilisez l\'en-tête Authorization: Bearer.');
  }
  const key = header.slice(7).trim();
  if (!key) throw new ApiError(401, 'CLE_API_MANQUANTE', 'Clé API manquante.');
  const hash = await sha256Hex(key);
  const { data } = await db
    .from('api_integrations')
    .select('id, name, scopes, active, expires_at, revoked_at')
    .eq('key_hash', hash)
    .maybeSingle();
  if (!data) throw new ApiError(401, 'CLE_API_INVALIDE', 'Clé API invalide.');
  if (!data.active || data.revoked_at) {
    throw new ApiError(401, 'CLE_API_REVOQUEE', 'Cette clé API a été désactivée ou révoquée.');
  }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    throw new ApiError(401, 'CLE_API_EXPIREE', 'Cette clé API a expiré.');
  }
  return { id: data.id, name: data.name, scopes: data.scopes ?? [], expires_at: data.expires_at };
}

async function enforceRateLimit(bucketKey: string) {
  const now = Date.now();
  const bucket = `${bucketKey}`;
  const { data } = await db.from('api_rate_limits').select('*').eq('bucket', bucket).maybeSingle();
  if (!data || now - new Date(data.window_start).getTime() > RATE_LIMIT_WINDOW_MS) {
    await db.from('api_rate_limits').upsert({
      bucket,
      window_start: new Date(now).toISOString(),
      request_count: 1,
    });
    return;
  }
  if (data.request_count >= RATE_LIMIT_MAX) {
    throw new ApiError(429, 'LIMITE_DEBIT_ATTEINTE', 'Trop de requêtes. Réessayez dans une minute.', {
      limite: RATE_LIMIT_MAX,
      fenetre_secondes: RATE_LIMIT_WINDOW_MS / 1000,
    });
  }
  await db.from('api_rate_limits')
    .update({ request_count: data.request_count + 1 })
    .eq('bucket', bucket);
}

// ---------- Helpers métier ----------

function normalizeVin(vin: unknown): string {
  if (typeof vin !== 'string' || !vin.trim()) {
    throw new ApiError(400, 'VIN_REQUIS', 'Le VIN est obligatoire.');
  }
  return vin.trim().toUpperCase();
}

function requireEtag(ctx: Ctx, current: { updated_at: string }) {
  const provided = ctx.body.updated_at ?? ctx.body.etag;
  if (!provided) {
    throw new ApiError(400, 'CONTROLE_CONCURRENCE_REQUIS',
      'Le champ updated_at (ou etag) lu précédemment est obligatoire pour toute modification.');
  }
  if (new Date(String(provided)).getTime() !== new Date(current.updated_at).getTime()) {
    throw new ApiError(409, 'MODIFICATION_CONCURRENTE',
      'Cet enregistrement a été modifié depuis votre lecture. Relisez-le puis réessayez.', {
        updated_at_actuel: current.updated_at,
      });
  }
}

function pagination(url: URL) {
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 25) || 25, 100);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0) || 0, 0);
  return { limit, offset };
}

const CLIENT_FIELDS = 'id, type_client, nom, prenom, raison_sociale, ice, telephone, telephone_secondaire, email, adresse, ville, statut, created_at, updated_at';
const VEHICULE_FIELDS = 'id, vin, immatriculation, marque, modele, annee, motorisation, carburant, boite_vitesses, kilometrage_actuel, statut, client_id, notes, created_at, updated_at';
const RDV_FIELDS = 'id, poste_id, debut, fin, client_nom, client_tel, marque, modele, annee, vin, notes, statut, client_id, vehicule_id, source_devis_id, created_at, updated_at';
const DEVIS_FIELDS = 'id, client_nom, client_tel, marque, modele, annee, vin, notes, statut, client_id, vehicule_id, assigned_user_id, sent_at, follow_up_count, created_at, updated_at';

const DEVIS_STATUTS_MODIFIABLES = ['demande_recue', 'a_chiffrer', 'en_cours_de_devis', 'en_attente_infos', 'devis_pret'];
const DEVIS_STATUTS_VERROUILLES = ['envoye', 'valide', 'refuse', 'annule'];

async function findClientDuplicates(params: {
  nom?: string; prenom?: string; raison_sociale?: string; telephone?: string; email?: string;
}) {
  const filters: string[] = [];
  if (params.telephone) filters.push(`telephone.ilike.%${params.telephone}%`);
  if (params.email) filters.push(`email.ilike.%${params.email}%`);
  if (params.raison_sociale) filters.push(`raison_sociale.ilike.%${params.raison_sociale}%`);
  if (params.nom) filters.push(`nom.ilike.%${params.nom}%`);
  if (!filters.length) return [];
  const { data } = await db.from('clients').select(CLIENT_FIELDS).or(filters.join(',')).limit(20);
  let rows = data ?? [];
  if (params.nom && params.prenom) {
    rows = rows.filter((r: any) =>
      (r.telephone && params.telephone && r.telephone.includes(params.telephone!)) ||
      (r.email && params.email && r.email.toLowerCase() === params.email!.toLowerCase()) ||
      (r.nom?.toLowerCase() === params.nom!.toLowerCase() &&
        r.prenom?.toLowerCase() === params.prenom!.toLowerCase()) ||
      (params.raison_sociale && r.raison_sociale?.toLowerCase() === params.raison_sociale.toLowerCase()));
  }
  return rows;
}

async function detectRdvConflicts(posteId: string, debut: string, fin: string, excludeId?: string) {
  const { data } = await db
    .from('rendez_vous')
    .select('id, poste_id, debut, fin, statut, client_nom')
    .eq('poste_id', posteId)
    .neq('statut', 'annule')
    .lt('debut', fin)
    .gt('fin', debut);
  return (data ?? []).filter((r: any) => r.id !== excludeId);
}

// ---------- Routes ----------

async function handleClients(ctx: Ctx, segments: string[]): Promise<Response> {
  const { method, url, body } = ctx;

  // GET /clients/duplicates
  if (method === 'GET' && segments[1] === 'duplicates') {
    requireScope(ctx, 'clients:read');
    const rows = await findClientDuplicates({
      nom: url.searchParams.get('nom') ?? undefined,
      prenom: url.searchParams.get('prenom') ?? undefined,
      raison_sociale: url.searchParams.get('raison_sociale') ?? undefined,
      telephone: url.searchParams.get('telephone') ?? undefined,
      email: url.searchParams.get('email') ?? undefined,
    });
    return ok(200, rows, { count: rows.length });
  }

  // GET /clients
  if (method === 'GET' && !segments[1]) {
    requireScope(ctx, 'clients:read');
    const { limit, offset } = pagination(url);
    let q = db.from('clients').select(CLIENT_FIELDS, { count: 'exact' });
    const query = url.searchParams.get('query');
    if (query) q = q.or(`nom.ilike.%${query}%,prenom.ilike.%${query}%,raison_sociale.ilike.%${query}%,telephone.ilike.%${query}%,email.ilike.%${query}%`);
    const tel = url.searchParams.get('telephone');
    if (tel) q = q.ilike('telephone', `%${tel}%`);
    const email = url.searchParams.get('email');
    if (email) q = q.ilike('email', `%${email}%`);
    const statut = url.searchParams.get('status');
    if (statut) q = q.eq('statut', statut);

    const vin = url.searchParams.get('vin');
    const immat = url.searchParams.get('immatriculation');
    if (vin || immat) {
      let vq = db.from('vehicules').select('client_id');
      if (vin) vq = vq.eq('vin', vin.toUpperCase());
      if (immat) vq = vq.ilike('immatriculation', `%${immat}%`);
      const { data: vehs } = await vq;
      const ids = (vehs ?? []).map((v: any) => v.client_id).filter(Boolean);
      if (!ids.length) return ok(200, [], { count: 0, limit, offset });
      q = q.in('id', ids);
    }

    const { data, count } = await q.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    return ok(200, data ?? [], { count: count ?? 0, limit, offset });
  }

  // GET /clients/{id}
  if (method === 'GET' && segments[1]) {
    requireScope(ctx, 'clients:read');
    const id = segments[1];
    const { data: client } = await db.from('clients').select(CLIENT_FIELDS).eq('id', id).maybeSingle();
    if (!client) throw new ApiError(404, 'CLIENT_INTROUVABLE', 'Client introuvable.');
    const [{ data: vehicules }, { data: historique }, { data: rdvs }, { data: devis }] = await Promise.all([
      db.from('vehicules').select(VEHICULE_FIELDS).eq('client_id', id),
      db.from('vehicule_proprietaires').select('id, vehicule_id, date_debut, date_fin, motif').eq('client_id', id),
      db.from('rendez_vous').select(RDV_FIELDS).eq('client_id', id).order('debut', { ascending: false }).limit(50),
      db.from('devis').select(DEVIS_FIELDS).eq('client_id', id).order('created_at', { ascending: false }).limit(50),
    ]);
    const actifs = (vehicules ?? []).filter((v: any) => v.statut === 'actif');
    const passes = (historique ?? []).filter((h: any) => h.date_fin);
    return ok(200, {
      client,
      vehicules_actifs: actifs,
      vehicules_passes: passes,
      rendez_vous: rdvs ?? [],
      demandes_devis: devis ?? [],
    });
  }

  // POST /clients
  if (method === 'POST' && !segments[1]) {
    requireScope(ctx, 'clients:write');
    const allowed = ['type_client', 'nom', 'prenom', 'raison_sociale', 'ice', 'telephone',
      'telephone_secondaire', 'email', 'adresse', 'ville', 'notes_internes', 'force'];
    assertAllowedFields(body, allowed);
    if (!body.telephone) throw new ApiError(400, 'TELEPHONE_REQUIS', 'Le téléphone est obligatoire.');
    const typeClient = (body.type_client as string) ?? 'particulier';
    if (!['particulier', 'societe'].includes(typeClient)) {
      throw new ApiError(400, 'TYPE_CLIENT_INVALIDE', 'Le type de client doit être « particulier » ou « societe ».');
    }
    if (typeClient === 'societe' && !body.raison_sociale) {
      throw new ApiError(422, 'RAISON_SOCIALE_REQUISE', 'La raison sociale est obligatoire pour une société.');
    }
    if (typeClient === 'particulier' && !body.nom) {
      throw new ApiError(422, 'NOM_REQUIS', 'Le nom est obligatoire pour un particulier.');
    }
    const duplicates = await findClientDuplicates({
      nom: body.nom as string, prenom: body.prenom as string,
      raison_sociale: body.raison_sociale as string,
      telephone: body.telephone as string, email: body.email as string,
    });
    if (duplicates.length && body.force !== true) {
      await audit(ctx, { resource: 'clients', operation: 'blocked', result: 'denied',
        denial_reason: 'Doublons potentiels détectés', new_value: { telephone: body.telephone } });
      throw new ApiError(409, 'DOUBLONS_POTENTIELS',
        'Des clients similaires existent déjà. Vérifiez puis renvoyez avec force=true si la création est bien souhaitée.',
        { doublons: duplicates });
    }
    const payload = {
      type_client: typeClient,
      nom: body.nom ?? null, prenom: body.prenom ?? null,
      raison_sociale: body.raison_sociale ?? null, ice: body.ice ?? null,
      telephone: body.telephone, telephone_secondaire: body.telephone_secondaire ?? null,
      email: body.email ?? null, adresse: body.adresse ?? null, ville: body.ville ?? null,
      notes_internes: body.notes_internes ?? null, statut: 'actif',
    };
    if (ctx.dryRun) {
      return ok(200, { dry_run: true, apercu: payload, doublons_potentiels: duplicates });
    }
    const { data, error } = await db.from('clients').insert(payload).select(CLIENT_FIELDS).single();
    if (error) throw new ApiError(422, 'CREATION_IMPOSSIBLE', 'Impossible de créer le client.');
    await audit(ctx, { resource: 'clients', record_id: data.id, operation: 'create', new_value: data, result: 'success' });
    return ok(201, data);
  }

  // PATCH /clients/{id}
  if (method === 'PATCH' && segments[1]) {
    requireScope(ctx, 'clients:write');
    const id = segments[1];
    const allowed = ['telephone', 'telephone_secondaire', 'email', 'adresse', 'ville',
      'nom', 'prenom', 'raison_sociale', 'ice', 'notes_internes'];
    assertAllowedFields(body, allowed, ['updated_at', 'etag']);
    const { data: current } = await db.from('clients').select('*').eq('id', id).maybeSingle();
    if (!current) throw new ApiError(404, 'CLIENT_INTROUVABLE', 'Client introuvable.');
    requireEtag(ctx, current);
    const patch: Record<string, unknown> = {};
    for (const f of allowed) if (f in body) patch[f] = body[f];
    if (!Object.keys(patch).length) throw new ApiError(400, 'AUCUNE_MODIFICATION', 'Aucun champ modifiable fourni.');
    if (ctx.dryRun) return ok(200, { dry_run: true, avant: current, apercu: { ...current, ...patch } });
    const { data, error } = await db.from('clients').update(patch).eq('id', id).select(CLIENT_FIELDS).single();
    if (error) throw new ApiError(422, 'MODIFICATION_IMPOSSIBLE', 'Impossible de modifier le client.');
    await audit(ctx, { resource: 'clients', record_id: id, operation: 'update',
      old_value: Object.fromEntries(Object.keys(patch).map((k) => [k, (current as any)[k]])),
      new_value: patch, result: 'success' });
    return ok(200, data);
  }

  throw new ApiError(404, 'ROUTE_INTROUVABLE', 'Route introuvable.');
}

async function handleVehicles(ctx: Ctx, segments: string[]): Promise<Response> {
  const { method, url, body } = ctx;

  // GET /vehicles/by-vin/{vin}
  if (method === 'GET' && segments[1] === 'by-vin') {
    requireScope(ctx, 'vehicles:read');
    const vin = normalizeVin(segments[2]);
    const { data: vehicule } = await db.from('vehicules').select(VEHICULE_FIELDS).eq('vin', vin).maybeSingle();
    if (!vehicule) throw new ApiError(404, 'VEHICULE_INTROUVABLE', 'Aucun véhicule avec ce VIN.');
    let proprietaire = null;
    if (ctx.integration.scopes.includes('clients:read') && vehicule.client_id) {
      const { data } = await db.from('clients').select(CLIENT_FIELDS).eq('id', vehicule.client_id).maybeSingle();
      proprietaire = data;
    }
    return ok(200, { vehicule, proprietaire_actuel: proprietaire });
  }

  // GET /vehicles
  if (method === 'GET' && !segments[1]) {
    requireScope(ctx, 'vehicles:read');
    const { limit, offset } = pagination(url);
    let q = db.from('vehicules').select(VEHICULE_FIELDS, { count: 'exact' });
    const vin = url.searchParams.get('vin');
    if (vin) q = q.ilike('vin', `%${vin.toUpperCase()}%`);
    const immat = url.searchParams.get('immatriculation');
    if (immat) q = q.ilike('immatriculation', `%${immat}%`);
    const marque = url.searchParams.get('marque');
    if (marque) q = q.ilike('marque', `%${marque}%`);
    const modele = url.searchParams.get('modele');
    if (modele) q = q.ilike('modele', `%${modele}%`);
    const clientId = url.searchParams.get('client_id');
    if (clientId) q = q.eq('client_id', clientId);
    const statut = url.searchParams.get('status');
    if (statut) q = q.eq('statut', statut);
    const { data, count } = await q.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    return ok(200, data ?? [], { count: count ?? 0, limit, offset });
  }

  // GET /vehicles/{id}
  if (method === 'GET' && segments[1]) {
    requireScope(ctx, 'vehicles:read');
    const id = segments[1];
    const { data: vehicule } = await db.from('vehicules').select(VEHICULE_FIELDS).eq('id', id).maybeSingle();
    if (!vehicule) throw new ApiError(404, 'VEHICULE_INTROUVABLE', 'Véhicule introuvable.');
    const [{ data: proprietaires }, { data: entretiens }, { data: rdvs }, { data: devis }] = await Promise.all([
      db.from('vehicule_proprietaires').select('id, client_id, date_debut, date_fin, motif')
        .eq('vehicule_id', id).order('date_debut', { ascending: false }),
      ctx.integration.scopes.includes('maintenance:read')
        ? db.from('entretiens').select('*').eq('vehicule_id', id).order('date_entretien', { ascending: false })
        : Promise.resolve({ data: [] } as any),
      ctx.integration.scopes.includes('appointments:read')
        ? db.from('rendez_vous').select(RDV_FIELDS).eq('vehicule_id', id).order('debut', { ascending: false })
        : Promise.resolve({ data: [] } as any),
      ctx.integration.scopes.includes('quotes:read')
        ? db.from('devis').select(DEVIS_FIELDS).eq('vehicule_id', id).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] } as any),
    ]);
    let proprietaireActuel = null;
    if (ctx.integration.scopes.includes('clients:read') && vehicule.client_id) {
      const { data } = await db.from('clients').select(CLIENT_FIELDS).eq('id', vehicule.client_id).maybeSingle();
      proprietaireActuel = data;
    }
    return ok(200, {
      vehicule,
      proprietaire_actuel: proprietaireActuel,
      historique_proprietaires: proprietaires ?? [],
      entretiens: entretiens ?? [],
      rendez_vous: rdvs ?? [],
      devis: devis ?? [],
    });
  }

  // POST /vehicles
  if (method === 'POST' && !segments[1]) {
    requireScope(ctx, 'vehicles:write');
    const allowed = ['vin', 'immatriculation', 'marque', 'modele', 'annee', 'motorisation',
      'carburant', 'boite_vitesses', 'kilometrage_actuel', 'notes', 'client_id'];
    assertAllowedFields(body, allowed);
    const vin = normalizeVin(body.vin);
    if (!body.marque || !body.modele) {
      throw new ApiError(400, 'DONNEES_MANQUANTES', 'La marque et le modèle sont obligatoires.');
    }
    if (!body.client_id) {
      throw new ApiError(400, 'CLIENT_REQUIS', 'Un client_id est requis pour créer la propriété initiale du véhicule.');
    }
    const { data: client } = await db.from('clients').select('id').eq('id', body.client_id).maybeSingle();
    if (!client) throw new ApiError(404, 'CLIENT_INTROUVABLE', 'Client introuvable.');
    const { data: existing } = await db.from('vehicules').select('id, client_id').eq('vin', vin).maybeSingle();
    if (existing) {
      await audit(ctx, { resource: 'vehicules', record_id: existing.id, operation: 'blocked',
        result: 'denied', denial_reason: 'VIN déjà existant' });
      throw new ApiError(409, 'VIN_ALREADY_EXISTS', 'Un véhicule avec ce VIN existe déjà.', { vehicle_id: existing.id });
    }
    const payload = {
      vin, immatriculation: body.immatriculation ?? null,
      marque: body.marque, modele: body.modele,
      annee: body.annee ?? null, motorisation: body.motorisation ?? null,
      carburant: body.carburant ?? null, boite_vitesses: body.boite_vitesses ?? null,
      kilometrage_actuel: body.kilometrage_actuel ?? null, notes: body.notes ?? null,
      client_id: body.client_id, statut: 'actif',
    };
    if (ctx.dryRun) return ok(200, { dry_run: true, apercu: payload });
    const { data, error } = await db.from('vehicules').insert(payload).select(VEHICULE_FIELDS).single();
    if (error) throw new ApiError(422, 'CREATION_IMPOSSIBLE', 'Impossible de créer le véhicule.');
    await db.from('vehicule_proprietaires').insert({
      vehicule_id: data.id, client_id: body.client_id, motif: 'achat',
    });
    await audit(ctx, { resource: 'vehicules', record_id: data.id, operation: 'create', new_value: data, result: 'success' });
    return ok(201, data);
  }

  // POST /vehicles/{id}/transfer — changement de propriétaire (historique préservé)
  if (method === 'POST' && segments[1] && segments[2] === 'transfer') {
    requireScope(ctx, 'vehicles:write');
    const id = segments[1];
    const allowed = ['client_id', 'motif', 'date_debut'];
    assertAllowedFields(body, allowed, ['updated_at', 'etag']);
    const newClientId = body.client_id as string | undefined;
    if (!newClientId) {
      throw new ApiError(400, 'CLIENT_REQUIS', 'Le champ client_id (nouveau propriétaire) est obligatoire.');
    }
    const motif = (body.motif as string) ?? 'transfert';
    if (!['achat', 'vente', 'transfert', 'autre'].includes(motif)) {
      throw new ApiError(400, 'MOTIF_INVALIDE', 'Motif invalide (achat, vente, transfert, autre).');
    }
    const dateDebut = (body.date_debut as string) ?? new Date().toISOString();
    if (Number.isNaN(Date.parse(dateDebut))) {
      throw new ApiError(400, 'DATE_INVALIDE', 'La date_debut doit être une date ISO valide.');
    }

    const { data: vehicule } = await db.from('vehicules').select('*').eq('id', id).maybeSingle();
    if (!vehicule) throw new ApiError(404, 'VEHICULE_INTROUVABLE', 'Véhicule introuvable.');
    requireEtag(ctx, vehicule);

    const { data: newClient } = await db.from('clients').select('id, statut').eq('id', newClientId).maybeSingle();
    if (!newClient) throw new ApiError(404, 'CLIENT_INTROUVABLE', 'Client introuvable.');
    if (newClient.statut !== 'actif') {
      throw new ApiError(422, 'CLIENT_ARCHIVE', 'Impossible de transférer un véhicule vers un client archivé.');
    }
    if (vehicule.client_id === newClientId) {
      throw new ApiError(422, 'AUCUNE_MODIFICATION', 'Ce client est déjà le propriétaire actuel du véhicule.');
    }

    if (ctx.dryRun) {
      return ok(200, {
        dry_run: true,
        avant: { proprietaire_actuel_id: vehicule.client_id },
        apercu: { proprietaire_actuel_id: newClientId, motif, date_debut: dateDebut },
      });
    }

    await db.from('vehicule_proprietaires')
      .update({ date_fin: dateDebut })
      .eq('vehicule_id', id)
      .is('date_fin', null);

    const { error: pErr } = await db.from('vehicule_proprietaires').insert({
      vehicule_id: id, client_id: newClientId, date_debut: dateDebut, motif,
    });
    if (pErr) throw new ApiError(422, 'TRANSFERT_IMPOSSIBLE', 'Impossible d\'enregistrer le nouveau propriétaire.');

    const { data: updated, error } = await db.from('vehicules')
      .update({ client_id: newClientId }).eq('id', id).select(VEHICULE_FIELDS).single();
    if (error) throw new ApiError(422, 'TRANSFERT_IMPOSSIBLE', 'Impossible de mettre à jour le véhicule.');

    await audit(ctx, {
      resource: 'vehicules', record_id: id, operation: 'update',
      old_value: { client_id: vehicule.client_id },
      new_value: { client_id: newClientId, motif, date_debut: dateDebut },
      result: 'success',
    });
    return ok(200, { vehicule: updated, proprietaire_actuel_id: newClientId, motif, date_debut: dateDebut });
  }

  // PATCH /vehicles/{id}
  if (method === 'PATCH' && segments[1]) {
    requireScope(ctx, 'vehicles:write');
    const id = segments[1];
    if ('client_id' in body || 'proprietaire_id' in body) {
      await audit(ctx, { resource: 'vehicules', record_id: id, operation: 'blocked', result: 'denied',
        denial_reason: 'Changement de propriétaire via PATCH interdit' });
      throw new ApiError(403, 'CHANGEMENT_PROPRIETAIRE_INTERDIT',
        'Le changement de propriétaire doit passer par POST /vehicles/{id}/transfer.');
    }

    const allowed = ['immatriculation', 'marque', 'modele', 'annee', 'motorisation',
      'carburant', 'boite_vitesses', 'kilometrage_actuel', 'notes'];
    assertAllowedFields(body, allowed, ['updated_at', 'etag']);
    const { data: current } = await db.from('vehicules').select('*').eq('id', id).maybeSingle();
    if (!current) throw new ApiError(404, 'VEHICULE_INTROUVABLE', 'Véhicule introuvable.');
    requireEtag(ctx, current);
    const patch: Record<string, unknown> = {};
    for (const f of allowed) if (f in body) patch[f] = body[f];
    if (!Object.keys(patch).length) throw new ApiError(400, 'AUCUNE_MODIFICATION', 'Aucun champ modifiable fourni.');
    if (ctx.dryRun) return ok(200, { dry_run: true, avant: current, apercu: { ...current, ...patch } });
    const { data, error } = await db.from('vehicules').update(patch).eq('id', id).select(VEHICULE_FIELDS).single();
    if (error) throw new ApiError(422, 'MODIFICATION_IMPOSSIBLE', 'Impossible de modifier le véhicule.');
    await audit(ctx, { resource: 'vehicules', record_id: id, operation: 'update',
      old_value: Object.fromEntries(Object.keys(patch).map((k) => [k, (current as any)[k]])),
      new_value: patch, result: 'success' });
    return ok(200, data);
  }

  throw new ApiError(404, 'ROUTE_INTROUVABLE', 'Route introuvable.');
}

async function handleAvailability(ctx: Ctx): Promise<Response> {
  requireScope(ctx, 'availability:read');
  const url = ctx.url;
  const date = url.searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiError(400, 'DATE_INVALIDE', 'Le paramètre date (AAAA-MM-JJ) est obligatoire.');
  }
  const duree = Number(url.searchParams.get('duree') ?? 60) || 60;
  const metierId = url.searchParams.get('metier');
  const posteFilter = url.searchParams.get('poste');
  const heureDebutMin = url.searchParams.get('heure_debut');

  const jour = new Date(`${date}T12:00:00Z`).getUTCDay();

  const [{ data: settings }, { data: postes }, { data: dispos }, { data: exceptions }] = await Promise.all([
    db.from('app_settings').select('*').eq('id', 1).maybeSingle(),
    db.from('postes').select('id, metier_id, nom, actif').eq('actif', true),
    db.from('disponibilite_postes').select('*').eq('jour_semaine', jour),
    db.from('exception_disponibilites').select('*').eq('date', date),
  ]);

  if (settings && Array.isArray(settings.jours_ouvres) && !settings.jours_ouvres.includes(jour)) {
    return ok(200, { date, ferme: true, motif: 'Jour non ouvré', postes: [] });
  }

  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;
  const { data: rdvs } = await db.from('rendez_vous')
    .select('id, poste_id, debut, fin, statut')
    .neq('statut', 'annule')
    .gte('debut', dayStart).lte('debut', dayEnd);

  const result = (postes ?? [])
    .filter((p: any) => (!metierId || p.metier_id === metierId) && (!posteFilter || p.id === posteFilter))
    .map((p: any) => {
      const exception = (exceptions ?? []).find((e: any) => e.poste_id === p.id);
      if (exception?.ferme) {
        return { poste_id: p.id, poste: p.nom, metier_id: p.metier_id, ferme: true, creneaux: [] };
      }
      const dispo = (dispos ?? []).find((d: any) => d.poste_id === p.id);
      const plages = exception?.plages_override ?? dispo?.plages ?? [];
      const tampon = dispo?.tampon ?? 0;
      const occupes = (rdvs ?? []).filter((r: any) => r.poste_id === p.id);
      const creneaux: { debut: string; fin: string }[] = [];
      for (const plage of plages as { debut: string; fin: string }[]) {
        let cursor = new Date(`${date}T${plage.debut}:00`);
        const fin = new Date(`${date}T${plage.fin}:00`);
        while (cursor.getTime() + duree * 60000 <= fin.getTime()) {
          const slotStart = new Date(cursor);
          const slotEnd = new Date(cursor.getTime() + duree * 60000);
          const conflit = occupes.some((r: any) =>
            new Date(r.debut).getTime() - tampon * 60000 < slotEnd.getTime() &&
            new Date(r.fin).getTime() + tampon * 60000 > slotStart.getTime());
          if (!conflit && (!heureDebutMin || slotStart >= new Date(`${date}T${heureDebutMin}:00`))) {
            creneaux.push({ debut: slotStart.toISOString(), fin: slotEnd.toISOString() });
          }
          cursor = new Date(cursor.getTime() + 15 * 60000);
        }
      }
      return {
        poste_id: p.id, poste: p.nom, metier_id: p.metier_id, ferme: false,
        duree_defaut: dispo?.duree_defaut ?? null,
        durees_autorisees: dispo?.durees_autorisees ?? null,
        creneaux,
        occupes: occupes.map((r: any) => ({ debut: r.debut, fin: r.fin, statut: r.statut })),
      };
    });

  return ok(200, { date, duree_minutes: duree, postes: result });
}

async function handleAppointments(ctx: Ctx, segments: string[]): Promise<Response> {
  const { method, url, body } = ctx;

  if (method === 'GET' && !segments[1]) {
    requireScope(ctx, 'appointments:read');
    const { limit, offset } = pagination(url);
    let q = db.from('rendez_vous').select(RDV_FIELDS, { count: 'exact' });
    const date = url.searchParams.get('date');
    if (date) q = q.gte('debut', `${date}T00:00:00.000Z`).lte('debut', `${date}T23:59:59.999Z`);
    const from = url.searchParams.get('from');
    if (from) q = q.gte('debut', from);
    const to = url.searchParams.get('to');
    if (to) q = q.lte('debut', to);
    for (const [param, col] of [['client_id', 'client_id'], ['vehicule_id', 'vehicule_id'],
      ['statut', 'statut'], ['poste', 'poste_id']] as const) {
      const v = url.searchParams.get(param);
      if (v) q = q.eq(col, v);
    }
    const { data, count } = await q.order('debut', { ascending: false }).range(offset, offset + limit - 1);
    return ok(200, data ?? [], { count: count ?? 0, limit, offset });
  }

  if (method === 'GET' && segments[1]) {
    requireScope(ctx, 'appointments:read');
    const { data } = await db.from('rendez_vous').select(RDV_FIELDS).eq('id', segments[1]).maybeSingle();
    if (!data) throw new ApiError(404, 'RDV_INTROUVABLE', 'Rendez-vous introuvable.');
    const [{ data: responsables }, { data: intervenants }] = await Promise.all([
      db.from('appointment_responsibles').select('user_id').eq('appointment_id', data.id),
      db.from('appointment_intervenants').select('intervenant_id').eq('appointment_id', data.id),
    ]);
    return ok(200, { ...data, responsables: responsables ?? [], intervenants: intervenants ?? [] });
  }

  if (method === 'POST' && !segments[1]) {
    requireScope(ctx, 'appointments:write');
    const allowed = ['poste_id', 'debut', 'fin', 'client_id', 'vehicule_id', 'client_nom',
      'client_tel', 'marque', 'modele', 'annee', 'vin', 'notes'];
    assertAllowedFields(body, allowed);
    if (!body.poste_id || !body.debut || !body.fin) {
      throw new ApiError(400, 'DONNEES_MANQUANTES', 'poste_id, debut et fin sont obligatoires.');
    }
    if (new Date(String(body.fin)) <= new Date(String(body.debut))) {
      throw new ApiError(400, 'PLAGE_INVALIDE', 'La fin du rendez-vous doit être postérieure au début.');
    }
    const { data: poste } = await db.from('postes').select('id, actif').eq('id', body.poste_id).maybeSingle();
    if (!poste || !poste.actif) throw new ApiError(404, 'POSTE_INTROUVABLE', 'Poste introuvable ou inactif.');
    await assertVehiculeClientCoherent(body.client_id as string | undefined, body.vehicule_id as string | undefined);

    const conflits = await detectRdvConflicts(String(body.poste_id), String(body.debut), String(body.fin));
    if (conflits.length) {
      await audit(ctx, { resource: 'rendez_vous', operation: 'blocked', result: 'denied',
        denial_reason: 'Conflit de planning', new_value: { poste_id: body.poste_id, debut: body.debut, fin: body.fin } });
      throw new ApiError(409, 'CONFLIT_PLANNING', 'Ce créneau est déjà occupé sur ce poste.', { conflits });
    }
    const payload = {
      poste_id: body.poste_id, debut: body.debut, fin: body.fin,
      client_id: body.client_id ?? null, vehicule_id: body.vehicule_id ?? null,
      client_nom: body.client_nom ?? null, client_tel: body.client_tel ?? null,
      marque: body.marque ?? null, modele: body.modele ?? null, annee: body.annee ?? null,
      vin: body.vin ? String(body.vin).toUpperCase() : null,
      notes: body.notes ?? null, statut: 'prevu',
    };
    if (ctx.dryRun) return ok(200, { dry_run: true, apercu: payload, conflits: [] });
    const { data, error } = await db.from('rendez_vous').insert(payload).select(RDV_FIELDS).single();
    if (error) throw new ApiError(422, 'CREATION_IMPOSSIBLE', 'Impossible de créer le rendez-vous.');
    await audit(ctx, { resource: 'rendez_vous', record_id: data.id, operation: 'create', new_value: data, result: 'success' });
    return ok(201, data);
  }

  if (method === 'PATCH' && segments[1]) {
    requireScope(ctx, 'appointments:write');
    const id = segments[1];
    if (body.statut === 'annule') {
      await audit(ctx, { resource: 'rendez_vous', record_id: id, operation: 'blocked', result: 'denied',
        denial_reason: 'Annulation interdite via API v1' });
      throw new ApiError(403, 'ANNULATION_INTERDITE',
        'L\'annulation d\'un rendez-vous est interdite via cette API.');
    }
    const allowed = ['poste_id', 'debut', 'fin', 'notes', 'client_nom', 'client_tel',
      'marque', 'modele', 'annee', 'vin', 'client_id', 'vehicule_id', 'statut'];
    assertAllowedFields(body, allowed, ['updated_at', 'etag', 'confirmed_change_acknowledged']);
    const { data: current } = await db.from('rendez_vous').select('*').eq('id', id).maybeSingle();
    if (!current) throw new ApiError(404, 'RDV_INTROUVABLE', 'Rendez-vous introuvable.');
    if (current.statut === 'annule') {
      throw new ApiError(422, 'RDV_ANNULE', 'Un rendez-vous annulé ne peut pas être modifié via l\'API.');
    }
    if (body.statut && !['prevu', 'confirme', 'termine'].includes(String(body.statut))) {
      throw new ApiError(403, 'STATUT_INTERDIT', 'Ce changement de statut n\'est pas autorisé via l\'API.');
    }
    requireEtag(ctx, current);

    const patch: Record<string, unknown> = {};
    for (const f of allowed) if (f in body) patch[f] = body[f];
    if (patch.vin) patch.vin = String(patch.vin).toUpperCase();
    if (!Object.keys(patch).length) throw new ApiError(400, 'AUCUNE_MODIFICATION', 'Aucun champ modifiable fourni.');

    const clientId = (patch.client_id ?? current.client_id) as string | undefined;
    const vehiculeId = (patch.vehicule_id ?? current.vehicule_id) as string | undefined;
    await assertVehiculeClientCoherent(clientId, vehiculeId);

    const creneauChange = ['poste_id', 'debut', 'fin'].some((f) => f in patch);
    let conflits: unknown[] = [];
    if (creneauChange) {
      conflits = await detectRdvConflicts(
        String(patch.poste_id ?? current.poste_id),
        String(patch.debut ?? current.debut),
        String(patch.fin ?? current.fin), id);
    }
    if (current.statut === 'confirme' && body.confirmed_change_acknowledged !== true) {
      await audit(ctx, { resource: 'rendez_vous', record_id: id, operation: 'blocked', result: 'denied',
        denial_reason: 'Modification d\'un RDV confirmé sans accusé explicite' });
      throw new ApiError(422, 'CONFIRMATION_REQUISE',
        'Ce rendez-vous est confirmé. Renvoyez la requête avec confirmed_change_acknowledged: true pour valider la modification.',
        { apercu: { ...current, ...patch }, conflits });
    }
    if (conflits.length) {
      await audit(ctx, { resource: 'rendez_vous', record_id: id, operation: 'blocked', result: 'denied',
        denial_reason: 'Conflit de planning' });
      throw new ApiError(409, 'CONFLIT_PLANNING', 'Le nouveau créneau est déjà occupé sur ce poste.', { conflits });
    }
    if (ctx.dryRun) return ok(200, { dry_run: true, avant: current, apercu: { ...current, ...patch }, conflits: [] });
    const { data, error } = await db.from('rendez_vous').update(patch).eq('id', id).select(RDV_FIELDS).single();
    if (error) throw new ApiError(422, 'MODIFICATION_IMPOSSIBLE', 'Impossible de modifier le rendez-vous.');
    await audit(ctx, { resource: 'rendez_vous', record_id: id, operation: 'update',
      old_value: Object.fromEntries(Object.keys(patch).map((k) => [k, (current as any)[k]])),
      new_value: patch, result: 'success' });
    return ok(200, data);
  }

  if (method === 'DELETE') {
    throw new ApiError(403, 'SUPPRESSION_INTERDITE', 'La suppression est interdite via cette API.');
  }

  throw new ApiError(404, 'ROUTE_INTROUVABLE', 'Route introuvable.');
}

async function assertVehiculeClientCoherent(clientId?: string, vehiculeId?: string) {
  if (!vehiculeId) return;
  const { data: vehicule } = await db.from('vehicules').select('id, client_id').eq('id', vehiculeId).maybeSingle();
  if (!vehicule) throw new ApiError(404, 'VEHICULE_INTROUVABLE', 'Véhicule introuvable.');
  if (clientId && vehicule.client_id && vehicule.client_id !== clientId) {
    throw new ApiError(422, 'VEHICULE_NON_RATTACHE',
      'Le véhicule sélectionné n\'appartient pas au client sélectionné.', {
        proprietaire_actuel_id: vehicule.client_id,
      });
  }
}

async function handleQuoteRequests(ctx: Ctx, segments: string[]): Promise<Response> {
  const { method, url, body } = ctx;

  if (method === 'GET' && !segments[1]) {
    requireScope(ctx, 'quotes:read');
    const { limit, offset } = pagination(url);
    let q = db.from('devis').select(DEVIS_FIELDS, { count: 'exact' });
    for (const [param, col] of [['statut', 'statut'], ['client_id', 'client_id'],
      ['vehicule_id', 'vehicule_id'], ['responsable', 'assigned_user_id']] as const) {
      const v = url.searchParams.get(param);
      if (v) q = q.eq(col, v);
    }
    const date = url.searchParams.get('date');
    if (date) q = q.gte('created_at', `${date}T00:00:00.000Z`).lte('created_at', `${date}T23:59:59.999Z`);
    const metier = url.searchParams.get('metier');
    if (metier) {
      const { data: links } = await db.from('devis_metiers').select('devis_id').eq('metier_id', metier);
      const ids = (links ?? []).map((l: any) => l.devis_id);
      if (!ids.length) return ok(200, [], { count: 0, limit, offset });
      q = q.in('id', ids);
    }
    const intervenant = url.searchParams.get('intervenant');
    if (intervenant) {
      const { data: links } = await db.from('devis_intervenants').select('devis_id').eq('intervenant_id', intervenant);
      const ids = (links ?? []).map((l: any) => l.devis_id);
      if (!ids.length) return ok(200, [], { count: 0, limit, offset });
      q = q.in('id', ids);
    }
    const { data, count } = await q.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    return ok(200, data ?? [], { count: count ?? 0, limit, offset });
  }

  if (method === 'GET' && segments[1]) {
    requireScope(ctx, 'quotes:read');
    const { data } = await db.from('devis').select(DEVIS_FIELDS).eq('id', segments[1]).maybeSingle();
    if (!data) throw new ApiError(404, 'DEVIS_INTROUVABLE', 'Demande de devis introuvable.');
    const [{ data: lignes }, { data: metiers }, { data: pj }] = await Promise.all([
      db.from('devis_lines').select('id, type, name, quantity, unit_price, description, sort_order')
        .eq('devis_id', data.id).order('sort_order'),
      db.from('devis_metiers').select('metier_id').eq('devis_id', data.id),
      db.from('devis_attachments').select('id, file_name, content_type, file_size, created_at').eq('devis_id', data.id),
    ]);
    return ok(200, { ...data, lignes: lignes ?? [], metiers: (metiers ?? []).map((m: any) => m.metier_id), pieces_jointes: pj ?? [] });
  }

  if (method === 'POST' && !segments[1]) {
    requireScope(ctx, 'quotes:write');
    const allowed = ['client_id', 'vehicule_id', 'client_nom', 'client_tel', 'marque',
      'modele', 'annee', 'vin', 'notes', 'metiers'];
    assertAllowedFields(body, allowed);
    await assertVehiculeClientCoherent(body.client_id as string | undefined, body.vehicule_id as string | undefined);
    if (!body.client_id && !body.client_nom) {
      throw new ApiError(400, 'CLIENT_REQUIS',
        'Fournissez client_id (recommandé) ou au minimum client_nom. Créez le client via POST /clients si besoin.');
    }
    const payload = {
      client_id: body.client_id ?? null, vehicule_id: body.vehicule_id ?? null,
      client_nom: body.client_nom ?? null, client_tel: body.client_tel ?? null,
      marque: body.marque ?? null, modele: body.modele ?? null, annee: body.annee ?? null,
      vin: body.vin ? String(body.vin).toUpperCase() : null,
      notes: body.notes ?? null, statut: 'demande_recue',
    };
    if (ctx.dryRun) return ok(200, { dry_run: true, apercu: payload });
    const { data, error } = await db.from('devis').insert(payload).select(DEVIS_FIELDS).single();
    if (error) throw new ApiError(422, 'CREATION_IMPOSSIBLE', 'Impossible de créer la demande de devis.');
    if (Array.isArray(body.metiers) && body.metiers.length) {
      await db.from('devis_metiers').insert(
        (body.metiers as string[]).map((m) => ({ devis_id: data.id, metier_id: m })));
    }
    await audit(ctx, { resource: 'devis', record_id: data.id, operation: 'create', new_value: data, result: 'success' });
    return ok(201, data);
  }

  if (method === 'PATCH' && segments[1]) {
    requireScope(ctx, 'quotes:write');
    const id = segments[1];
    const allowed = ['client_id', 'vehicule_id', 'client_nom', 'client_tel', 'marque',
      'modele', 'annee', 'vin', 'notes', 'statut'];
    assertAllowedFields(body, allowed, ['updated_at', 'etag']);
    const { data: current } = await db.from('devis').select('*').eq('id', id).maybeSingle();
    if (!current) throw new ApiError(404, 'DEVIS_INTROUVABLE', 'Demande de devis introuvable.');
    if (DEVIS_STATUTS_VERROUILLES.includes(current.statut)) {
      await audit(ctx, { resource: 'devis', record_id: id, operation: 'blocked', result: 'denied',
        denial_reason: `Devis verrouillé (statut ${current.statut})` });
      throw new ApiError(403, 'DEVIS_VERROUILLE',
        'Ce devis a déjà été envoyé, validé, refusé ou annulé : il n\'est plus modifiable via l\'API.',
        { statut: current.statut });
    }
    if (body.statut && !DEVIS_STATUTS_MODIFIABLES.includes(String(body.statut))) {
      await audit(ctx, { resource: 'devis', record_id: id, operation: 'blocked', result: 'denied',
        denial_reason: `Transition de statut interdite vers ${body.statut}` });
      throw new ApiError(403, 'STATUT_INTERDIT',
        'L\'envoi, la validation, le refus ou l\'annulation d\'un devis sont réservés à l\'interface Powertech.');
    }
    requireEtag(ctx, current);
    const patch: Record<string, unknown> = {};
    for (const f of allowed) if (f in body) patch[f] = body[f];
    if (patch.vin) patch.vin = String(patch.vin).toUpperCase();
    if (!Object.keys(patch).length) throw new ApiError(400, 'AUCUNE_MODIFICATION', 'Aucun champ modifiable fourni.');
    await assertVehiculeClientCoherent(
      (patch.client_id ?? current.client_id) as string | undefined,
      (patch.vehicule_id ?? current.vehicule_id) as string | undefined);
    if (ctx.dryRun) return ok(200, { dry_run: true, avant: current, apercu: { ...current, ...patch } });
    const { data, error } = await db.from('devis').update(patch).eq('id', id).select(DEVIS_FIELDS).single();
    if (error) throw new ApiError(422, 'MODIFICATION_IMPOSSIBLE', 'Impossible de modifier la demande de devis.');
    await audit(ctx, { resource: 'devis', record_id: id, operation: 'update',
      old_value: Object.fromEntries(Object.keys(patch).map((k) => [k, (current as any)[k]])),
      new_value: patch, result: 'success' });
    return ok(200, data);
  }

  throw new ApiError(404, 'ROUTE_INTROUVABLE', 'Route introuvable.');
}

async function handleMaintenance(ctx: Ctx, segments: string[]): Promise<Response> {
  const { method, url, body } = ctx;
  if (method === 'GET') {
    requireScope(ctx, 'maintenance:read');
    if (segments[1]) {
      const { data } = await db.from('entretiens').select('*').eq('id', segments[1]).maybeSingle();
      if (!data) throw new ApiError(404, 'ENTRETIEN_INTROUVABLE', 'Entretien introuvable.');
      return ok(200, data);
    }
    const { limit, offset } = pagination(url);
    let q = db.from('entretiens').select('*', { count: 'exact' });
    const vehiculeId = url.searchParams.get('vehicule_id');
    if (vehiculeId) q = q.eq('vehicule_id', vehiculeId);
    const { data, count } = await q.order('date_entretien', { ascending: false }).range(offset, offset + limit - 1);
    return ok(200, data ?? [], { count: count ?? 0, limit, offset });
  }
  if (method === 'POST') {
    requireScope(ctx, 'maintenance:write');
    const allowed = ['vehicule_id', 'date_entretien', 'type_entretien', 'kilometrage',
      'description', 'pieces_utilisees', 'cout', 'rdv_id', 'devis_id'];
    assertAllowedFields(body, allowed);
    if (!body.vehicule_id || !body.date_entretien || !body.type_entretien) {
      throw new ApiError(400, 'DONNEES_MANQUANTES', 'vehicule_id, date_entretien et type_entretien sont obligatoires.');
    }
    const payload = Object.fromEntries(allowed.filter((f) => f in body).map((f) => [f, body[f]]));
    if (ctx.dryRun) return ok(200, { dry_run: true, apercu: payload });
    const { data, error } = await db.from('entretiens').insert(payload).select('*').single();
    if (error) throw new ApiError(422, 'CREATION_IMPOSSIBLE', 'Impossible de créer l\'entretien.');
    await audit(ctx, { resource: 'entretiens', record_id: data.id, operation: 'create', new_value: data, result: 'success' });
    return ok(201, data);
  }
  throw new ApiError(404, 'ROUTE_INTROUVABLE', 'Route introuvable.');
}

async function handleResources(ctx: Ctx): Promise<Response> {
  requireScope(ctx, 'availability:read');
  const [{ data: metiers }, { data: postes }, { data: intervenants }, { data: settings }] = await Promise.all([
    db.from('metiers').select('id, nom, couleur'),
    db.from('postes').select('id, metier_id, nom, actif').eq('actif', true),
    db.from('intervenants').select('id, name'),
    db.from('app_settings').select('jours_ouvres, heure_min, heure_max').eq('id', 1).maybeSingle(),
  ]);
  return ok(200, {
    metiers: metiers ?? [], postes: postes ?? [],
    intervenants: intervenants ?? [], horaires: settings ?? null,
  });
}

async function route(ctx: Ctx, segments: string[]): Promise<Response> {
  switch (segments[0]) {
    case 'health':
      return ok(200, { status: 'ok', version: 'v1' });
    case 'me':
      return ok(200, {
        integration: ctx.integration.name,
        scopes: ctx.integration.scopes,
        expires_at: ctx.integration.expires_at,
      });
    case 'clients': return handleClients(ctx, segments);
    case 'vehicles': return handleVehicles(ctx, segments);
    case 'availability': return handleAvailability(ctx);
    case 'resources': return handleResources(ctx);
    case 'appointments': return handleAppointments(ctx, segments);
    case 'quote-requests': return handleQuoteRequests(ctx, segments);
    case 'maintenance': return handleMaintenance(ctx, segments);
    default:
      throw new ApiError(404, 'ROUTE_INTROUVABLE', 'Route introuvable.');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  const url = new URL(req.url);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;

  try {
    if (req.method === 'DELETE') {
      throw new ApiError(403, 'SUPPRESSION_INTERDITE', 'La suppression de données est interdite via cette API.');
    }

    // /functions/v1/api-v1/api/v1/<...>  ou  /api/v1/<...>
    const parts = url.pathname.split('/').filter(Boolean);
    const vIndex = parts.lastIndexOf('v1');
    const segments = parts.slice(vIndex + 1);

    if (segments[0] === 'health') {
      return ok(200, { status: 'ok', version: 'v1' });
    }

    if (ip) await enforceRateLimit(`ip:${ip}`);
    const integration = await authenticate(req);
    await enforceRateLimit(`key:${integration.id}`);

    let body: Record<string, unknown> = {};
    if (req.method === 'POST' || req.method === 'PATCH') {
      const raw = await req.text();
      if (raw) {
        try { body = JSON.parse(raw); } catch {
          throw new ApiError(400, 'JSON_INVALIDE', 'Le corps de la requête n\'est pas un JSON valide.');
        }
      }
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new ApiError(400, 'JSON_INVALIDE', 'Le corps de la requête doit être un objet JSON.');
      }
    }

    const dryRun = url.searchParams.get('dry_run') === 'true' || body.dry_run === true;
    delete body.dry_run;
    const idempotencyKey = req.headers.get('Idempotency-Key');

    const ctx: Ctx = { integration, requestId, ip, url, method: req.method, body, dryRun, idempotencyKey };

    // Idempotence sur les créations
    let requestHash = '';
    if (req.method === 'POST' && idempotencyKey && !dryRun) {
      requestHash = await sha256Hex(`${url.pathname}|${JSON.stringify(body)}`);
      const { data: existing } = await db.from('api_idempotency_keys').select('*')
        .eq('integration_id', integration.id).eq('idempotency_key', idempotencyKey).maybeSingle();
      if (existing) {
        if (existing.request_hash !== requestHash) {
          throw new ApiError(409, 'IDEMPOTENCY_KEY_REUTILISEE',
            'Cette clé d\'idempotence a déjà été utilisée avec une requête différente.');
        }
        return json(existing.status_code, existing.response);
      }
    }

    db.from('api_integrations').update({ last_used_at: new Date().toISOString() })
      .eq('id', integration.id).then(() => {});

    const response = await route(ctx, segments);

    if (req.method === 'POST' && idempotencyKey && !dryRun && response.status < 400) {
      const cloned = await response.clone().json();
      await db.from('api_idempotency_keys').insert({
        integration_id: integration.id,
        idempotency_key: idempotencyKey,
        endpoint: url.pathname,
        request_hash: requestHash,
        status_code: response.status,
        response: cloned,
      });
    }

    return response;
  } catch (e) {
    if (e instanceof ApiError) return errorResponse(e, requestId);
    console.error(`[${requestId}] erreur interne`, e instanceof Error ? e.message : 'inconnue');
    return json(500, {
      error: { code: 'ERREUR_INTERNE', message: 'Une erreur interne est survenue.', details: {}, request_id: requestId },
    });
  }
});
