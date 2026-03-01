export type MetierType = string;

export interface Metier {
  id: MetierType;
  nom: string;
  couleur: string;
}

export interface Poste {
  id: string;
  metierId: MetierType;
  nom: string;
  actif: boolean;
}

export interface PlageHoraire {
  debut: string; // "HH:mm"
  fin: string;   // "HH:mm"
}

export interface DisponibilitePoste {
  posteId: string;
  jourSemaine: number; // 0=dim, 1=lun...6=sam
  plages: PlageHoraire[];
  dureeDefaut: number; // minutes
  dureesAutorisees: number[]; // [30, 60, 90]
  tampon: number; // minutes buffer between rdv
}

export interface ExceptionDisponibilite {
  id: string;
  posteId: string;
  date: string; // "YYYY-MM-DD"
  ferme: boolean;
  plagesOverride?: PlageHoraire[];
}

export type StatutRdv = 'prevu' | 'confirme' | 'annule' | 'noshow' | 'termine';

export interface RendezVous {
  id: string;
  posteId: string;
  debut: string; // ISO datetime
  fin: string;   // ISO datetime
  clientNom?: string;
  clientTel?: string;
  marque?: string;
  modele?: string;
  annee?: string;
  vin?: string;
  notes?: string;
  statut: StatutRdv;
  createdAt: string;
    updatedAt: string;
    createdBy?: string;
}

export interface AppSettings {
  joursOuvres: number[]; // 1=lun...6=sam
  heureMin: string; // "08:00"
  heureMax: string; // "19:00"
}

// METIERS are now loaded from DB via the store
// Kept as fallback for initial render before DB loads
export const DEFAULT_METIERS: Metier[] = [
  { id: 'lavage', nom: 'Lavage', couleur: 'lavage' },
  { id: 'reprog', nom: 'Reprogrammation', couleur: 'reprog' },
  { id: 'mecanique', nom: 'Mécanique', couleur: 'mecanique' },
];

export const DEFAULT_POSTES: Poste[] = [
  { id: 'lavage-a', metierId: 'lavage', nom: 'Poste A', actif: true },
  { id: 'lavage-b', metierId: 'lavage', nom: 'Poste B', actif: true },
  { id: 'reprog-banc1', metierId: 'reprog', nom: 'Banc 1', actif: true },
  { id: 'meca-pont1', metierId: 'mecanique', nom: 'Pont 1', actif: true },
  { id: 'meca-pont2', metierId: 'mecanique', nom: 'Pont 2', actif: true },
  { id: 'meca-pont3', metierId: 'mecanique', nom: 'Pont 3', actif: true },
];

export const DEFAULT_SETTINGS: AppSettings = {
  joursOuvres: [1, 2, 3, 4, 5, 6], // lun-sam
  heureMin: '08:00',
  heureMax: '19:00',
};

export const STATUT_LABELS: Record<StatutRdv, string> = {
  prevu: 'Prévu',
  confirme: 'Confirmé',
  annule: 'Annulé',
  noshow: 'No-show',
  termine: 'Terminé',
};
