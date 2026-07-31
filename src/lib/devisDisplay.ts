import type { Client, Vehicule } from '@/types/crm';
import type { Devis } from '@/types/devis';

export const NOT_SET = 'Non renseigné';

export function clientDisplayName(c: Client): string {
  if (c.typeClient === 'societe') {
    return c.raisonSociale?.trim() || [c.prenom, c.nom].filter(Boolean).join(' ').trim() || NOT_SET;
  }
  return [c.prenom, c.nom].filter(Boolean).join(' ').trim() || c.raisonSociale?.trim() || NOT_SET;
}

/**
 * Resolves the CRM client + vehicle attached to a quote.
 * Priority: direct relation (client_id / vehicule_id) > client owning the linked vehicle
 * > denormalized text fields kept on the quote for legacy rows.
 */
export function resolveDevisParties(
  d: Pick<Devis, 'clientId' | 'vehiculeId' | 'clientNom' | 'clientTel' | 'marque' | 'modele' | 'annee' | 'vin'>,
  clients: Client[],
  vehicules: Vehicule[],
) {
  const vehicule =
    (d.vehiculeId ? vehicules.find(v => v.id === d.vehiculeId) : undefined) ||
    (d.vin ? vehicules.find(v => v.vin && v.vin.toLowerCase() === d.vin!.toLowerCase()) : undefined);

  const client =
    (d.clientId ? clients.find(c => c.id === d.clientId) : undefined) ||
    (vehicule?.clientId ? clients.find(c => c.id === vehicule.clientId) : undefined);

  const clientName = client ? clientDisplayName(client) : (d.clientNom?.trim() || NOT_SET);
  const clientPhone = client?.telephone?.trim() || d.clientTel?.trim() || '';

  const vehiculeLabel = vehicule
    ? [vehicule.marque, vehicule.modele, vehicule.annee].filter(Boolean).join(' ')
    : [d.marque, d.modele, d.annee].filter(Boolean).join(' ');

  return {
    client,
    vehicule,
    clientName,
    clientPhone,
    vehiculeLabel: vehiculeLabel || NOT_SET,
  };
}
