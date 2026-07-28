export type ClientType = 'particulier' | 'societe';
export type ClientStatut = 'actif' | 'archive';
export type VehiculeStatut = 'actif' | 'vendu' | 'archive';
export type CarburantType = 'essence' | 'diesel' | 'hybride' | 'electrique' | 'gpl' | 'autre';
export type BoiteVitessesType = 'manuelle' | 'automatique' | 'autre';
export type EntretienType = 'revision' | 'vidange' | 'reprogrammation' | 'lavage' | 'reparation' | 'autre';
export type ProprietaireMotif = 'achat' | 'vente' | 'transfert' | 'autre';

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  particulier: 'Particulier',
  societe: 'Société',
};

export const CLIENT_STATUT_LABELS: Record<ClientStatut, string> = {
  actif: 'Actif',
  archive: 'Archivé',
};

export const VEHICULE_STATUT_LABELS: Record<VehiculeStatut, string> = {
  actif: 'Actif',
  vendu: 'Vendu',
  archive: 'Archivé',
};

export const CARBURANT_LABELS: Record<CarburantType, string> = {
  essence: 'Essence',
  diesel: 'Diesel',
  hybride: 'Hybride',
  electrique: 'Électrique',
  gpl: 'GPL',
  autre: 'Autre',
};

export const BOITE_LABELS: Record<BoiteVitessesType, string> = {
  manuelle: 'Manuelle',
  automatique: 'Automatique',
  autre: 'Autre',
};

export const ENTRETIEN_TYPE_LABELS: Record<EntretienType, string> = {
  revision: 'Révision',
  vidange: 'Vidange',
  reprogrammation: 'Reprogrammation',
  lavage: 'Lavage',
  reparation: 'Réparation',
  autre: 'Autre',
};

export const MOTIF_LABELS: Record<ProprietaireMotif, string> = {
  achat: 'Achat',
  vente: 'Vente',
  transfert: 'Transfert',
  autre: 'Autre',
};

export interface Client {
  id: string;
  typeClient: ClientType;
  nom?: string;
  prenom?: string;
  raisonSociale?: string;
  ice?: string;
  telephone: string;
  telephoneSecondaire?: string;
  email?: string;
  adresse?: string;
  ville?: string;
  notesInternes?: string;
  statut: ClientStatut;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicule {
  id: string;
  vin: string;
  immatriculation?: string;
  marque: string;
  modele: string;
  annee?: number;
  motorisation?: string;
  carburant?: CarburantType;
  boiteVitesses?: BoiteVitessesType;
  kilometrageActuel?: number;
  statut: VehiculeStatut;
  clientId?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehiculeProprietaire {
  id: string;
  vehiculeId: string;
  clientId: string;
  dateDebut: string;
  dateFin?: string;
  motif: ProprietaireMotif;
  createdBy?: string;
  createdAt: string;
}

export interface Entretien {
  id: string;
  vehiculeId: string;
  dateEntretien: string;
  typeEntretien: EntretienType;
  kilometrage?: number;
  description?: string;
  piecesUtilisees?: string;
  realisePar?: string;
  rdvId?: string;
  devisId?: string;
  cout?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export function clientDisplayName(c?: Client | null): string {
  if (!c) return '—';
  if (c.typeClient === 'societe') return c.raisonSociale || '—';
  return [c.nom, c.prenom].filter(Boolean).join(' ') || '—';
}

export function normalizeVin(vin: string): string {
  return vin.trim().toUpperCase();
}
