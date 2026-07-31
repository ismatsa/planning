// Helpers purs partagés par la passerelle Hermes (testables sans réseau).

export const STATUS_LABELS: Record<string, string> = {
  processing: 'Analyse en cours…',
  needs_information: 'Information manquante',
  confirmation_required: 'Confirmation requise',
  completed: 'Action réalisée.',
  failed: 'Erreur lors du traitement.',
};

/**
 * Texte affiché à l'utilisateur :
 * 1. body.message
 * 2. body.result.message
 * 3. body.summary / body.result.summary
 * 4. message technique de secours
 */
export function resolveAssistantContent(body: any, status: string): string {
  const candidates = [
    body?.message,
    body?.result?.message,
    body?.summary,
    body?.result?.summary,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return STATUS_LABELS[status] ?? 'Mise à jour';
}

/** Données structurées enregistrées dans assistant_messages.result */
export function buildResultPayload(body: any, status: string) {
  const base = (body?.result && typeof body.result === 'object' && !Array.isArray(body.result))
    ? { ...body.result }
    : (body?.result !== undefined && body?.result !== null ? { value: body.result } : {});
  return {
    ...base,
    status,
    summary: body?.summary ?? base.summary ?? null,
    action: body?.action ?? base.action ?? null,
    warnings: body?.warnings ?? base.warnings ?? [],
    missing_fields: body?.missing_fields ?? base.missing_fields ?? [],
  };
}

/** Identifiant de session Hermes renvoyé par le worker (plusieurs alias tolérés). */
export function resolveSessionId(body: any): string | null {
  const candidates = [
    body?.hermes_session_id,
    body?.session_id,
    body?.result?.hermes_session_id,
    body?.result?.session_id,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim().slice(0, 200);
  }
  return null;
}
