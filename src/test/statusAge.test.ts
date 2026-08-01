import { describe, it, expect } from 'vitest';
import { isVisibleInKanban, needsFollowUp, statusAgeMs, RETENTION_MS } from '@/lib/statusAge';

const NOW = Date.UTC(2026, 7, 1, 12, 0, 0);
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const H = 3600 * 1000;

describe('rétention des colonnes clôturées', () => {
  it('affiche un devis validé il y a 6 j 23 h', () => {
    expect(isVisibleInKanban({ statut: 'valide', statusChangedAt: ago(RETENTION_MS - H) }, NOW)).toBe(true);
  });
  it('masque un devis refusé il y a plus de 7 jours', () => {
    expect(isVisibleInKanban({ statut: 'refuse', statusChangedAt: ago(RETENTION_MS + H) }, NOW)).toBe(false);
  });
  it('masque un devis annulé sans date fiable', () => {
    expect(isVisibleInKanban({ statut: 'annule' }, NOW)).toBe(false);
  });
  it('ne filtre pas les autres colonnes', () => {
    expect(isVisibleInKanban({ statut: 'a_chiffrer' }, NOW)).toBe(true);
    expect(isVisibleInKanban({ statut: 'envoye', sentAt: ago(60 * 24 * H) }, NOW)).toBe(true);
  });
});

describe('relance des devis envoyés', () => {
  it('signale un devis envoyé depuis 8 jours', () => {
    expect(needsFollowUp({ statut: 'envoye', sentAt: ago(8 * 24 * H) }, NOW)).toBe(true);
  });
  it('ne signale pas un devis envoyé depuis 6 jours', () => {
    expect(needsFollowUp({ statut: 'envoye', sentAt: ago(6 * 24 * H) }, NOW)).toBe(false);
  });
  it('utilise status_changed_at si sent_at est absent', () => {
    expect(needsFollowUp({ statut: 'envoye', statusChangedAt: ago(9 * 24 * H) }, NOW)).toBe(true);
  });
  it('ne signale rien sans date fiable', () => {
    expect(needsFollowUp({ statut: 'envoye' }, NOW)).toBe(false);
    expect(statusAgeMs({ statut: 'envoye' }, NOW)).toBeNull();
  });
});
