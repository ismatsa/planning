import { cn } from '@/lib/utils';
import { normalizePlateCountry, parseMoroccanPlate, plateCountryName } from '@/lib/immatriculation';

interface Props {
  value?: string | null;
  country?: string | null;
  className?: string;
  compact?: boolean;
}

export default function ImmatriculationBadge({ value, country = 'MA', className, compact = false }: Props) {
  if (!value?.trim()) return null;
  const code = normalizePlateCountry(country);
  const moroccan = code === 'MA' ? parseMoroccanPlate(value) : null;
  const cellHeight = compact ? 'h-5' : 'h-7';
  const textSize = compact ? 'text-[11px]' : 'text-sm';

  if (moroccan) {
    return (
      <span
        dir="ltr"
        className={cn('inline-flex shrink-0 overflow-hidden rounded-[4px] border border-foreground/30 bg-card text-card-foreground shadow-sm', className)}
        aria-label={`Immatriculation marocaine ${moroccan.numero} ${moroccan.lettre} ${moroccan.region}`}
        title="Maroc (MA)"
      >
        <span className={cn('flex min-w-[3.4rem] items-center justify-center px-2 font-mono font-semibold tracking-wide', cellHeight, textSize)}>
          {moroccan.numero}
        </span>
        <span className={cn('flex min-w-[2rem] items-center justify-center border-x border-foreground/30 px-1.5 font-semibold', cellHeight, compact ? 'text-sm' : 'text-lg')}>
          {moroccan.lettre}
        </span>
        <span className={cn('flex min-w-[1.75rem] items-center justify-center px-1.5 font-mono font-semibold', cellHeight, textSize)}>
          {moroccan.region}
        </span>
      </span>
    );
  }

  return (
    <span
      dir="ltr"
      className={cn('inline-flex shrink-0 items-center overflow-hidden rounded-[4px] border border-foreground/30 bg-card font-mono font-semibold text-card-foreground shadow-sm', cellHeight, textSize, className)}
      title={plateCountryName(code)}
    >
      <span className="border-r border-foreground/30 px-1.5 text-[9px] text-muted-foreground">{code}</span>
      <span className="px-2 tracking-wide">{value.trim().toUpperCase()}</span>
    </span>
  );
}
