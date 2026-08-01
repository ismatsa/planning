import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell, CheckCheck, ClipboardCheck, UserCheck } from 'lucide-react';
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

/** Kanban columns are strictly the business statuses that already exist in the model. */
const COLUMNS: StatutDevis[] = [
  'demande_recue',
  'a_chiffrer',
  'en_cours_de_devis',
  'en_attente_infos',
  'devis_pret',
  'envoye',
  'valide',
  'refuse',
  'annule',
];

/** Tooltip wording per column, reusing the existing status semantics. */
const COLUMN_HINT: Record<StatutDevis, (n: number) => string> = {
  demande_recue: n => `${n} demande${n > 1 ? 's' : ''} reçue${n > 1 ? 's' : ''}`,
  a_chiffrer: n => `${n} devis en attente de chiffrage`,
  en_cours_de_devis: n => `${n} devis en cours de chiffrage`,
  en_attente_infos: n => `${n} devis en attente d'informations`,
  devis_pret: n => `${n} devis à valider`,
  envoye: n => `${n} devis envoyé${n > 1 ? 's' : ''}`,
  valide: n => `${n} devis validé${n > 1 ? 's' : ''}`,
  refuse: n => `${n} devis refusé${n > 1 ? 's' : ''}`,
  annule: n => `${n} devis annulé${n > 1 ? 's' : ''}`,
};

const COLUMN_ACCENT: Record<StatutDevis, string> = {
  demande_recue: 'bg-sky-500',
  a_chiffrer: 'bg-amber-500',
  en_cours_de_devis: 'bg-orange-500',
  en_attente_infos: 'bg-yellow-500',
  devis_pret: 'bg-violet-500',
  envoye: 'bg-primary',
  valide: 'bg-emerald-500',
  refuse: 'bg-destructive',
  annule: 'bg-muted-foreground',
};

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
  onOpen,
}: {
  devis: Devis;
  activity: CardActivity;
  assignedLabel?: string;
  onOpen: (devis: Devis, trigger: HTMLElement) => void;
}) {
  const { crm } = useStore();
  const parties = resolveDevisParties(devis, crm.clients, crm.vehicules);
  const vin = parties.vehicule?.vin || devis.vin;
  const isSent = devis.statut === 'envoye';
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
      className="rounded-lg border bg-card p-3 space-y-2 cursor-pointer transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      </div>

      <div className="text-[11px] text-muted-foreground space-y-0.5">
        <p>{formatDistanceToNow(new Date(devis.updatedAt || devis.createdAt), { addSuffix: true, locale: fr })}</p>
        {assignedLabel && <p>Assigné à {assignedLabel}</p>}
      </div>
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

  const columns = useMemo(() => {
    return COLUMNS.map(statut => ({
      statut,
      cards: devisList
        .filter(d => d.statut === statut)
        .sort((a, b) =>
          new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()),
    }));
  }, [devisList]);

  return (
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
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max items-start">
            {columns.map(({ statut, cards }) => (
              <section key={statut} className="w-[260px] shrink-0 rounded-lg bg-muted/30 border">
                <header className="flex items-center gap-2 p-3 border-b">
                  <span className={`h-2.5 w-2.5 rounded-full ${COLUMN_ACCENT[statut]}`} aria-hidden="true" />
                  <h2 className="text-sm font-semibold flex-1 truncate">{STATUT_DEVIS_LABELS[statut]}</h2>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        tabIndex={0}
                        className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {cards.length}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{COLUMN_HINT[statut](cards.length)}</TooltipContent>
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
                        assignedLabel={
                          d.assignedUserId
                            ? (d.assignedUserId === user?.id ? 'vous' : profileNames[d.assignedUserId] || undefined)
                            : undefined
                        }
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
  );
}
