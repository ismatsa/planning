// Utilitaires couleur pour les postes de travail.

export const HEX_ERROR = 'Saisissez une couleur hexadécimale valide, par exemple #F59E0B';

/** Normalise une saisie `RRGGBB` ou `#RRGGBB` en `#RRGGBB` majuscule. Retourne null si invalide. */
export function normalizeHex(input: string): string | null {
  const value = (input || '').trim();
  const match = /^#?([0-9a-fA-F]{6})$/.exec(value);
  if (!match) return null;
  return `#${match[1].toUpperCase()}`;
}

export function isValidHex(input: string): boolean {
  return normalizeHex(input) !== null;
}

/** Luminance relative (WCAG). */
function relativeLuminance(hex: string): number {
  const normalized = normalizeHex(hex);
  if (!normalized) return 1;
  const channels = [1, 3, 5].map(i => parseInt(normalized.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Retourne #000000 ou #FFFFFF selon le meilleur contraste réel avec la couleur de fond. */
export function contrastTextColor(hex: string): string {
  const l = relativeLuminance(hex);
  const contrastWhite = 1.05 / (l + 0.05);
  const contrastBlack = (l + 0.05) / 0.05;
  return contrastBlack >= contrastWhite ? '#000000' : '#FFFFFF';
}

export const DEFAULT_POSTE_COLOR = '#64748B';
