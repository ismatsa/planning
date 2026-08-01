import { useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ReturnOriginProvider } from '@/lib/returnNav';
import DevisDetailDialog from '@/components/devis/DevisDetailDialog';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Bell, CheckCheck, ClipboardCheck, UserCheck } from 'lucide-react';
import FollowUpButton from '@/components/devis/FollowUpButton';
import { isVisibleInKanban, needsFollowUp } from '@/lib/statusAge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/store/AuthContext';
import { useStore } from '@/store/StoreContext';
import { useActionItems, ActionItem } from '@/store/ActionItemsContext';
import { STATUT_DEVIS_LABELS, StatutDevis, Devis } from '@/types/devis';
import { resolveDevisParties } from '@/lib/devisDisplay';
import { ClientNameCell, VehiculeCell } from '@/components/devis/PartyCells';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

/**
 * Kanban columns. Les statuts restent inchangés en base : seul l'affichage regroupe
 * demande_recue / a_chiffrer / en_cours_de_devis dans une colonne « Devis à traiter ».
 */
interface KanbanColumnDef {
  key: string;
  label: string;
  statuts: StatutDevis[];
  accent: string;
  hint: (n: number) => string;
}

const COLUMN_DEFS: KanbanColumnDef[] = [
  {
    key: 'a_traiter',
    label: 'Devis à traiter',
    statuts: ['demande_recue', 'a_chiffrer', 'en_cours_de_devis'],
    accent: 'bg-sky-500',
    hint: n => `${n} devis à traiter`,
  },
  {
    key: 'en_attente_infos',
    label: STATUT_DEVIS_LABELS.en_attente_infos,
    statuts: ['en_attente_infos'],
    accent: 'bg-yellow-500',
    hint: n => `${n} devis en attente d'informations`,
  },
  {
    key: 'devis_pret',
    label: STATUT_DEVIS_LABELS.devis_pret,
    statuts: ['devis_pret'],
    accent: 'bg-violet-500',
    hint: n => `${n} devis à valider`,
  },
  {
    key: 'envoye',
    label: STATUT_DEVIS_LABELS.envoye,
    statuts: ['envoye'],
    accent: 'bg-primary',
    hint: n => `${n} devis envoyé${n > 1 ? 's' : ''}`,
  },
  {
    key: 'valide',
    label: STATUT_DEVIS_LABELS.valide,
    statuts: ['valide'],
    accent: 'bg-emerald-500',
    hint: n => `${n} devis validé${n > 1 ? 's' : ''}`,
  },
  {
    key: 'refuse',
    label: STATUT_DEVIS_LABELS.refuse,
    statuts: ['refuse'],
    accent: 'bg-destructive',
    hint: n => `${n} devis refusé${n > 1 ? 's' : ''}`,
  },
  {
    key: 'annule',
    label: STATUT_DEVIS_LABELS.annule,
    statuts: ['annule'],
    accent: 'bg-muted-foreground',
    hint: n => `${n} devis annulé${n > 1 ? 's' : ''}`,
  },
];

interface CardActivity {
  unread: number;
  assigned: boolean;
  tasks: number;
  lastDate?: string;
}

