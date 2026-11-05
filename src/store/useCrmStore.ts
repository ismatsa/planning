import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import type {
  Client, Vehicule, VehiculeProprietaire, Entretien, ProprietaireMotif,
} from '@/types/crm';

function mapClient(row: any): Client {
  return {
    id: row.id,
    typeClient: row.type_client,
    nom: row.nom || undefined,
    prenom: row.prenom || undefined,
    raisonSociale: row.raison_sociale || undefined,
    ice: row.ice || undefined,
    telephone: row.telephone,
    telephoneSecondaire: row.telephone_secondaire || undefined,
    email: row.email || undefined,
    adresse: row.adresse || undefined,
    ville: row.ville || undefined,
    notesInternes: row.notes_internes || undefined,
    statut: row.statut,
    createdBy: row.created_by != null ? String(row.created_by) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function clientToRow(c: Partial<Client>) {
  const row: Record<string, any> = {};
  if (c.typeClient !== undefined) row.type_client = c.typeClient;
  if (c.nom !== undefined) row.nom = c.nom || null;
  if (c.prenom !== undefined) row.prenom = c.prenom || null;
  if (c.raisonSociale !== undefined) row.raison_sociale = c.raisonSociale || null;
  if (c.ice !== undefined) row.ice = c.ice || null;
  if (c.telephone !== undefined) row.telephone = c.telephone;
  if (c.telephoneSecondaire !== undefined) row.telephone_secondaire = c.telephoneSecondaire || null;
  if (c.email !== undefined) row.email = c.email || null;
  if (c.adresse !== undefined) row.adresse = c.adresse || null;
  if (c.ville !== undefined) row.ville = c.ville || null;
  if (c.notesInternes !== undefined) row.notes_internes = c.notesInternes || null;
  if (c.statut !== undefined) row.statut = c.statut;
  return row;
}

function mapVehicule(row: any): Vehicule {
  return {
    id: row.id,
    vin: row.vin ?? '',
    immatriculation: row.immatriculation || undefined,
    marque: row.marque,
    modele: row.modele,
    annee: row.annee ?? undefined,
    motorisation: row.motorisation || undefined,
    carburant: row.carburant || undefined,
    boiteVitesses: row.boite_vitesses || undefined,
    kilometrageActuel: row.kilometrage_actuel ?? undefined,
    statut: row.statut,
    clientId: row.client_id || undefined,
    notes: row.notes || undefined,
    createdBy: row.created_by != null ? String(row.created_by) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function vehiculeToRow(v: Partial<Vehicule>) {
  const row: Record<string, any> = {};
  if (v.vin !== undefined) row.vin = v.vin ? v.vin.trim().toUpperCase() : null;
  if (v.immatriculation !== undefined) row.immatriculation = v.immatriculation ? v.immatriculation.trim().toUpperCase() : null;
  if (v.marque !== undefined) row.marque = v.marque;
  if (v.modele !== undefined) row.modele = v.modele;
  if (v.annee !== undefined) row.annee = v.annee ?? null;
  if (v.motorisation !== undefined) row.motorisation = v.motorisation || null;
  if (v.carburant !== undefined) row.carburant = v.carburant || null;
  if (v.boiteVitesses !== undefined) row.boite_vitesses = v.boiteVitesses || null;
  if (v.kilometrageActuel !== undefined) row.kilometrage_actuel = v.kilometrageActuel ?? null;
  if (v.statut !== undefined) row.statut = v.statut;
  if (v.clientId !== undefined) row.client_id = v.clientId || null;
  if (v.notes !== undefined) row.notes = v.notes || null;
  return row;
}

function mapProprietaire(row: any): VehiculeProprietaire {
  return {
    id: row.id,
    vehiculeId: row.vehicule_id,
    clientId: row.client_id,
    dateDebut: row.date_debut,
    dateFin: row.date_fin || undefined,
    motif: row.motif,
    createdBy: row.created_by != null ? String(row.created_by) : undefined,
    createdAt: row.created_at,
  };
}

function mapEntretien(row: any): Entretien {
  return {
    id: row.id,
    vehiculeId: row.vehicule_id,
    dateEntretien: row.date_entretien,
    typeEntretien: row.type_entretien,
    kilometrage: row.kilometrage ?? undefined,
    description: row.description || undefined,
    piecesUtilisees: row.pieces_utilisees || undefined,
    realisePar: row.realise_par || undefined,
    rdvId: row.rdv_id || undefined,
    devisId: row.devis_id || undefined,
    cout: row.cout ?? undefined,
    createdBy: row.created_by != null ? String(row.created_by) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function entretienToRow(e: Partial<Entretien>) {
  const row: Record<string, any> = {};
  if (e.vehiculeId !== undefined) row.vehicule_id = e.vehiculeId;
  if (e.dateEntretien !== undefined) row.date_entretien = e.dateEntretien;
  if (e.typeEntretien !== undefined) row.type_entretien = e.typeEntretien;
  if (e.kilometrage !== undefined) row.kilometrage = e.kilometrage ?? null;
  if (e.description !== undefined) row.description = e.description || null;
  if (e.piecesUtilisees !== undefined) row.pieces_utilisees = e.piecesUtilisees || null;
  if (e.realisePar !== undefined) row.realise_par = e.realisePar || null;
  if (e.rdvId !== undefined) row.rdv_id = e.rdvId || null;
  if (e.devisId !== undefined) row.devis_id = e.devisId || null;
  if (e.cout !== undefined) row.cout = e.cout ?? null;
  return row;
}

export function useCrmStore() {
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [proprietaires, setProprietaires] = useState<VehiculeProprietaire[]>([]);
  const [entretiens, setEntretiens] = useState<Entretien[]>([]);
  const [crmLoaded, setCrmLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [cData, vData, pData, eData] = await Promise.all([
          api.get<any[]>('/clients'),
          api.get<any[]>('/vehicules'),
          api.get<any[]>('/proprietaires'),
          api.get<any[]>('/entretiens'),
        ]);
        if (cData) setClients(cData.map(mapClient));
        if (vData) setVehicules(vData.map(mapVehicule));
        if (pData) setProprietaires(pData.map(mapProprietaire));
        if (eData) setEntretiens(eData.map(mapEntretien));
      } catch {
        // Non connecté ou API indisponible
      }
      setCrmLoaded(true);
    }
    load();
  }, []);

  const addClient = useCallback(async (input: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    const data = await api.post<any>('/clients', clientToRow(input));
    const created = mapClient(data);
    setClients(prev => [...prev, created]);
    return created;
  }, []);

  const updateClient = useCallback(async (id: string, patch: Partial<Client>) => {
    const data = await api.patch<any>(`/clients/${id}`, clientToRow(patch));
    const updated = mapClient(data);
    setClients(prev => prev.map(c => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const archiveClient = useCallback(async (id: string) => {
    return updateClient(id, { statut: 'archive' });
  }, [updateClient]);

  const addVehicule = useCallback(async (
    input: Omit<Vehicule, 'id' | 'createdAt' | 'updatedAt'>,
    _motif: ProprietaireMotif = 'achat',
  ) => {
    const data = await api.post<any>('/vehicules', vehiculeToRow(input));
    const created = mapVehicule(data);
    setVehicules(prev => [...prev, created]);
    if (created.clientId) {
      const pData = await api.get<any[]>('/proprietaires');
      setProprietaires(pData.map(mapProprietaire));
    }
    return created;
  }, []);

  const updateVehicule = useCallback(async (id: string, patch: Partial<Vehicule>) => {
    // Le changement de propriétaire passe par transferVehicule (historique préservé)
    const { clientId, ...rest } = patch;
    const data = await api.patch<any>(`/vehicules/${id}`, vehiculeToRow(rest));
    const updated = mapVehicule(data);
    setVehicules(prev => prev.map(v => (v.id === id ? updated : v)));
    return updated;
  }, []);

  const archiveVehicule = useCallback(async (id: string) => {
    return updateVehicule(id, { statut: 'archive' });
  }, [updateVehicule]);

  /**
   * Transfère un véhicule à un nouveau propriétaire.
   * L'historique n'est jamais effacé : la période courante est clôturée
   * et une nouvelle période est ouverte.
   */
  const transferVehicule = useCallback(async (
    vehiculeId: string,
    newClientId: string,
    motif: ProprietaireMotif = 'transfert',
  ) => {
    const data = await api.post<any>(`/vehicules/${vehiculeId}/transfer`, { client_id: newClientId, motif });
    const updated = mapVehicule(data);
    setVehicules(prev => prev.map(v => (v.id === vehiculeId ? updated : v)));
    const pData = await api.get<any[]>('/proprietaires');
    setProprietaires(pData.map(mapProprietaire));
  }, []);

  const addEntretien = useCallback(async (input: Omit<Entretien, 'id' | 'createdAt' | 'updatedAt'>) => {
    const data = await api.post<any>('/entretiens', entretienToRow(input));
    const created = mapEntretien(data);
    setEntretiens(prev => [...prev, created]);
    return created;
  }, []);

  const updateEntretien = useCallback(async (id: string, patch: Partial<Entretien>) => {
    const data = await api.patch<any>(`/entretiens/${id}`, entretienToRow(patch));
    const updated = mapEntretien(data);
    setEntretiens(prev => prev.map(e => (e.id === id ? updated : e)));
    return updated;
  }, []);

  return {
    clients,
    vehicules,
    proprietaires,
    entretiens,
    crmLoaded,
    addClient,
    updateClient,
    archiveClient,
    addVehicule,
    updateVehicule,
    archiveVehicule,
    transferVehicule,
    addEntretien,
    updateEntretien,
  };
}
