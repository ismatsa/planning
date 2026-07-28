import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  Client, Vehicule, VehiculeProprietaire, Entretien, ProprietaireMotif,
} from '@/types/crm';
import { normalizeVin } from '@/types/crm';

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
    createdBy: row.created_by || undefined,
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
    vin: row.vin,
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
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function vehiculeToRow(v: Partial<Vehicule>) {
  const row: Record<string, any> = {};
  if (v.vin !== undefined) row.vin = normalizeVin(v.vin);
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
    createdBy: row.created_by || undefined,
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
    createdBy: row.created_by || undefined,
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
      const [cRes, vRes, pRes, eRes] = await Promise.all([
        supabase.from('clients').select('*'),
        supabase.from('vehicules').select('*'),
        supabase.from('vehicule_proprietaires').select('*'),
        supabase.from('entretiens').select('*'),
      ]);
      if (cRes.data) setClients(cRes.data.map(mapClient));
      if (vRes.data) setVehicules(vRes.data.map(mapVehicule));
      if (pRes.data) setProprietaires(pRes.data.map(mapProprietaire));
      if (eRes.data) setEntretiens(eRes.data.map(mapEntretien));
      setCrmLoaded(true);
    }
    load();
  }, []);

  const addClient = useCallback(async (input: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...clientToRow(input), created_by: session?.user?.id || null } as any)
      .select()
      .single();
    if (error || !data) throw error;
    const created = mapClient(data);
    setClients(prev => [...prev, created]);
    return created;
  }, []);

  const updateClient = useCallback(async (id: string, patch: Partial<Client>) => {
    const { data, error } = await supabase
      .from('clients')
      .update(clientToRow(patch) as any)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw error;
    const updated = mapClient(data);
    setClients(prev => prev.map(c => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const archiveClient = useCallback(async (id: string) => {
    return updateClient(id, { statut: 'archive' });
  }, [updateClient]);

  const addVehicule = useCallback(async (
    input: Omit<Vehicule, 'id' | 'createdAt' | 'updatedAt'>,
    motif: ProprietaireMotif = 'achat',
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || null;
    const { data, error } = await supabase
      .from('vehicules')
      .insert({ ...vehiculeToRow(input), created_by: uid } as any)
      .select()
      .single();
    if (error || !data) throw error;
    const created = mapVehicule(data);
    setVehicules(prev => [...prev, created]);

    if (created.clientId) {
      const { data: pData } = await supabase
        .from('vehicule_proprietaires')
        .insert({
          vehicule_id: created.id,
          client_id: created.clientId,
          motif,
          created_by: uid,
        } as any)
        .select()
        .single();
      if (pData) setProprietaires(prev => [...prev, mapProprietaire(pData)]);
    }
    return created;
  }, []);

  const updateVehicule = useCallback(async (id: string, patch: Partial<Vehicule>) => {
    // Le changement de propriétaire passe par transferVehicule (historique préservé)
    const { clientId, ...rest } = patch;
    const { data, error } = await supabase
      .from('vehicules')
      .update(vehiculeToRow(rest) as any)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw error;
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
    dateDebut?: string,
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id || null;
    const now = dateDebut || new Date().toISOString();

    const { data: closed } = await supabase
      .from('vehicule_proprietaires')
      .update({ date_fin: now } as any)
      .eq('vehicule_id', vehiculeId)
      .is('date_fin', null)
      .select();

    const { data: opened, error } = await supabase
      .from('vehicule_proprietaires')
      .insert({
        vehicule_id: vehiculeId,
        client_id: newClientId,
        date_debut: now,
        motif,
        created_by: uid,
      } as any)
      .select()
      .single();
    if (error || !opened) throw error;

    const { data: vData } = await supabase
      .from('vehicules')
      .update({ client_id: newClientId } as any)
      .eq('id', vehiculeId)
      .select()
      .single();

    setProprietaires(prev => {
      const closedIds = new Set((closed || []).map((r: any) => r.id));
      const next = prev.map(p => (closedIds.has(p.id) ? { ...p, dateFin: now } : p));
      return [...next, mapProprietaire(opened)];
    });
    if (vData) {
      const updated = mapVehicule(vData);
      setVehicules(prev => prev.map(v => (v.id === vehiculeId ? updated : v)));
    }
  }, []);

  const addEntretien = useCallback(async (input: Omit<Entretien, 'id' | 'createdAt' | 'updatedAt'>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('entretiens')
      .insert({ ...entretienToRow(input), created_by: session?.user?.id || null } as any)
      .select()
      .single();
    if (error || !data) throw error;
    const created = mapEntretien(data);
    setEntretiens(prev => [...prev, created]);
    return created;
  }, []);

  const updateEntretien = useCallback(async (id: string, patch: Partial<Entretien>) => {
    const { data, error } = await supabase
      .from('entretiens')
      .update(entretienToRow(patch) as any)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw error;
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
