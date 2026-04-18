export type StatutDevis =
  | 'demande_recue'
  | 'a_chiffrer'
  | 'en_cours_de_devis'
  | 'en_attente_infos'
  | 'devis_pret'
  | 'envoye'
  | 'devis_envoye'
  | 'valide'
  | 'refuse'
  | 'annule';

export const STATUT_DEVIS_LABELS: Record<StatutDevis, string> = {
  demande_recue: 'Demande reçue',
  a_chiffrer: 'À chiffrer',
  en_cours_de_devis: 'En cours de devis',
  en_attente_infos: 'En attente d\'informations',
  devis_pret: 'Devis prêt',
  envoye: 'Devis envoyé',
  devis_envoye: 'À relancer',
  valide: 'Validé',
  refuse: 'Refusé',
  annule: 'Annulé',
};

export interface Devis {
  id: string;
  clientNom?: string;
  clientTel?: string;
  marque?: string;
  modele?: string;
  annee?: string;
  vin?: string;
  notes?: string;
  statut: StatutDevis;
  billingResponsibleUserId?: string;
  assignedUserId?: string;
  createdBy?: string;
  sentAt?: string;
  followUpCount: number;
  lastFollowUpAt?: string;
  createdAt: string;
  updatedAt: string;
}
