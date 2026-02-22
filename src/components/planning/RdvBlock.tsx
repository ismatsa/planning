import { RendezVous, METIERS, StatutRdv } from '@/types';
import { format } from 'date-fns';
import { useStore } from '@/store/StoreContext';

interface Props {
  rdv: RendezVous;
  onClick: (rdv: RendezVous) => void;
  style?: React.CSSProperties;
}

const statusDot: Record<StatutRdv, string> = {
  prevu: 'bg-muted-foreground',
  confirme: 'bg-green-500',
  annule: 'bg-destructive',
  noshow: 'bg-mecanique',
};

export default function RdvBlock({ rdv, onClick, style }: Props) {
  const { postes } = useStore();
  const poste = postes.find(p => p.id === rdv.posteId);
  const metier = METIERS.find(m => m.id === poste?.metierId);

  const bgClass = metier
    ? `metier-${metier.id}-light`
    : 'bg-muted';

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(rdv); }}
      style={style}
      className={`rounded-md px-2 py-0.5 text-left text-[11px] overflow-hidden cursor-pointer
        transition-shadow hover:shadow-md hover:z-10 border border-transparent
        flex items-center gap-1.5 whitespace-nowrap
        ${bgClass} animate-fade-in`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot[rdv.statut]}`} />
      <span className="font-semibold">
        {format(new Date(rdv.debut), 'HH:mm')}–{format(new Date(rdv.fin), 'HH:mm')}
      </span>
      {rdv.clientNom && (
        <span className="font-medium opacity-80 truncate">{rdv.clientNom}</span>
      )}
      {(rdv.marque || rdv.modele) && (
        <span className="opacity-60 truncate">{[rdv.marque, rdv.modele].filter(Boolean).join(' ')}</span>
      )}
    </button>
  );
}
