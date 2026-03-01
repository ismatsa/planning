import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  RendezVous,
  Poste,
  DisponibilitePoste,
  ExceptionDisponibilite,
  AppSettings,
  DEFAULT_POSTES,
  DEFAULT_SETTINGS,
  PlageHoraire,
} from '@/types';

// DB → App type mappers
function mapPoste(row: any): Poste {
  return { id: row.id, metierId: row.metier_id, nom: row.nom, actif: row.actif };
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
    posteId: row.poste_id,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by || undefined,
  };
}

function mapSettings(row: any): AppSettings {
  return {
    joursOuvres: (row.jours_ouvres as number[]) || [1, 2, 3, 4, 5, 6],
    heureMin: row.heure_min,
    heureMax: row.heure_max,
  };
}

export function useAppStore() {
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [postes, setPostes] = useState<Poste[]>(DEFAULT_POSTES);
  const [disponibilites, setDisponibilites] = useState<DisponibilitePoste[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionDisponibilite[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load all data on mount
  useEffect(() => {
    async function loadAll() {
      const [postesRes, disposRes, exceptionsRes, rdvsRes, settingsRes] = await Promise.all([
        supabase.from('postes').select('*'),
        supabase.from('disponibilite_postes').select('*'),
        supabase.from('exception_disponibilites').select('*'),
        supabase.from('rendez_vous').select('*'),
        supabase.from('app_settings').select('*').eq('id', 1).single(),
      ]);

      if (postesRes.data) setPostes(postesRes.data.map(mapPoste));
      if (disposRes.data) setDisponibilites(disposRes.data.map(mapDispo));
      if (exceptionsRes.data) setExceptions(exceptionsRes.data.map(mapException));
      if (rdvsRes.data) setRdvs(rdvsRes.data.map(mapRdv));
      if (settingsRes.data) setSettings(mapSettings(settingsRes.data));
      setLoaded(true);
    }
    loadAll();
  }, []);

  const addRdv = useCallback(async (rdv: Omit<RendezVous, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; updatedAt?: string }) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.from('rendez_vous').insert({
      poste_id: rdv.posteId,
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
      created_by: session?.user?.id || null,
    } as any).select().single();

    if (data && !error) {
      setRdvs(prev => [...prev, mapRdv(data)]);
    }
  }, []);

  const updateRdv = useCallback(async (rdv: RendezVous) => {
    const { data, error } = await supabase.from('rendez_vous').update({
      poste_id: rdv.posteId,
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
    }).eq('id', rdv.id).select().single();

    if (data && !error) {
      setRdvs(prev => prev.map(r => r.id === rdv.id ? mapRdv(data) : r));
    }
  }, []);

  const deleteRdv = useCallback(async (id: string) => {
    const { error } = await supabase.from('rendez_vous').delete().eq('id', id);
    if (!error) {
      setRdvs(prev => prev.filter(r => r.id !== id));
    }
  }, []);

  const checkConflict = useCallback((posteId: string, debut: string, fin: string, excludeId?: string): RendezVous | null => {
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

  const updatePostes = useCallback(async (updater: (prev: Poste[]) => Poste[]) => {
    const newPostes = updater(postes);
    // Update changed postes in DB
    for (const p of newPostes) {
      const old = postes.find(op => op.id === p.id);
      if (old && old.actif !== p.actif) {
        await supabase.from('postes').update({ actif: p.actif }).eq('id', p.id);
      }
    }
    setPostes(newPostes);
  }, [postes]);

  const updateDisponibilites = useCallback(async (updater: (prev: DisponibilitePoste[]) => DisponibilitePoste[]) => {
    const newDispos = updater(disponibilites);
    // Upsert changed dispos
    for (const d of newDispos) {
      const old = disponibilites.find(od => od.posteId === d.posteId && od.jourSemaine === d.jourSemaine);
      if (old && JSON.stringify(old) !== JSON.stringify(d)) {
        await supabase.from('disponibilite_postes').update({
          plages: d.plages as any,
          duree_defaut: d.dureeDefaut,
          durees_autorisees: d.dureesAutorisees as any,
          tampon: d.tampon,
        }).eq('poste_id', d.posteId).eq('jour_semaine', d.jourSemaine);
      }
    }
    setDisponibilites(newDispos);
  }, [disponibilites]);

  const updateSettings = useCallback(async (updater: (prev: AppSettings) => AppSettings) => {
    const newSettings = updater(settings);
    await supabase.from('app_settings').update({
      jours_ouvres: newSettings.joursOuvres as any,
      heure_min: newSettings.heureMin,
      heure_max: newSettings.heureMax,
    }).eq('id', 1);
    setSettings(newSettings);
  }, [settings]);

  return {
    rdvs, postes, disponibilites, exceptions, settings, loaded,
    addRdv, updateRdv, deleteRdv, checkConflict,
    setPostes: updatePostes,
    setDisponibilites: updateDisponibilites,
    setExceptions,
    setSettings: updateSettings,
  };
}
