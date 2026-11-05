import type { LayoutItemRow } from '@/lib/planningLayout';

export interface SaveLayoutResult {
  ok: boolean;
  conflict: boolean;
  version: string | null;
  error?: string;
}

/**
 * Organisation personnalisée des lignes du planning.
 * Non portée sur le back-end PHP (v1) : l'ordre par défaut (sort_order des postes) s'applique.
 */
export function usePlanningLayout() {
  const layoutItems: LayoutItemRow[] = [];
  const layoutVersion: string | null = null;
  const layoutLoaded = true;

  const reloadLayout = async () => {};

  const savePlanningLayout = async (): Promise<SaveLayoutResult> => ({
    ok: false,
    conflict: false,
    version: null,
    error: 'Fonction non disponible sur cette installation.',
  });

  return { layoutItems, layoutVersion, layoutLoaded, reloadLayout, savePlanningLayout };
}
