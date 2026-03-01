import { useState, useRef, useEffect, useCallback } from 'react';
import { RendezVous, StatutRdv, STATUT_LABELS } from '@/types';
import { format } from 'date-fns';
import { useStore } from '@/store/StoreContext';
import { CheckSquare } from 'lucide-react';
import { isUnresolved } from '@/lib/planning';
import { useAuth } from '@/store/AuthContext';

interface Props {
  rdv: RendezVous;
  onClick: (rdv: RendezVous) => void;
  onResizeStart?: (rdv: RendezVous, edge: 'left' | 'right', e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  hasConflict?: boolean;
  isResizing?: boolean;
}

const statusDot: Record<StatutRdv, string> = {
  prevu: 'bg-background/60',
  confirme: 'bg-green-400',
  annule: 'bg-destructive',
  noshow: 'bg-background/60',
  termine: 'bg-emerald-500',
};

export default function RdvBlock({ rdv, onClick, onResizeStart, style, hasConflict, isResizing }: Props) {
  const { postes, metiers } = useStore();
  const { user } = useAuth();
  const poste = postes.find(p => p.id === rdv.posteId);
  const metier = metiers.find(m => m.id === poste?.metierId);
  const isOwner = rdv.createdBy === user?.id;

  const isNoShow = rdv.statut === 'noshow';
  const isTermine = rdv.statut === 'termine';
  const unresolved = isUnresolved(rdv.debut, rdv.fin, rdv.statut);

  const bgColor = hasConflict
    ? 'hsl(var(--destructive))'
    : isNoShow
      ? '#000000'
      : unresolved
        ? 'hsl(var(--destructive))'
        : isTermine
          ? 'hsl(142 71% 35%)'
          : metier
            ? `hsl(var(--${metier.couleur}))`
            : 'hsl(var(--muted))';

  const textColor = hasConflict
    ? 'hsl(var(--destructive-foreground))'
    : (isNoShow || isTermine || unresolved)
      ? '#ffffff'
      : metier
        ? `hsl(var(--${metier.couleur}-foreground))`
        : 'hsl(var(--muted-foreground))';

  const [showTooltip, setShowTooltip] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [position, setPosition] = useState<'above' | 'below'>('above');
  const buttonRef = useRef<HTMLButtonElement>(null);

  const computePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    setPosition(spaceBelow < 200 && spaceAbove > spaceBelow ? 'above' : 'below');
  }, []);

  useEffect(() => {
    if (showTooltip) computePosition();
  }, [showTooltip, computePosition]);

  const durationMs = new Date(rdv.fin).getTime() - new Date(rdv.debut).getTime();
  const durationMin = Math.round(durationMs / 60000);
  const dJ = Math.floor(durationMin / (24 * 60));
  const dH = Math.floor((durationMin % (24 * 60)) / 60);
  const dM = durationMin % 60;
  const durationStr = [
    dJ > 0 ? `${dJ}j` : '',
    dH > 0 ? `${dH}h` : '',
    dM > 0 ? `${dM}min` : '',
  ].filter(Boolean).join(' ') || '0min';

  const debutDate = new Date(rdv.debut);
  const finDate = new Date(rdv.fin);
  const isMultiDay = format(debutDate, 'yyyy-MM-dd') !== format(finDate, 'yyyy-MM-dd');

  const { position: pos, top, bottom, left, right, width, height, ...visualStyle } = style || {} as any;
  const wrapperStyle: React.CSSProperties = { position: pos, top, bottom, left, right, width, height };

  const handleMouseEnter = () => { setHovered(true); if (!isResizing) setShowTooltip(true); };
  const handleMouseLeave = () => { setHovered(false); setShowTooltip(false); };

  return (
    <div
      className="relative group"
      style={wrapperStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
        onClick={(e) => { e.stopPropagation(); onClick(rdv); }}
        style={{ ...visualStyle, backgroundColor: bgColor, color: textColor }}
        className="rounded-md px-3 py-0.5 text-left text-[11px] overflow-hidden cursor-pointer h-full
          transition-shadow hover:shadow-lg hover:z-10 border border-transparent
          flex items-center gap-1.5 whitespace-nowrap shadow-sm animate-fade-in w-full"
      >
        {isTermine && <CheckSquare className="h-3 w-3 shrink-0" />}
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot[rdv.statut]}`} />
        <span className="font-bold">
          {format(debutDate, 'HH:mm')}–{format(finDate, 'HH:mm')}
        </span>
        {isOwner && rdv.clientNom && (
          <span className="font-semibold truncate opacity-90">{rdv.clientNom}</span>
        )}
        {(rdv.marque || rdv.modele) && (
          <span className="opacity-75 truncate">{[rdv.marque, rdv.modele].filter(Boolean).join(' ')}</span>
        )}
      </button>

      {/* Resize handles - visible on hover */}
      {onResizeStart && hovered && !isResizing && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-20 flex items-center justify-center"
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onResizeStart(rdv, 'left', e); }}
          >
            <div className="h-4 w-1 rounded-full bg-foreground/40" />
          </div>
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-20 flex items-center justify-center"
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); onResizeStart(rdv, 'right', e); }}
          >
            <div className="h-4 w-1 rounded-full bg-foreground/40" />
          </div>
        </>
      )}

      {/* Resize cursors on edges while resizing */}
      {isResizing && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-20" />
          <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-20" />
        </>
      )}

      {showTooltip && !isResizing && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-50 w-64 rounded-lg border bg-popover text-popover-foreground shadow-xl p-3 text-xs space-y-1.5 animate-fade-in ${
            position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">
              {format(debutDate, 'HH:mm')} – {format(finDate, 'HH:mm')}
            </span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: bgColor, color: textColor }}>
              {STATUT_LABELS[rdv.statut]}
            </span>
          </div>

          {isMultiDay && (
            <div className="text-muted-foreground">
              {format(debutDate, 'dd/MM/yyyy')} → {format(finDate, 'dd/MM/yyyy')}
            </div>
          )}

          <div className="text-muted-foreground">Durée : {durationStr}</div>

          {poste && metier && (
            <div className="text-muted-foreground">{metier.nom} · {poste.nom}</div>
          )}

          {isOwner && rdv.clientNom && (
            <div className="pt-1 border-t border-border">
              <span className="font-semibold">{rdv.clientNom}</span>
              {rdv.clientTel && <span className="ml-2 text-muted-foreground">{rdv.clientTel}</span>}
            </div>
          )}

          {(rdv.marque || rdv.modele || rdv.annee) && (
            <div className="text-muted-foreground">
              {[rdv.marque, rdv.modele, rdv.annee].filter(Boolean).join(' · ')}
            </div>
          )}

          {rdv.vin && (
            <div className="text-muted-foreground font-mono text-[10px]">VIN : {rdv.vin}</div>
          )}

          {isOwner && rdv.notes && (
            <div className="pt-1 border-t border-border text-muted-foreground italic">{rdv.notes}</div>
          )}
        </div>
      )}
    </div>
  );
}
