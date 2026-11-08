export const PLATE_COUNTRIES = [
  { code: 'MA', name: 'Maroc' },
  { code: 'DZ', name: 'Algérie' },
  { code: 'TN', name: 'Tunisie' },
  { code: 'FR', name: 'France' },
  { code: 'BE', name: 'Belgique' },
  { code: 'ES', name: 'Espagne' },
  { code: 'PT', name: 'Portugal' },
  { code: 'IT', name: 'Italie' },
  { code: 'DE', name: 'Allemagne' },
  { code: 'NL', name: 'Pays-Bas' },
  { code: 'CH', name: 'Suisse' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'GB', name: 'Royaume-Uni' },
] as const;

export const MOROCCAN_PLATE_LETTERS = [
  { arabic: 'أ', latin: 'A' },
  { arabic: 'ب', latin: 'B' },
  { arabic: 'د', latin: 'D' },
  { arabic: 'ه', latin: 'H' },
  { arabic: 'و', latin: 'W' },
  { arabic: 'ز', latin: 'Z' },
  { arabic: 'ح', latin: 'H' },
  { arabic: 'ط', latin: 'T' },
  { arabic: 'ي', latin: 'Y' },
  { arabic: 'ك', latin: 'K' },
  { arabic: 'ل', latin: 'L' },
  { arabic: 'م', latin: 'M' },
  { arabic: 'ن', latin: 'N' },
] as const;

const ARABIC_LETTERS = MOROCCAN_PLATE_LETTERS.map(letter => letter.arabic);
const LETTER_CLASS = ARABIC_LETTERS.join('');
const COMPLETE_MA_RE = new RegExp(`^(\\d{1,5})\\s*\\|\\s*([${LETTER_CLASS}])\\s*\\|\\s*(\\d{1,2})$`, 'u');

export interface MoroccanPlateParts {
  numero: string;
  lettre: string;
  region: string;
}

export function normalizePlateCountry(country?: string | null): string {
  const value = (country || 'MA').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(value) ? value : 'MA';
}

export function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

export function cleanGenericPlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9 -]/g, '').replace(/\s{2,}/g, ' ').slice(0, 20);
}

export function parseMoroccanPlate(value?: string | null): MoroccanPlateParts | null {
  if (!value) return null;
  const match = value.trim().match(COMPLETE_MA_RE);
  if (!match) return null;
  return { numero: match[1], lettre: match[2], region: match[3] };
}

/** Lit aussi les anciennes saisies au format 12345-A-6 pour les rendre modifiables. */
export function moroccanPartsFromValue(value?: string | null): MoroccanPlateParts {
  const complete = parseMoroccanPlate(value);
  if (complete) return complete;
  const raw = (value || '').trim();
  if (!raw) return { numero: '', lettre: '', region: '' };

  if (raw.includes('|')) {
    const [numero = '', lettre = '', region = ''] = raw.split('|').map(part => part.trim());
    return {
      numero: digitsOnly(numero, 5),
      lettre: ARABIC_LETTERS.includes(lettre as typeof ARABIC_LETTERS[number]) ? lettre : '',
      region: digitsOnly(region, 2),
    };
  }

  const legacy = raw.match(/^(\d{1,5})\s*[-–—]\s*([A-Za-z\u0600-\u06FF])\s*[-–—]\s*(\d{1,2})$/);
  if (legacy) {
    const letter = MOROCCAN_PLATE_LETTERS.find(item => item.arabic === legacy[2] || item.latin === legacy[2].toUpperCase());
    return { numero: legacy[1], lettre: letter?.arabic || '', region: legacy[3] };
  }

  return { numero: '', lettre: '', region: '' };
}

export function buildMoroccanPlate(parts: MoroccanPlateParts): string {
  if (!parts.numero && !parts.lettre && !parts.region) return '';
  return `${parts.numero} | ${parts.lettre} | ${parts.region}`;
}

export function isCompletePlate(value: string, country = 'MA'): boolean {
  if (!value.trim()) return true;
  if (normalizePlateCountry(country) === 'MA') return parseMoroccanPlate(value) !== null;
  return /^[A-Z0-9][A-Z0-9 -]{0,19}$/.test(value.trim().toUpperCase());
}

export function plateCountryName(country?: string | null): string {
  const code = normalizePlateCountry(country);
  return PLATE_COUNTRIES.find(item => item.code === code)?.name || code;
}

export function plateSearchText(value?: string | null): string {
  return (value || '').toLocaleUpperCase().replace(/[\s|_\-–—]/g, '');
}
