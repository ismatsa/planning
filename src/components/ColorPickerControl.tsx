import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pipette } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeHex, contrastTextColor, DEFAULT_POSTE_COLOR, HEX_ERROR } from '@/lib/colors';

interface Props {
  value: string;
  onChange: (hex: string) => void;
  compact?: boolean;
}

export function isEyeDropperSupported() {
  return typeof window !== 'undefined' && 'EyeDropper' in window;
}

/** Sélecteur de couleur : nuancier natif, saisie hexadécimale et pipette écran. */
export default function ColorPickerControl({ value, onChange, compact = false }: Props) {
  const normalized = normalizeHex(value);
  const supported = isEyeDropperSupported();

  async function pickFromScreen() {
    if (!supported) {
      toast.error("La pipette n'est pas disponible dans ce navigateur.");
      return;
    }
    try {
      // @ts-expect-error API EyeDropper non typée
      const result = await new window.EyeDropper().open();
      const hex = normalizeHex(result?.sRGBHex ?? '');
      if (hex) onChange(hex);
    } catch {
      // Sélection annulée par l'utilisateur : aucune action
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Sélecteur de couleur"
          value={normalized || DEFAULT_POSTE_COLOR}
          onChange={e => onChange(e.target.value.toUpperCase())}
          className={`${compact ? 'h-8 w-10' : 'h-9 w-12'} cursor-pointer rounded border bg-background p-1`}
        />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#F59E0B"
          className={`font-mono uppercase ${compact ? 'h-8 text-xs' : ''}`}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={compact ? 'h-8 w-8 shrink-0' : 'h-9 w-9 shrink-0'}
          onClick={pickFromScreen}
          disabled={!supported}
          title={supported ? "Pipette : choisir une couleur à l'écran" : 'Pipette non supportée par ce navigateur'}
          aria-label="Pipette"
        >
          <Pipette className="h-4 w-4" />
        </Button>
        <span
          className={`${compact ? 'h-8 w-8' : 'h-9 w-9'} shrink-0 rounded border flex items-center justify-center text-[10px] font-bold`}
          style={
            normalized
              ? { backgroundColor: normalized, color: contrastTextColor(normalized) }
              : { background: 'transparent' }
          }
          title="Aperçu"
        >
          Aa
        </span>
      </div>
      {!normalized && <p className="text-xs text-destructive">{HEX_ERROR}</p>}
    </div>
  );
}