function ActivityBadge({ activity }: { activity: CardActivity }) {
  const lines: string[] = [];
  if (activity.unread > 0) lines.push(`${activity.unread} nouveau${activity.unread > 1 ? 'x' : ''} message${activity.unread > 1 ? 's' : ''}`);
  if (activity.assigned) lines.push('Assigné à vous');
  if (activity.lastDate) {
    lines.push(`Dernière activité : ${formatDistanceToNow(new Date(activity.lastDate), { addSuffix: true, locale: fr })}`);
  }
  if (lines.length === 0) return null;

  const Icon = activity.unread > 0 ? Bell : UserCheck;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon className="h-3 w-3" aria-hidden="true" />
          {activity.unread > 0 && activity.unread}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-0.5">
          {lines.map(l => <p key={l} className="text-xs">{l}</p>)}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function KanbanCard({
  devis,
  activity,
  assignedLabel,
  assignedToMe,
  canSeeContact,
  onOpen,
}: {
  devis: Devis;
  activity: CardActivity;
  assignedLabel?: string;
  assignedToMe: boolean;
  canSeeContact: boolean;
  onOpen: (devis: Devis, trigger: HTMLElement) => void;
}) {
  const { crm } = useStore();
  const parties = resolveDevisParties(devis, crm.clients, crm.vehicules);
  const vin = parties.vehicule?.vin || devis.vin;
  const isSent = devis.statut === 'envoye';
  const relance = needsFollowUp(devis);
  const highlight = relance || assignedToMe;
  const open = (e: React.SyntheticEvent) => onOpen(devis, e.currentTarget as HTMLElement);

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); }
      }}
      aria-label={`Ouvrir ${isSent ? 'le devis envoyé' : 'la demande de devis'} ${parties.clientName}`}
      className={`rounded-lg border p-3 space-y-2 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        highlight
          ? `bg-destructive/10 hover:bg-destructive/15 ${assignedToMe ? 'border-destructive/70' : 'border-destructive/40'}`
          : 'bg-card hover:bg-muted/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <ClientNameCell
            name={parties.clientName}
            clientId={parties.client?.id}
            canSee
            className="text-sm"
          />
        </div>
        <ActivityBadge activity={activity} />
      </div>

      <VehiculeCell
        label={parties.vehiculeLabel}
        vin={vin}
        vehiculeId={parties.vehicule?.id}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-[10px]">
          {isSent ? 'Devis envoyé' : 'Demande de devis'}
        </Badge>
        <Badge variant="secondary" className="text-[10px]">{STATUT_DEVIS_LABELS[devis.statut]}</Badge>
        {assignedToMe && (
          <Badge variant="destructive" className="text-[10px] gap-1">
            <UserCheck className="h-3 w-3" aria-hidden="true" />
            À vous
          </Badge>
        )}
        {relance && (
          <Badge variant="destructive" className="text-[10px] gap-1">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Relance à préparer
          </Badge>
        )}
      </div>

      <div className="text-[11px] text-muted-foreground space-y-0.5">
        <p>{formatDistanceToNow(new Date(devis.updatedAt || devis.createdAt), { addSuffix: true, locale: fr })}</p>
        {assignedLabel && !assignedToMe && <p>Assigné à {assignedLabel}</p>}
      </div>

      {relance && (
        <FollowUpButton
          devisId={devis.id}
          phone={parties.clientPhone}
          canSeeContact={canSeeContact}
        />
      )}
    </div>
  );
}


export default function PointsATraiter() {
  const { user } = useAuth();
  const { devis: devisStore } = useStore();
  const { devisList } = devisStore;
  const { items, unreadNotificationsCount, markAllNotificationsAsRead, totalCount, loading } = useActionItems();
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [openDevis, setOpenDevis] = useState<Devis | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const restored = (location.state || {}) as { openDevisId?: string; scrollX?: number; scrollY?: number };
  const restoredRef = useRef(false);

  /** Restore the Kanban position and the previously open pop-up when coming back. */
  useEffect(() => {
    if (restoredRef.current || devisList.length === 0) return;
    restoredRef.current = true;
    if (restored.openDevisId) {
      const d = devisList.find(x => x.id === restored.openDevisId);
      if (d) setOpenDevis(d);
    }
    requestAnimationFrame(() => {
      if (boardRef.current && typeof restored.scrollX === 'number') {
        boardRef.current.scrollLeft = restored.scrollX;
      }
      if (typeof restored.scrollY === 'number') window.scrollTo({ top: restored.scrollY });
    });
  }, [devisList, restored.openDevisId, restored.scrollX, restored.scrollY]);

  const handleOpenCard = (d: Devis, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setOpenDevis(d);
  };
  const closeDialog = () => {
    setOpenDevis(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    supabase.from('profiles').select('id, company, email').then(({ data }) => {
      if (!data) return;
      const map: Record<string, string> = {};
      for (const p of data as any[]) map[p.id] = p.company || p.email || '';
      setProfileNames(map);
    });
  }, []);

  /** Feed / assignation signals, keyed by quote id, derived from the existing action items. */
  const activityByDevis = useMemo(() => {
    const map = new Map<string, CardActivity>();
    const bump = (id: string, fn: (a: CardActivity) => void) => {
      const current = map.get(id) || { unread: 0, assigned: false, tasks: 0 };
      fn(current);
      map.set(id, current);
    };
    const devisIdOf = (item: ActionItem) => item.link.split('/').pop() || '';
    for (const item of items) {
      const id = devisIdOf(item);
      if (!id) continue;
      bump(id, a => {
        if (item.category === 'notification' && !item.read) a.unread += 1;
        if (item.category === 'task') {
          a.tasks += 1;
          if (item.kind === 'assignation') a.assigned = true;
        }
        if (!a.lastDate || new Date(item.date) > new Date(a.lastDate)) a.lastDate = item.date;
      });
    }
    return map;
  }, [items]);

  /** Rétention : les colonnes Validé / Refusé / Annulé n'affichent que les 7 derniers jours. */
  const columns = useMemo(() => {
    const now = Date.now();
    return COLUMN_DEFS.map(def => ({
      def,
      cards: devisList
        .filter(d => def.statuts.includes(d.statut) && isVisibleInKanban(d, now))
        .sort((a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()),
    })).filter(col => col.cards.length > 0);
  }, [devisList]);

  return (
    <ReturnOriginProvider
      value={() => ({
        label: 'Points à traiter',
        state: {
          openDevisId: openDevis?.id,
          scrollX: boardRef.current?.scrollLeft ?? 0,
          scrollY: window.scrollY,
        },
      })}
    >
    <div className="p-4 lg:p-6 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-display font-bold">Points à traiter</h1>
          {totalCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="default" className="text-[10px]">{totalCount > 99 ? '99+' : totalCount}</Badge>
              </TooltipTrigger>
              <TooltipContent>{totalCount} point{totalCount > 1 ? 's' : ''} à traiter</TooltipContent>
            </Tooltip>
          )}
        </div>
        {unreadNotificationsCount > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={markAllNotificationsAsRead}>
            <CheckCheck className="h-4 w-4" />
            Tout marquer comme lu
          </Button>
        )}
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : columns.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun point à traiter pour le moment.</p>
      ) : (
        <div className="overflow-x-auto pb-4" ref={boardRef}>
          <div className="flex gap-3 min-w-max items-start">
            {columns.map(({ def, cards }) => (
              <section key={def.key} className="w-[260px] shrink-0 rounded-lg bg-muted/30 border">
                <header className="flex items-center gap-2 p-3 border-b">
                  <span className={`h-2.5 w-2.5 rounded-full ${def.accent}`} aria-hidden="true" />
                  <h2 className="text-sm font-semibold flex-1 truncate">{def.label}</h2>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        tabIndex={0}
                        className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {cards.length}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{def.hint(cards.length)}</TooltipContent>
                  </Tooltip>
                </header>
                <div className="p-2 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
                  {cards.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-1 py-2">Aucun élément.</p>
                  ) : (
                    cards.map(d => (
                      <KanbanCard
                        key={d.id}
                        devis={d}
                        activity={activityByDevis.get(d.id) || { unread: 0, assigned: false, tasks: 0 }}
                        assignedToMe={!!user && d.assignedUserId === user.id}
                        assignedLabel={
                          d.assignedUserId && d.assignedUserId !== user?.id
                            ? profileNames[d.assignedUserId] || undefined
                            : undefined
                        }
                        canSeeContact={!!user}
                        onOpen={handleOpenCard}
                      />

                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      <DevisDetailDialog
        devis={openDevis}
        open={!!openDevis}
        onOpenChange={o => { if (!o) closeDialog(); }}
      />
    </div>
    </ReturnOriginProvider>
  );
}
