import { describe, it, expect } from 'vitest';
import { toText } from '@/components/assistant/AssistantWidget';

describe('toText', () => {
  it('rend les objets sans [object Object]', () => {
    expect(toText({ label: 'Recherche véhicule' })).toBe('Recherche véhicule');
    expect(toText({ champ: 'immatriculation', raison: 'absente' }))
      .toBe('champ : immatriculation — raison : absente');
    expect(toText(['immatriculation', { label: 'motorisation' }]))
      .toBe('immatriculation, motorisation');
    expect(toText({ a: 1 })).not.toContain('[object Object]');
  });
});
