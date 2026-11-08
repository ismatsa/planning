import { describe, expect, it } from 'vitest';
import {
  buildMoroccanPlate,
  cleanGenericPlate,
  isCompletePlate,
  moroccanPartsFromValue,
  parseMoroccanPlate,
  plateSearchText,
} from '@/lib/immatriculation';

describe('immatriculation marocaine', () => {
  it('conserve les trois parties dans l’ordre visuel demandé', () => {
    const value = buildMoroccanPlate({ numero: '82913', lettre: 'ط', region: '1' });
    expect(value).toBe('82913 | ط | 1');
    expect(parseMoroccanPlate(value)).toEqual({ numero: '82913', lettre: 'ط', region: '1' });
  });

  it('refuse une plaque marocaine incomplète', () => {
    expect(isCompletePlate('82913 |  | ', 'MA')).toBe(false);
    expect(isCompletePlate('82913 | ط | 1', 'MA')).toBe(true);
  });

  it('reprend une ancienne saisie avec une lettre latine', () => {
    expect(moroccanPartsFromValue('82913-T-1')).toEqual({ numero: '82913', lettre: 'ط', region: '1' });
  });

  it('limite les autres pays aux caractères alphanumériques, espaces et tirets', () => {
    expect(cleanGenericPlate('ab<script>-123 cd')).toBe('ABSCRIPT-123 CD');
  });

  it('recherche une plaque sans tenir compte des séparateurs', () => {
    expect(plateSearchText('82913 | ط | 1')).toBe('82913ط1');
  });
});
