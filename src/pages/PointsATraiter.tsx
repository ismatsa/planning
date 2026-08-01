import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertCircle, AtSign, CheckCheck, FileText, MessageSquare, UserCheck, ClipboardCheck, Send,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActionItems, ActionItem, ActionItemKind } from '@/store/ActionItemsContext';

const kindIcon: Record<ActionItemKind, any> = {
  assignation: UserCheck,
  commentaire: MessageSquare,
  mention: AtSign,
  devis: Send,
  demande: FileText,
  alerte: AlertCircle,
};

const kindLabel: Record<ActionItemKind, string> = {
  assignation: 'Assignation',
  commentaire: 'Commentaire',
  mention: 'Mention',
  devis: 'Devis',
  demande: 'Demande de devis',
  alerte: 'Alerte',
};

function ItemRow({ item, onOpen, onMarkRead }: { item: ActionItem; onOpen: () => void; onMarkRead: () => void }) {
  const Icon = kindIcon[item.kind];
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); }
      }}
      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        item.category === 'notification' && !item.read ? 'bg-muted/30 border-primary/30' : ''
      }`}
    >
      <div className="mt-0.5 shrink-0 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{item.title}</span>
          <Badge variant="secondary" className="text-[10px]">{kindLabel[item.kind]}</Badge>
          {item.category === 'notification' && (
            <Badge variant={item.read ? 'outline' : 'default'} className="text-[10px]">
              {item.read ? 'Lu' : 'Non lu'}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 break-words">{item.summary}</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {item.actor ? `${item.actor} · ` : ''}
          {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: fr })}
        </p>
      </div>
      {item.category === 'notification' && !item.read && (
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0"
          onClick={e => { e.stopPropagation(); onMarkRead(); }}
        >
          Marquer comme lu
        </Button>
      )}
    </div>
  );
}

export default function PointsATraiter() {
  const navigate = useNavigate();
  const { tasks, notifications, items, unreadNotificationsCount, openTasksCount, markAsRead, markAllNotificationsAsRead, loading } = useActionItems();
  const [tab, setTab] = useState('a-traiter');

  const open = (item: ActionItem) => {
    if (item.category === 'notification') markAsRead(item.key);
    navigate(item.link);
  };

  const lists = useMemo(() => ({
    'a-traiter': tasks,
    notifications,
    tout: items,
  }), [tasks, notifications, items]);

  const emptyLabel: Record<string, string> = {
    'a-traiter': 'Aucun point à traiter.',
    notifications: 'Aucune nouvelle notification.',
    tout: 'Aucun point à traiter.',
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-display font-bold">Points à traiter</h1>
        </div>
        {unreadNotificationsCount > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={markAllNotificationsAsRead}>
            <CheckCheck className="h-4 w-4" />
            Tout marquer comme lu
          </Button>
        )}
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="a-traiter">À traiter {openTasksCount > 0 && `(${openTasksCount})`}</TabsTrigger>
          <TabsTrigger value="notifications">Notifications {unreadNotificationsCount > 0 && `(${unreadNotificationsCount})`}</TabsTrigger>
          <TabsTrigger value="tout">Tout</TabsTrigger>
        </TabsList>

        {(['a-traiter', 'notifications', 'tout'] as const).map(key => (
          <TabsContent key={key} value={key} className="space-y-2 mt-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : lists[key].length === 0 ? (
              <p className="text-sm text-muted-foreground">{emptyLabel[key]}</p>
            ) : (
              lists[key].map(item => (
                <ItemRow
                  key={item.key}
                  item={item}
                  onOpen={() => open(item)}
                  onMarkRead={() => markAsRead(item.key)}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
