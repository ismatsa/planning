import type { Devis, StatutDevis } from '@/types/devis';

/** Fenêtre de rétention / relance : 7 jours pleins (UTC). */
export const RETENTION_DAYS = 7;
export const RETENTION_MS = RETENTION_DAYS * 24 * 3600 * 1000;

/** Colonnes de fin de workflow soumises à la rétention. */
export const CLOSED_STATUSES: StatutDevis[] = ['valide', 'refuse', 'annule'];

export function isClosedStatus(statut: StatutDevis): boolean {
  return CLOSED_STATUSES.includes(statut);
}

function parse(date?: string | null): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Date réelle de passage dans le statut courant.
 * `status_changed_at` uniquement (plus `sent_at` pour le statut « envoyé »).
 * `created_at` n'est JAMAIS utilisé comme approximation.
 */
export function statusChangedAt(
  d: Pick<Devis, 'statut' | 'statusChangedAt' | 'sentAt'>,
): number | null {
  if (d.statut === 'envoye') {
    return parse(d.sentAt) ?? parse(d.statusChangedAt);
  }
  return parse(d.statusChangedAt);
}

/** Âge en millisecondes du statut courant, ou null si aucune date fiable. */
export function statusAgeMs(
  d: Pick<Devis, 'statut' | 'statusChangedAt' | 'sentAt'>,
  now: number = Date.now(),
): number | null {
  const t = statusChangedAt(d);
  return t === null ? null : now - t;
}

/**
 * Visibilité dans les colonnes Validé / Refusé / Annulé :
 * strictement moins de 7 × 24 h, et date fiable obligatoire.
 * Les autres colonnes ne sont pas filtrées.
 */
export function isVisibleInKanban(
  d: Pick<Devis, 'statut' | 'statusChangedAt' | 'sentAt'>,
  now: number = Date.now(),
): boolean {
  if (!isClosedStatus(d.statut)) return true;
  const age = statusAgeMs(d, now);
  if (age === null) return false;
  return age < RETENTION_MS;
}

/** Devis envoyé depuis plus de 7 jours : une relance est recommandée. */
export function needsFollowUp(
  d: Pick<Devis, 'statut' | 'statusChangedAt' | 'sentAt'>,
  now: number = Date.now(),
): boolean {
  if (d.statut !== 'envoye') return false;
  const age = statusAgeMs(d, now);
  return age !== null && age > RETENTION_MS;
}
