import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Metier,
  RendezVous,
  Poste,
  DisponibilitePoste,
  ExceptionDisponibilite,
  AppSettings,
  DEFAULT_POSTES,
  DEFAULT_SETTINGS,
  DEFAULT_METIERS,
  PlageHoraire,
} from '@/types';

// DB → App type mappers
function mapMetier(row: any): Metier {
  return { id: row.id, nom: row.nom, couleur: row.couleur };
}

function mapPoste(row: any): Poste {
  return { id: row.id, metierId: row.metier_id, nom: row.nom, actif: row.actif, colorHex: row.color_hex ?? null, sortOrder: row.sort_order ?? 0 };
}

function mapDispo(row: any): DisponibilitePoste {
  return {
    posteId: row.poste_id,
    jourSemaine: row.jour_semaine,
    plages: (row.plages as PlageHoraire[]) || [],
    dureeDefaut: row.duree_defaut,
    dureesAutorisees: (row.durees_autorisees as number[]) || [30, 60, 90],
    tampon: row.tampon,
  };
}

function mapException(row: any): ExceptionDisponibilite {
  return {
    id: row.id,
    posteId: row.poste_id,
    date: row.date,
    ferme: row.ferme,
    plagesOverride: row.plages_override || undefined,
  };
}

function mapRdv(row: any): RendezVous {
  return {
    id: row.id,
    posteId: row.poste_id || '',
    debut: row.debut,
    fin: row.fin,
    clientNom: row.client_nom || undefined,
    clientTel: row.client_tel || undefined,
    marque: row.marque || undefined,
    modele: row.modele || undefined,
    annee: row.annee || undefined,
    vin: row.vin || undefined,
    notes: row.notes || undefined,
    statut: row.statut,
    billingResponsibleUserId: row.billing_responsible_user_id != null ? String(row.billing_responsible_user_id) : undefined,
    sourceDevisId: row.source_devis_id || undefined,
    clientId: row.client_id || undefined,
    vehiculeId: row.vehicule_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by != null ? String(row.created_by) : undefined,
  };
}

function mapSettings(row: any): AppSettings {
  return {
    joursOuvres: (row.jours_ouvres as number[]) || [1, 2, 3, 4, 5, 6],
    heureMin: row.heure_min,
    heureMax: row.heure_max,
  };
}

function rdvToRow(rdv: Partial<RendezVous>) {
  return {
    poste_id: rdv.posteId || null,
    debut: rdv.debut,
    fin: rdv.fin,
    client_nom: rdv.clientNom || null,
    client_tel: rdv.clientTel || null,
    marque: rdv.marque || null,
    modele: rdv.modele || null,
    annee: rdv.annee || null,
    vin: rdv.vin || null,
    notes: rdv.notes || null,
    statut: rdv.statut,
    billing_responsible_user_id: rdv.billingResponsibleUserId ? Number(rdv.billingResponsibleUserId) : null,
    source_devis_id: (rdv as any).sourceDevisId || null,
    client_id: rdv.clientId || null,
    vehicule_id: rdv.vehiculeId || null,
  };
}

