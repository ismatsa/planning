import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
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
    billingResponsibleUserId: row.billing_responsible_user_id != null ? String(row.billing_responsible_user_id) : undefined,
    assignedUserId: row.assigned_user_id != null ? String(row.assigned_user_id) : undefined,
    createdBy: row.created_by != null ? String(row.created_by) : undefined,
    clientId: row.client_id || undefined,
    vehiculeId: row.vehicule_id || undefined,
    sentAt: row.sent_at || undefined,
    statusChangedAt: row.status_changed_at || undefined,
    followUpCount: row.follow_up_count ?? 0,
    lastFollowUpAt: row.last_follow_up_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function devisToRow(devis: Partial<Devis>) {
  return {
    client_nom: devis.clientNom || null,
    client_tel: devis.clientTel || null,
    marque: devis.marque || null,
    modele: devis.modele || null,
    annee: devis.annee || null,
    vin: devis.vin || null,
    notes: devis.notes || null,
    statut: devis.statut,
    billing_responsible_user_id: devis.billingResponsibleUserId ? Number(devis.billingResponsibleUserId) : null,
    assigned_user_id: devis.assignedUserId ? Number(devis.assignedUserId) : null,
    client_id: devis.clientId || null,
    vehicule_id: devis.vehiculeId || null,
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
      try {
        const data = await api.get<{
          devis: any[];
          responsibles: Record<string, number[]>;
          intervenants: Record<string, number[]>;
          metiers: Record<string, string[]>;
        }>('/devis');

        if (data?.devis) setDevisList(data.devis.map(mapDevis));

        const respMap: Record<string, string[]> = {};
        for (const [id, ids] of Object.entries(data?.responsibles || {})) respMap[id] = ids.map(String);
        setDevisResponsibles(respMap);

        const intMap: Record<string, string[]> = {};
        for (const [id, ids] of Object.entries(data?.intervenants || {})) intMap[id] = ids.map(String);
        setDevisIntervenants(intMap);

        setDevisMetiers(data?.metiers || {});
      } catch {
        // Non connecté ou API indisponible
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
    const data = await api.post<any>('/devis', {
      ...devisToRow(devis),
      responsible_ids: responsibleIds.map(Number),
      intervenant_ids: intervenantIds.map(Number),
      metier_ids: metierIds,
    });
    const newDevis = mapDevis(data);
    setDevisList(prev => [...prev, newDevis]);
    if (responsibleIds.length > 0) setDevisResponsibles(prev => ({ ...prev, [newDevis.id]: responsibleIds }));
    if (intervenantIds.length > 0) setDevisIntervenants(prev => ({ ...prev, [newDevis.id]: intervenantIds }));
    if (metierIds.length > 0) setDevisMetiers(prev => ({ ...prev, [newDevis.id]: metierIds }));
    return newDevis;
  }, []);

  const updateDevis = useCallback(async (
    devis: Devis,
    responsibleIds?: string[],
    intervenantIds?: string[],
    metierIds?: string[],
  ) => {
    const data = await api.patch<any>(`/devis/${devis.id}`, {
      ...devisToRow(devis),
      ...(responsibleIds !== undefined ? { responsible_ids: responsibleIds.map(Number) } : {}),
      ...(intervenantIds !== undefined ? { intervenant_ids: intervenantIds.map(Number) } : {}),
      ...(metierIds !== undefined ? { metier_ids: metierIds } : {}),
    });
    setDevisList(prev => prev.map(d => d.id === devis.id ? mapDevis(data) : d));
    if (responsibleIds !== undefined) setDevisResponsibles(prev => ({ ...prev, [devis.id]: responsibleIds }));
    if (intervenantIds !== undefined) setDevisIntervenants(prev => ({ ...prev, [devis.id]: intervenantIds }));
    if (metierIds !== undefined) setDevisMetiers(prev => ({ ...prev, [devis.id]: metierIds }));
  }, []);

  const recordFollowUp = useCallback(async (devisId: string, comment: string) => {
    const target = devisList.find(d => d.id === devisId);
    if (!target) return;
    const newCount = (target.followUpCount || 0) + 1;
    const now = new Date().toISOString();
    const data = await api.patch<any>(`/devis/${devisId}`, {
      follow_up_count: newCount,
      last_follow_up_at: now,
    });
    setDevisList(prev => prev.map(d => d.id === devisId ? mapDevis(data) : d));
    if (comment.trim()) {
      await api.post(`/devis/${devisId}/comments`, { content: `🔔 Relance #${newCount} : ${comment.trim()}` });
    }
  }, [devisList]);

  const deleteDevis = useCallback(async (id: string) => {
    await api.del(`/devis/${id}`);
    setDevisList(prev => prev.filter(d => d.id !== id));
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
    recordFollowUp,
  };
}
