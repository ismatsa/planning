import { useState, useCallback, useEffect } from 'react';
import {
  RendezVous,
  Poste,
  DisponibilitePoste,
  ExceptionDisponibilite,
  AppSettings,
  DEFAULT_POSTES,
  DEFAULT_SETTINGS,
} from '@/types';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Default availabilities for all postes (lun-sam, 08:00-12:00 / 13:00-18:00)
function defaultDisponibilites(): DisponibilitePoste[] {
  const result: DisponibilitePoste[] = [];
  for (const poste of DEFAULT_POSTES) {
    for (const jour of [1, 2, 3, 4, 5, 6]) {
      result.push({
        posteId: poste.id,
        jourSemaine: jour,
        plages: [
          { debut: '08:00', fin: '12:00' },
          { debut: '13:00', fin: '18:00' },
        ],
        dureeDefaut: poste.metierId === 'lavage' ? 30 : poste.metierId === 'reprog' ? 90 : 60,
        dureesAutorisees: poste.metierId === 'lavage' ? [30, 45, 60] : poste.metierId === 'reprog' ? [60, 90, 120] : [30, 60, 90, 120],
        tampon: 10,
      });
    }
  }
  return result;
}

export function useAppStore() {
  const [rdvs, setRdvs] = useState<RendezVous[]>(() => loadFromStorage('atelier_rdvs', []));
  const [postes, setPostes] = useState<Poste[]>(() => loadFromStorage('atelier_postes', DEFAULT_POSTES));
  const [disponibilites, setDisponibilites] = useState<DisponibilitePoste[]>(() => loadFromStorage('atelier_dispos', defaultDisponibilites()));
  const [exceptions, setExceptions] = useState<ExceptionDisponibilite[]>(() => loadFromStorage('atelier_exceptions', []));
  const [settings, setSettings] = useState<AppSettings>(() => loadFromStorage('atelier_settings', DEFAULT_SETTINGS));

  useEffect(() => { saveToStorage('atelier_rdvs', rdvs); }, [rdvs]);
  useEffect(() => { saveToStorage('atelier_postes', postes); }, [postes]);
  useEffect(() => { saveToStorage('atelier_dispos', disponibilites); }, [disponibilites]);
  useEffect(() => { saveToStorage('atelier_exceptions', exceptions); }, [exceptions]);
  useEffect(() => { saveToStorage('atelier_settings', settings); }, [settings]);

  const addRdv = useCallback((rdv: RendezVous) => {
    setRdvs(prev => [...prev, rdv]);
  }, []);

  const updateRdv = useCallback((rdv: RendezVous) => {
    setRdvs(prev => prev.map(r => r.id === rdv.id ? { ...rdv, updatedAt: new Date().toISOString() } : r));
  }, []);

  const deleteRdv = useCallback((id: string) => {
    setRdvs(prev => prev.filter(r => r.id !== id));
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

  return {
    rdvs, postes, disponibilites, exceptions, settings,
    addRdv, updateRdv, deleteRdv, checkConflict,
    setPostes, setDisponibilites, setExceptions, setSettings,
  };
}
