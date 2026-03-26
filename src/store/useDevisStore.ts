import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Devis, StatutDevis } from '@/types/devis';

function mapDevis(row: any): Devis {
  return {
    id: row.id,
    clientNom: row.client_nom || undefined,
    clientTel: row.client_tel || undefined,
    marque: row.marque || undefined,
    modele: row.modele || undefined,
    annee: row.annee || undefined,
    vin: row.vin || undefined,
    notes: row.notes || undefined,
    statut: row.statut as StatutDevis,
    billingResponsibleUserId: row.billing_responsible_user_id || undefined,
    assignedUserId: row.assigned_user_id || undefined,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useDevisStore() {
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [devisResponsibles, setDevisResponsibles] = useState<Record<string, string[]>>({});
  const [devisIntervenants, setDevisIntervenants] = useState<Record<string, string[]>>({});
  const [devisMetiers, setDevisMetiers] = useState<Record<string, string[]>>({});
  const [devisLoaded, setDevisLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const [devisRes, respRes, intRes, metRes] = await Promise.all([
        supabase.from('devis').select('*'),
        supabase.from('devis_responsibles').select('*'),
        supabase.from('devis_intervenants').select('*'),
        supabase.from('devis_metiers').select('*'),
      ]);

      if (devisRes.data) setDevisList(devisRes.data.map(mapDevis));

      if (respRes.data) {
        const map: Record<string, string[]> = {};
        for (const r of respRes.data as any[]) {
          if (!map[r.devis_id]) map[r.devis_id] = [];
          map[r.devis_id].push(r.user_id);
        }
        setDevisResponsibles(map);
      }

      if (intRes.data) {
        const map: Record<string, string[]> = {};
        for (const r of intRes.data as any[]) {
          if (!map[r.devis_id]) map[r.devis_id] = [];
          map[r.devis_id].push(r.intervenant_id);
        }
        setDevisIntervenants(map);
      }

      if (metRes.data) {
        const map: Record<string, string[]> = {};
        for (const r of metRes.data as any[]) {
          if (!map[r.devis_id]) map[r.devis_id] = [];
          map[r.devis_id].push(r.metier_id);
        }
        setDevisMetiers(map);
      }

      setDevisLoaded(true);
    }
    load();
  }, []);

  const addDevis = useCallback(async (
    devis: Omit<Devis, 'id' | 'createdAt' | 'updatedAt'>,
    responsibleIds: string[],
    intervenantIds: string[],
    metierIds: string[],
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.from('devis').insert({
      client_nom: devis.clientNom || null,
      client_tel: devis.clientTel || null,
      marque: devis.marque || null,
      modele: devis.modele || null,
      annee: devis.annee || null,
      vin: devis.vin || null,
      notes: devis.notes || null,
      statut: devis.statut,
      billing_responsible_user_id: devis.billingResponsibleUserId || null,
      assigned_user_id: devis.assignedUserId || null,
      created_by: session?.user?.id || null,
    } as any).select().single();

    if (data && !error) {
      const newDevis = mapDevis(data);
      setDevisList(prev => [...prev, newDevis]);

      if (responsibleIds.length > 0) {
        await supabase.from('devis_responsibles').insert(
          responsibleIds.map(uid => ({ devis_id: newDevis.id, user_id: uid })) as any
        );
        setDevisResponsibles(prev => ({ ...prev, [newDevis.id]: responsibleIds }));
      }

      if (intervenantIds.length > 0) {
        await supabase.from('devis_intervenants').insert(
          intervenantIds.map(iid => ({ devis_id: newDevis.id, intervenant_id: iid })) as any
        );
        setDevisIntervenants(prev => ({ ...prev, [newDevis.id]: intervenantIds }));
      }

      if (metierIds.length > 0) {
        await supabase.from('devis_metiers').insert(
          metierIds.map(mid => ({ devis_id: newDevis.id, metier_id: mid })) as any
        );
        setDevisMetiers(prev => ({ ...prev, [newDevis.id]: metierIds }));
      }

      return newDevis;
    }
    return null;
  }, []);

  const updateDevis = useCallback(async (
    devis: Devis,
    responsibleIds?: string[],
    intervenantIds?: string[],
    metierIds?: string[],
  ) => {
    const { data, error } = await supabase.from('devis').update({
      client_nom: devis.clientNom || null,
      client_tel: devis.clientTel || null,
      marque: devis.marque || null,
      modele: devis.modele || null,
      annee: devis.annee || null,
      vin: devis.vin || null,
      notes: devis.notes || null,
      statut: devis.statut,
      billing_responsible_user_id: devis.billingResponsibleUserId || null,
      assigned_user_id: devis.assignedUserId || null,
    }).eq('id', devis.id).select().single();

    if (data && !error) {
      setDevisList(prev => prev.map(d => d.id === devis.id ? mapDevis(data) : d));

      if (responsibleIds !== undefined) {
        await supabase.from('devis_responsibles').delete().eq('devis_id', devis.id);
        if (responsibleIds.length > 0) {
          await supabase.from('devis_responsibles').insert(
            responsibleIds.map(uid => ({ devis_id: devis.id, user_id: uid })) as any
          );
        }
        setDevisResponsibles(prev => ({ ...prev, [devis.id]: responsibleIds }));
      }

      if (intervenantIds !== undefined) {
        await supabase.from('devis_intervenants').delete().eq('devis_id', devis.id);
        if (intervenantIds.length > 0) {
          await supabase.from('devis_intervenants').insert(
            intervenantIds.map(iid => ({ devis_id: devis.id, intervenant_id: iid })) as any
          );
        }
        setDevisIntervenants(prev => ({ ...prev, [devis.id]: intervenantIds }));
      }

      if (metierIds !== undefined) {
        await supabase.from('devis_metiers').delete().eq('devis_id', devis.id);
        if (metierIds.length > 0) {
          await supabase.from('devis_metiers').insert(
            metierIds.map(mid => ({ devis_id: devis.id, metier_id: mid })) as any
          );
        }
        setDevisMetiers(prev => ({ ...prev, [devis.id]: metierIds }));
      }
    }
  }, []);

  const deleteDevis = useCallback(async (id: string) => {
    const { error } = await supabase.from('devis').delete().eq('id', id);
    if (!error) {
      setDevisList(prev => prev.filter(d => d.id !== id));
    }
  }, []);

  return {
    devisList,
    devisResponsibles,
    devisIntervenants,
    devisMetiers,
    devisLoaded,
    addDevis,
    updateDevis,
    deleteDevis,
  };
}
