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
      onClick={() => onClick(rdv)}
      style={style}
      className={`absolute left-1 right-1 rounded-md px-2 py-1 text-left text-xs overflow-hidden cursor-pointer
        transition-shadow hover:shadow-md hover:z-10 border border-transparent
        ${bgClass} animate-fade-in`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot[rdv.statut]}`} />
        <span className="font-semibold truncate">
          {format(new Date(rdv.debut), 'HH:mm')} – {format(new Date(rdv.fin), 'HH:mm')}
        </span>
      </div>
      {rdv.clientNom && (
        <div className="truncate font-medium opacity-80">{rdv.clientNom}</div>
      )}
      {rdv.vehicule && (
        <div className="truncate opacity-60">{rdv.vehicule}</div>
      )}
    </button>
  );
}