export function useAppStore() {
  const [metiers, setMetiers] = useState<Metier[]>(DEFAULT_METIERS);
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [postes, _setPostes] = useState<Poste[]>(DEFAULT_POSTES);
  const [disponibilites, setDisponibilites] = useState<DisponibilitePoste[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionDisponibilite[]>([]);
  const [settings, _setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Pivot data: responsibles & intervenants per appointment
  const [appointmentResponsibles, setAppointmentResponsibles] = useState<Record<string, string[]>>({});
  const [appointmentIntervenants, setAppointmentIntervenants] = useState<Record<string, string[]>>({});

  // Load all data on mount
  useEffect(() => {
    async function loadAll() {
      try {
        const [metiersData, postesData, disposData, exceptionsData, rdvsData, settingsData] = await Promise.all([
          api.get<any[]>('/metiers'),
          api.get<any[]>('/postes'),
          api.get<any[]>('/disponibilites'),
          api.get<any[]>('/exceptions'),
          api.get<{ rdvs: any[]; responsibles: Record<string, number[]>; intervenants: Record<string, number[]> }>('/rdvs'),
          api.get<any>('/settings'),
        ]);

        if (metiersData?.length) setMetiers(metiersData.map(mapMetier));
        if (postesData) _setPostes(postesData.map(mapPoste).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
        if (disposData) setDisponibilites(disposData.map(mapDispo));
        if (exceptionsData) setExceptions(exceptionsData.map(mapException));
        if (rdvsData?.rdvs) setRdvs(rdvsData.rdvs.map(mapRdv));
        if (settingsData) _setSettings(mapSettings(settingsData));

        const respMap: Record<string, string[]> = {};
        for (const [aid, ids] of Object.entries(rdvsData?.responsibles || {})) respMap[aid] = ids.map(String);
        setAppointmentResponsibles(respMap);
        const intMap: Record<string, string[]> = {};
        for (const [aid, ids] of Object.entries(rdvsData?.intervenants || {})) intMap[aid] = ids.map(String);
        setAppointmentIntervenants(intMap);
      } catch {
        // Non connecté ou API indisponible : on garde les valeurs par défaut
      }
      setLoaded(true);
    }
    loadAll();
  }, []);

  const addRdv = useCallback(async (rdv: Omit<RendezVous, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; updatedAt?: string }, responsibleIds?: string[], intervenantIds?: string[]) => {
    const data = await api.post<any>('/rdvs', {
      ...rdvToRow(rdv),
      responsible_ids: responsibleIds?.map(Number) || [],
      intervenant_ids: intervenantIds?.map(Number) || [],
    });
    const newRdv = mapRdv(data);
    setRdvs(prev => [...prev, newRdv]);
    if (responsibleIds?.length) setAppointmentResponsibles(prev => ({ ...prev, [newRdv.id]: responsibleIds }));
    if (intervenantIds?.length) setAppointmentIntervenants(prev => ({ ...prev, [newRdv.id]: intervenantIds }));
  }, []);

  const updateRdv = useCallback(async (rdv: RendezVous, responsibleIds?: string[], intervenantIds?: string[]) => {
    const data = await api.patch<any>(`/rdvs/${rdv.id}`, {
      ...rdvToRow(rdv),
      ...(responsibleIds !== undefined ? { responsible_ids: responsibleIds.map(Number) } : {}),
      ...(intervenantIds !== undefined ? { intervenant_ids: intervenantIds.map(Number) } : {}),
    });
    setRdvs(prev => prev.map(r => r.id === rdv.id ? mapRdv(data) : r));
    if (responsibleIds !== undefined) setAppointmentResponsibles(prev => ({ ...prev, [rdv.id]: responsibleIds }));
    if (intervenantIds !== undefined) setAppointmentIntervenants(prev => ({ ...prev, [rdv.id]: intervenantIds }));
  }, []);

  const deleteRdv = useCallback(async (id: string) => {
    await api.del(`/rdvs/${id}`);
    setRdvs(prev => prev.filter(r => r.id !== id));
  }, []);

  const checkConflict = useCallback((posteId: string, debut: string, fin: string, excludeId?: string): RendezVous | null => {
    if (!posteId) return null;
    const start = new Date(debut).getTime();
    const end = new Date(fin).getTime();
    return rdvs.find(r => {
      if (r.id === excludeId) return false;
      if (r.posteId !== posteId) return false;
      if (r.statut === 'annule') return false;
      const rStart = new Date(r.debut).getTime();
      const rEnd = new Date(r.fin).getTime();
      return start < rEnd && end > rStart;
    }) || null;
  }, [rdvs]);

  /** Non-blocking check: returns appointments of the same intervenants overlapping the slot. */
  const checkIntervenantConflicts = useCallback((
    intervenantIds: string[],
    debut: string,
    fin: string,
    excludeId?: string,
  ): { intervenantId: string; rdv: RendezVous }[] => {
    if (!intervenantIds || intervenantIds.length === 0) return [];
    const start = new Date(debut).getTime();
    const end = new Date(fin).getTime();
    const out: { intervenantId: string; rdv: RendezVous }[] = [];
    for (const r of rdvs) {
      if (r.id === excludeId) continue;
      if (r.statut === 'annule') continue;
      const rStart = new Date(r.debut).getTime();
      const rEnd = new Date(r.fin).getTime();
      if (!(start < rEnd && end > rStart)) continue;
      const ints = appointmentIntervenants[r.id] || [];
      for (const iid of intervenantIds) {
        if (ints.includes(iid)) out.push({ intervenantId: iid, rdv: r });
      }
    }
    return out;
  }, [rdvs, appointmentIntervenants]);


  const updatePostes = useCallback(async (updater: (prev: Poste[]) => Poste[]) => {
    const newPostes = updater(postes);
    for (const p of newPostes) {
      const old = postes.find(op => op.id === p.id);
      if (old && old.actif !== p.actif) {
        await api.patch(`/postes/${p.id}`, { actif: p.actif });
      }
    }
    _setPostes(newPostes);
  }, [postes]);

  const updateDisponibilites = useCallback(async (updater: (prev: DisponibilitePoste[]) => DisponibilitePoste[]) => {
    const newDispos = updater(disponibilites);
    for (const d of newDispos) {
      const old = disponibilites.find(od => od.posteId === d.posteId && od.jourSemaine === d.jourSemaine);
      if (old && JSON.stringify(old) !== JSON.stringify(d)) {
        await api.put('/disponibilites', {
          poste_id: d.posteId,
          jour_semaine: d.jourSemaine,
          plages: d.plages,
          duree_defaut: d.dureeDefaut,
          durees_autorisees: d.dureesAutorisees,
          tampon: d.tampon,
        });
      }
    }
    setDisponibilites(newDispos);
  }, [disponibilites]);

  const updateSettings = useCallback(async (updater: (prev: AppSettings) => AppSettings) => {
    const newSettings = updater(settings);
    await api.put('/settings', {
      jours_ouvres: newSettings.joursOuvres,
      heure_min: newSettings.heureMin,
      heure_max: newSettings.heureMax,
    });
    _setSettings(newSettings);
  }, [settings]);

  // Metier CRUD
  const addMetier = useCallback(async (metier: Metier) => {
    try {
      await api.post('/metiers', { id: metier.id, nom: metier.nom, couleur: metier.couleur });
      setMetiers(prev => [...prev, metier]);
      return true;
    } catch { return false; }
  }, []);

  const renameMetier = useCallback(async (id: string, nom: string) => {
    try {
      await api.patch(`/metiers/${id}`, { nom });
      setMetiers(prev => prev.map(m => m.id === id ? { ...m, nom } : m));
      return true;
    } catch { return false; }
  }, []);

  const deleteMetier = useCallback(async (id: string) => {
    try {
      await api.del(`/metiers/${id}`);
      setMetiers(prev => prev.filter(m => m.id !== id));
      return true;
    } catch { return false; }
  }, []);

  // Poste CRUD
  const addPoste = useCallback(async (poste: Poste) => {
    try {
      await api.post('/postes', { id: poste.id, metier_id: poste.metierId, nom: poste.nom, actif: poste.actif, color_hex: poste.colorHex ?? null });
      _setPostes(prev => [...prev, poste]);
      return true;
    } catch { return false; }
  }, []);

  const renamePoste = useCallback(async (id: string, nom: string) => {
    try {
      await api.patch(`/postes/${id}`, { nom });
      _setPostes(prev => prev.map(p => p.id === id ? { ...p, nom } : p));
      return true;
    } catch { return false; }
  }, []);

  /** Met à jour uniquement le poste ciblé (nom et/ou couleur). */
  const updatePoste = useCallback(async (id: string, patch: { nom?: string; colorHex?: string | null }) => {
    const payload: any = {};
    if (patch.nom !== undefined) payload.nom = patch.nom;
    if (patch.colorHex !== undefined) payload.color_hex = patch.colorHex;
    if (Object.keys(payload).length === 0) return true;
    try {
      await api.patch(`/postes/${id}`, payload);
      _setPostes(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
      return true;
    } catch { return false; }
  }, []);

  /** Déplace un poste vers le haut/bas dans sa catégorie (ordre d'affichage). */
  const movePoste = useCallback(async (id: string, direction: -1 | 1) => {
    let a: Poste | undefined;
    let b: Poste | undefined;

    _setPostes(prev => {
      const current = prev.find(p => p.id === id);
      if (!current) return prev;
      const siblings = prev
        .filter(p => p.metierId === current.metierId)
        .sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0));
      const idx = siblings.findIndex(p => p.id === id);
      const target = siblings[idx + direction];
      if (!target) return prev;

      a = { ...current, sortOrder: target.sortOrder ?? 0 };
      b = { ...target, sortOrder: current.sortOrder ?? 0 };
      return prev
        .map(p => (p.id === a!.id ? a! : p.id === b!.id ? b! : p))
        .sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0));
    });

    await Promise.resolve();
    if (!a || !b) return false;
    if ((a.sortOrder ?? 0) === (b.sortOrder ?? 0)) {
      a = { ...a, sortOrder: (b.sortOrder ?? 0) + direction };
    }
    try {
      await Promise.all([
        api.patch(`/postes/${a.id}`, { sort_order: a.sortOrder }),
        api.patch(`/postes/${b.id}`, { sort_order: b.sortOrder }),
      ]);
      return true;
    } catch { return false; }
  }, []);

  /** Enregistre en une seule fois les paramètres généraux et les postes modifiés. */
  const saveParametres = useCallback(async (newSettings: AppSettings, newPostes: Poste[]) => {
    try {
      await api.put('/settings', {
        jours_ouvres: newSettings.joursOuvres,
        heure_min: newSettings.heureMin,
        heure_max: newSettings.heureMax,
      });
      for (const p of newPostes) {
        const old = postes.find(op => op.id === p.id);
        if (!old) continue;
        const payload: any = {};
        if (old.actif !== p.actif) payload.actif = p.actif;
        if (old.colorHex !== p.colorHex) payload.color_hex = p.colorHex;
        if ((old.sortOrder ?? 0) !== (p.sortOrder ?? 0)) payload.sort_order = p.sortOrder;
        if (Object.keys(payload).length > 0) await api.patch(`/postes/${p.id}`, payload);
      }
      _setSettings(newSettings);
      _setPostes(newPostes);
      return true;
    } catch { return false; }
  }, [postes]);


  return {
    metiers, rdvs, postes, disponibilites, exceptions, settings, loaded,
    appointmentResponsibles, appointmentIntervenants,
    addRdv, updateRdv, deleteRdv, checkConflict, checkIntervenantConflicts,
    addMetier, renameMetier, deleteMetier,
    addPoste, renamePoste, updatePoste, movePoste,
    setPostes: updatePostes,
    setDisponibilites: updateDisponibilites,
    setExceptions,
    setSettings: updateSettings,
    saveParametres,
  };
}
