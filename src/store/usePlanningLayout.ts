import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { LayoutItemRow } from '@/lib/planningLayout';

export interface SaveLayoutResult {
  ok: boolean;
  conflict: boolean;
  version: string | null;
  error?: string;
}

/** Source de vérité de l'ordre d'affichage global du planning Postes. */
export function usePlanningLayout() {
  const [layoutItems, setLayoutItems] = useState<LayoutItemRow[]>([]);
  const [layoutVersion, setLayoutVersion] = useState<string | null>(null);
  const [layoutLoaded, setLayoutLoaded] = useState(false);

  const reloadLayout = useCallback(async () => {
    const [itemsRes, metaRes] = await Promise.all([
      supabase.from('planning_layout_items').select('*').order('position'),
      supabase.from('planning_layout_meta').select('updated_at').eq('id', 1).maybeSingle(),
    ]);
    if (itemsRes.data) setLayoutItems(itemsRes.data as unknown as LayoutItemRow[]);
    setLayoutVersion((metaRes.data as any)?.updated_at ?? null);
    setLayoutLoaded(true);
  }, []);

  useEffect(() => { reloadLayout(); }, [reloadLayout]);

  // Rafraîchissement temps réel pour tous les utilisateurs connectés
  useEffect(() => {
    const channel = supabase
      .channel('planning-layout')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planning_layout_meta' }, () => {
        reloadLayout();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [reloadLayout]);

  const savePlanningLayout = useCallback(async (
    items: { type: string; poste_id: string | null; metier_id: string | null; label: string | null }[],
    expectedVersion: string | null,
  ): Promise<SaveLayoutResult> => {
    const { data, error } = await supabase.rpc('save_planning_layout' as any, {
      p_items: items as any,
      p_expected_version: expectedVersion,
    });
    if (error) return { ok: false, conflict: false, version: null, error: error.message };
    const res = data as any;
    if (res?.ok) {
      await reloadLayout();
      return { ok: true, conflict: false, version: res.version ?? null };
    }
    await reloadLayout();
    return { ok: false, conflict: !!res?.conflict, version: res?.version ?? null };
  }, [reloadLayout]);

  return { layoutItems, layoutVersion, layoutLoaded, reloadLayout, savePlanningLayout };
}
