import { RendezVous, METIERS, StatutRdv } from '@/types';
import { format } from 'date-fns';
import { useStore } from '@/store/StoreContext';

interface Props {
  rdv: RendezVous;
  onClick: (rdv: RendezVous) => void;
  style?: React.CSSProperties;
  hasConflict?: boolean;
}

const statusDot: Record<StatutRdv, string> = {
  prevu: 'bg-background/60',
  confirme: 'bg-green-400',
  annule: 'bg-destructive',
  noshow: 'bg-background/60',
};

export default function RdvBlock({ rdv, onClick, style, hasConflict }: Props) {
  const { postes } = useStore();
  const poste = postes.find(p => p.id === rdv.posteId);
  const metier = METIERS.find(m => m.id === poste?.metierId);

  const bgColor = hasConflict
    ? 'hsl(var(--destructive))'
    : metier
      ? `hsl(var(--${metier.couleur}))`
      : 'hsl(var(--muted))';

  const textColor = hasConflict
    ? 'hsl(var(--destructive-foreground))'
    : metier
      ? `hsl(var(--${metier.couleur}-foreground))`
      : 'hsl(var(--muted-foreground))';

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(rdv); }}
      style={{ ...style, backgroundColor: bgColor, color: textColor }}
      className="rounded-md px-2 py-0.5 text-left text-[11px] overflow-hidden cursor-pointer
        transition-shadow hover:shadow-lg hover:z-10 border border-transparent
        flex items-center gap-1.5 whitespace-nowrap shadow-sm animate-fade-in"
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot[rdv.statut]}`} />
      <span className="font-bold">
        {format(new Date(rdv.debut), 'HH:mm')}–{format(new Date(rdv.fin), 'HH:mm')}
      </span>
      {rdv.clientNom && (
        <span className="font-semibold truncate opacity-90">{rdv.clientNom}</span>
      )}
      {(rdv.marque || rdv.modele) && (
        <span className="opacity-75 truncate">{[rdv.marque, rdv.modele].filter(Boolean).join(' ')}</span>
      )}
    </button>
  );
}
