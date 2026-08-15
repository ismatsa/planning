import { useState, useRef, useEffect, useCallback } from 'react';
import { RendezVous, StatutRdv, STATUT_LABELS } from '@/types';
import { format } from 'date-fns';
import { useStore } from '@/store/StoreContext';
import { CheckSquare } from 'lucide-react';
import { isUnresolved } from '@/lib/planning';
import { useAuth } from '@/store/AuthContext';
import { normalizeHex, contrastTextColor } from '@/lib/colors';


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
  const { postes, metiers, crm } = useStore();
  const { user } = useAuth();
  const poste = postes.find(p => p.id === rdv.posteId);
  const metier = metiers.find(m => m.id === poste?.metierId);

  // Résolution via relations CRM, fallback sur les champs historiques
  const client = rdv.clientId ? crm.clients.find(c => c.id === rdv.clientId) : undefined;
  const vehicule = rdv.vehiculeId ? crm.vehicules.find(v => v.id === rdv.vehiculeId) : undefined;

  const clientLabel =
    (client
      ? (client.typeClient === 'societe'
          ? (client.raisonSociale || [client.prenom, client.nom].filter(Boolean).join(' '))
          : [client.prenom, client.nom].filter(Boolean).join(' '))
      : rdv.clientNom) || 'Client non renseigné';

  const vehiculeLabel =
    (vehicule
      ? [vehicule.marque, vehicule.modele].filter(Boolean).join(' ')
      : [rdv.marque, rdv.modele].filter(Boolean).join(' ')) || 'Véhicule non renseigné';

  const prestation = (rdv.notes || '').split('\n')[0].trim() || 'Prestation non renseignée';


  const isNoShow = rdv.statut === 'noshow';
  const isTermine = rdv.statut === 'termine';
  const unresolved = isUnresolved(rdv.debut, rdv.fin, rdv.statut);


  // Source de vérité : la couleur du poste (color_hex). Fallback neutre sinon.
  const posteColor = poste?.colorHex && normalizeHex(poste.colorHex) ? normalizeHex(poste.colorHex)! : null;

  const bgColor = hasConflict
    ? 'hsl(var(--destructive))'
    : isNoShow
      ? '#000000'
      : unresolved
        ? 'hsl(var(--destructive))'
        : isTermine
          ? 'hsl(142 71% 35%)'
          : posteColor
            ? posteColor
            : 'hsl(var(--muted))';

  const textColor = hasConflict
    ? 'hsl(var(--destructive-foreground))'
    : (isNoShow || isTermine || unresolved)
      ? '#ffffff'
      : posteColor
        ? contrastTextColor(posteColor)
        : 'hsl(var(--muted-foreground))';


  const [showTooltip, setShowTooltip] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [position, setPosition] = useState<'above' | 'below'>('above');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [blockWidth, setBlockWidth] = useState(0);

  // Mesure réelle du bloc (aucune largeur déduite de la durée)
  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setBlockWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setBlockWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  // Priorité d'affichage : client > véhicule > prestation
  const showVehicule = blockWidth === 0 || blockWidth >= 150;
  const showPrestation = blockWidth >= 260;
  const showTime = blockWidth >= 200;

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
  const isLong = durationMin >= 120;


  const { position: pos, top, bottom, left, right, width, height, inset, ...visualStyle } = style || {} as any;
  // En positionnement absolu sans offsets ni dimensions, le wrapper se réduirait à
  // la largeur du contenu (effet « capsule »). On force alors un remplissage total.
  const isAbsolute = pos === 'absolute' || pos === 'fixed';
  const hasBox = inset !== undefined || width !== undefined || left !== undefined || right !== undefined;
  const wrapperStyle: React.CSSProperties = {
    position: pos,
    inset,
    top,
    bottom,
    left,
    right,
    width,
    height,
    ...(isAbsolute && !hasBox ? { inset: 0 } : {}),
  };

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
        title={[
          `${format(debutDate, 'HH:mm')} – ${format(finDate, 'HH:mm')} · ${STATUT_LABELS[rdv.statut]}`,
          clientLabel,
          vehiculeLabel,
          prestation,
        ].join('\n')}
        className="rounded-md px-2 py-1 text-left leading-[1.2] overflow-hidden cursor-pointer h-full
          transition-shadow hover:shadow-lg hover:z-10 border border-transparent
          flex items-center gap-1.5 whitespace-nowrap shadow-sm animate-fade-in w-full text-[11px]"
      >
        {/* Zone compacte horaire + statut */}
        <span className="flex items-center gap-1 shrink-0">
          {isTermine && <CheckSquare className="h-3 w-3 shrink-0" />}
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot[rdv.statut]}`} />
          {showTime && (
            <span className="font-semibold">
              {format(debutDate, 'HH:mm')}–{format(finDate, 'HH:mm')}
            </span>
          )}
        </span>

        {/* Ligne unique : prénom nom — voiture — prestation */}
        <span className="flex-1 min-w-0 flex items-baseline gap-1 overflow-hidden whitespace-nowrap">
          <span className="font-bold truncate shrink-[1]">{clientLabel}</span>
          {showVehicule && (
            <>
              <span className="opacity-60 shrink-0">—</span>
              <span className="font-medium opacity-95 truncate shrink-[2]">{vehiculeLabel}</span>
            </>
          )}
          {showPrestation && (
            <>
              <span className="opacity-60 shrink-0">—</span>
              <span className="opacity-90 truncate shrink-[3]">{prestation}</span>
            </>
          )}
        </span>
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

          <div className="pt-1 border-t border-border">
            <span className="font-semibold">Client : </span>
            <span>{clientLabel}</span>
          </div>

          <div className="text-muted-foreground">
            <span className="font-semibold text-foreground">Véhicule : </span>
            {[vehiculeLabel, vehicule?.annee ?? rdv.annee, vehicule?.immatriculation].filter(Boolean).join(' · ')}
          </div>

          <div className="pt-1 border-t border-border text-muted-foreground italic">
            <span className="font-semibold not-italic text-foreground">Prestation : </span>{rdv.notes || 'Prestation non renseignée'}
          </div>

        </div>
      )}
    </div>
  );
}
