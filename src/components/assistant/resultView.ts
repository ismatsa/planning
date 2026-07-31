import type { AssistantStatus } from '@/hooks/useAssistant';

/** Convertit une valeur scalaire en texte lisible. Jamais "[object Object]". */
export function scalarText(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return '';
}

/** Texte lisible pour un élément de liste (puce). */
export function bulletText(value: any): string {
  const scalar = scalarText(value);
  if (scalar) return scalar;
  if (Array.isArray(value)) return value.map(bulletText).filter(Boolean).join(', ');
  if (value && typeof value === 'object') {
    const preferred = value.label ?? value.message ?? value.name ?? value.text ?? value.field ?? value.value;
    const p = scalarText(preferred);
    if (p) return p;
  }
  return '';
}

export function toBullets(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(bulletText).filter(Boolean);
}

const ACTION_LABELS: Record<string, string> = {
  none: 'Aucune modification effectuée',
  client_created: 'Client créé',
  client_updated: 'Client mis à jour',
  vehicle_created: 'Véhicule créé',
  vehicle_updated: 'Véhicule mis à jour',
  vehicle_transferred: 'Véhicule transféré',
  rdv_created: 'Rendez-vous créé',
  rdv_updated: 'Rendez-vous modifié',
  rdv_moved: 'Rendez-vous déplacé',
  rdv_cancelled: 'Rendez-vous annulé',
  devis_created: 'Devis brouillon créé',
  devis_updated: 'Devis mis à jour',
  reference_found: 'Référence trouvée',
  search: 'Recherche effectuée',
};

/** Phrase lisible pour le bloc Action, ou null si aucune action métier. */
export function actionLabel(action: any): string | null {
  if (!action) return null;
  const asScalar = scalarText(action);
  if (asScalar) return ACTION_LABELS[asScalar] ?? null;
  if (typeof action !== 'object') return null;

  const label = scalarText(action.label);
  if (label) return label;

  const type = scalarText(action.type);
  if (!type || type === 'none') {
    return action.performed === false ? 'Aucune modification effectuée' : null;
  }
  const known = ACTION_LABELS[type];
  if (known) return known;
  return action.performed === true ? 'Action réalisée' : null;
}

export function actionRecordIds(action: any): string[] {
  if (!action || typeof action !== 'object') return [];
  const ids = action.record_ids ?? action.record_id;
  if (Array.isArray(ids)) return ids.map(scalarText).filter(Boolean);
  const one = scalarText(ids);
  return one ? [one] : [];
}

/** Libellés métier autorisés pour le résumé. */
const SUMMARY_LABELS: Record<string, string> = {
  client: 'Client',
  client_nom: 'Client',
  client_name: 'Client',
  vehicule: 'Véhicule',
  vehicle: 'Véhicule',
  vin: 'VIN',
  immatriculation: 'Immatriculation',
  rendez_vous: 'Rendez-vous',
  rdv: 'Rendez-vous',
  appointment: 'Rendez-vous',
  devis: 'Devis',
  quote: 'Devis',
  reference: 'Référence',
  piece: 'Pièce',
  prestation: 'Prestation',
  date: 'Date',
  poste: 'Poste',
  telephone: 'Téléphone',
  marque: 'Marque',
  modele: 'Modèle',
};

export interface SummaryRow { label: string; value: string }

/** Résumé métier compact : uniquement des clés connues, valeurs scalaires non vides. */
export function summaryRows(summary: any): SummaryRow[] {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return [];
  const rows: SummaryRow[] = [];
  for (const [key, raw] of Object.entries(summary)) {
    const label = SUMMARY_LABELS[key.toLowerCase()];
    if (!label) continue;
    let value = scalarText(raw);
    if (!value && raw && typeof raw === 'object') value = bulletText(raw);
    if (!value) continue;
    rows.push({ label, value });
  }
  return rows;
}

/** Texte principal : result.message puis message. */
export function mainMessage(result: any, fallback?: string): string {
  const fromResult = scalarText(result?.message);
  if (fromResult) return fromResult;
  return scalarText(fallback);
}

const BASE_STATUS_LABELS: Record<AssistantStatus, string> = {
  queued: 'En attente',
  processing: 'Analyse en cours',
  needs_information: 'Information manquante',
  confirmation_required: 'Confirmation requise',
  completed: 'Action réalisée',
  failed: 'Erreur',
};

/** Libellé de statut contextualisé par l'action réellement effectuée. */
export function statusLabel(status: AssistantStatus, result?: any): string {
  if (status !== 'completed') return BASE_STATUS_LABELS[status];
  const missing = toBullets(result?.missing_fields);
  if (missing.length > 0) return 'Réponse reçue';
  const performed = result?.action?.performed;
  return performed === true ? 'Action réalisée' : 'Réponse reçue';
}
