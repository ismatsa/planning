import type { Metier, Poste } from '@/types';

export type LayoutRowType = 'poste' | 'small_separator' | 'large_separator';

/** Ligne du planning : un poste ou un séparateur visuel. */
export interface LayoutRow {
  /** Clé locale stable (uuid DB ou clé générée). */
  key: string;
  type: LayoutRowType;
  /** Renseigné uniquement pour les lignes de type `poste`. */
  posteId?: string;
  /** Libellé facultatif des grands séparateurs. */
  label?: string;
}

/** Bloc catégorie : les postes d'une même catégorie restent regroupés. */
export interface LayoutGroup {
  metierId: string;
  rows: LayoutRow[];
}

/** Ligne telle que stockée en base. */
export interface LayoutItemRow {
  id: string;
  type: LayoutRowType;
  poste_id: string | null;
  metier_id: string | null;
  position: number;
  label: string | null;
}

let counter = 0;
export function newRowKey(prefix = 'row'): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

/**
 * Construit l'organisation effective : le layout enregistré fait foi,
 * complété par les postes/catégories qui n'y figurent pas encore.
 * Ne modifie jamais la catégorie d'un poste.
 */
export function buildGroups(
  postes: Poste[],
  metiers: Metier[],
  items: LayoutItemRow[],
): LayoutGroup[] {
  const posteById = new Map(postes.map(p => [p.id, p]));
  const metierIds = new Set(metiers.map(m => m.id));
  const sorted = [...items].sort((a, b) => a.position - b.position);

  const groups: LayoutGroup[] = [];
  const groupByMetier = new Map<string, LayoutGroup>();
  const ensureGroup = (metierId: string) => {
    let g = groupByMetier.get(metierId);
    if (!g) {
      g = { metierId, rows: [] };
      groupByMetier.set(metierId, g);
      groups.push(g);
    }
    return g;
  };

  const placed = new Set<string>();

  for (const it of sorted) {
    if (it.type === 'poste') {
      const poste = it.poste_id ? posteById.get(it.poste_id) : undefined;
      if (!poste || placed.has(poste.id)) continue;
      placed.add(poste.id);
      ensureGroup(poste.metierId).rows.push({ key: it.id, type: 'poste', posteId: poste.id });
    } else {
      if (!it.metier_id || !metierIds.has(it.metier_id)) continue;
      ensureGroup(it.metier_id).rows.push({
        key: it.id,
        type: it.type,
        label: it.label ?? undefined,
      });
    }
  }

  // Catégories et postes non encore présents dans le layout
  for (const m of metiers) {
    const missing = postes
      .filter(p => p.metierId === m.id && !placed.has(p.id))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    if (missing.length === 0 && !groupByMetier.has(m.id)) continue;
    const g = ensureGroup(m.id);
    for (const p of missing) {
      placed.add(p.id);
      g.rows.push({ key: newRowKey('poste'), type: 'poste', posteId: p.id });
    }
  }

  return groups.filter(g => g.rows.length > 0);
}

/** Aplati les groupes en lignes ordonnées (ordre réel du planning). */
export function flattenGroups(groups: LayoutGroup[]): { row: LayoutRow; metierId: string }[] {
  const out: { row: LayoutRow; metierId: string }[] = [];
  for (const g of groups) for (const row of g.rows) out.push({ row, metierId: g.metierId });
  return out;
}

/** Convertit les groupes en payload de persistance. */
export function groupsToPayload(groups: LayoutGroup[]) {
  return flattenGroups(groups).map(({ row, metierId }) => ({
    type: row.type,
    poste_id: row.type === 'poste' ? row.posteId ?? null : null,
    metier_id: metierId,
    label: row.type === 'large_separator' ? row.label ?? null : null,
  }));
}

/** Organisation par défaut dérivée des catégories et de l'ordre existants. */
export function defaultGroups(postes: Poste[], metiers: Metier[]): LayoutGroup[] {
  return buildGroups(postes, metiers, []);
}
