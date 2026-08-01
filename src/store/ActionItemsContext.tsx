import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/store/AuthContext';
import { useStore } from '@/store/StoreContext';
import { STATUT_DEVIS_LABELS, StatutDevis } from '@/types/devis';

const TERMINAL_STATUSES: StatutDevis[] = ['valide', 'refuse', 'annule'];

export type ActionItemKind = 'assignation' | 'commentaire' | 'mention' | 'devis' | 'demande' | 'alerte';

export interface ActionItem {
  /** Stable key used for read-state persistence and de-duplication. */
  key: string;
  category: 'task' | 'notification';
  kind: ActionItemKind;
  title: string;
  summary: string;
  actor?: string;
  date: string;
  link: string;
  read: boolean;
  /** Higher first inside a same-date bucket. */
  priority: number;
}

interface DevisComment {
  id: string;
  devis_id: string;
  user_id: string;
  content: string | null;
  created_at: string;
}

interface ActionItemsValue {
  items: ActionItem[];
  tasks: ActionItem[];
  notifications: ActionItem[];
  unreadNotificationsCount: number;
  openTasksCount: number;
  totalCount: number;
  loading: boolean;
  markAsRead: (key: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const ActionItemsContext = createContext<ActionItemsValue | null>(null);

const NOTIFICATION_WINDOW_DAYS = 30;

function truncate(text: string, max = 120) {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'Sans contenu';
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function ActionItemsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { devis: devisStore } = useStore();
  const { devisList, devisResponsibles } = devisStore;

  const [comments, setComments] = useState<DevisComment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [readKeys, setReadKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setComments([]);
      setReadKeys(new Set());
      setLoading(false);
      return;
    }
    const since = new Date(Date.now() - NOTIFICATION_WINDOW_DAYS * 86400000).toISOString();
    const [commentsRes, profilesRes, readsRes] = await Promise.all([
      supabase.from('devis_comments').select('id, devis_id, user_id, content, created_at').gte('created_at', since),
      supabase.from('profiles').select('id, email, company'),
      supabase.from('notification_reads').select('item_key').eq('user_id', user.id),
    ]);

    if (commentsRes.data) setComments(commentsRes.data as DevisComment[]);
    if (profilesRes.data) {
      const map: Record<string, string> = {};
      for (const p of profilesRes.data as any[]) map[p.id] = p.company || p.email || p.id;
      setProfiles(map);
    }
    if (readsRes.data) setReadKeys(new Set((readsRes.data as any[]).map(r => r.item_key)));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Realtime: keep the badge and the page in sync.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('action-items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devis_comments' }, () => { load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devis' }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const items = useMemo<ActionItem[]>(() => {
    if (!user) return [];
    const myEmailHandle = (user.email || '').split('@')[0].toLowerCase();
    const result: ActionItem[] = [];

    const involvedDevis = new Map<string, { isResponsible: boolean; isAssigned: boolean; isCreator: boolean }>();
    for (const d of devisList) {
      const isResponsible = (devisResponsibles[d.id] || []).includes(user.id);
      const isAssigned = d.assignedUserId === user.id;
      const isCreator = d.createdBy === user.id;
      if (isResponsible || isAssigned || isCreator) {
        involvedDevis.set(d.id, { isResponsible, isAssigned, isCreator });
      }
    }

    // --- Tasks: derived from existing assignments and quote statuses ---
    for (const d of devisList) {
      const rel = involvedDevis.get(d.id);
      if (!rel) continue;
      if (TERMINAL_STATUSES.includes(d.statut)) continue;

      const label = d.clientNom?.trim() || 'Client non renseigné';
      const base = { category: 'task' as const, date: d.updatedAt || d.createdAt, link: `/devis/${d.id}`, read: true };

      if (d.statut === 'en_attente_infos' && (rel.isAssigned || rel.isResponsible)) {
        result.push({
          ...base,
          key: `task:infos:${d.id}`,
          kind: 'alerte',
          title: 'Informations client à compléter',
          summary: `${label} — ${STATUT_DEVIS_LABELS[d.statut]}`,
          priority: 3,
        });
      } else if (d.statut === 'devis_pret' && (rel.isAssigned || rel.isResponsible)) {
        result.push({
          ...base,
          key: `task:pret:${d.id}`,
          kind: 'devis',
          title: 'Devis en attente de traitement',
          summary: `${label} — ${STATUT_DEVIS_LABELS[d.statut]}`,
          priority: 2,
        });
      } else if (rel.isAssigned) {
        result.push({
          ...base,
          key: `task:assign:${d.id}`,
          kind: 'assignation',
          title: d.statut === 'envoye' ? 'Devis envoyé assigné à vous' : 'Demande de devis assignée à vous',
          summary: `${label} — ${STATUT_DEVIS_LABELS[d.statut]}`,
          priority: 1,
        });
      }
    }

    // --- Notifications: existing feed entries on quotes the user is involved in ---
    for (const c of comments) {
      if (c.user_id === user.id) continue;
      const rel = involvedDevis.get(c.devis_id);
      if (!rel) continue;
      const d = devisList.find(x => x.id === c.devis_id);
      const label = d?.clientNom?.trim() || 'Demande de devis';
      const content = c.content || '';
      const isMention = myEmailHandle.length > 1 && content.toLowerCase().includes(`@${myEmailHandle}`);
      const key = `comment:${c.id}`;
      result.push({
        key,
        category: 'notification',
        kind: isMention ? 'mention' : 'commentaire',
        title: isMention
          ? 'Vous avez été mentionné dans une discussion'
          : d?.statut === 'envoye'
            ? 'Nouveau commentaire sur un devis envoyé'
            : 'Nouveau commentaire sur une demande de devis',
        summary: `${label} — ${truncate(content)}`,
        actor: profiles[c.user_id],
        date: c.created_at,
        link: `/devis/${c.devis_id}`,
        read: readKeys.has(key),
        priority: isMention ? 2 : 1,
      });
    }

    return result.sort((a, b) => {
      const unread = Number(a.read) - Number(b.read);
      if (unread !== 0) return unread;
      const d = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (d !== 0) return d;
      return b.priority - a.priority;
    });
  }, [user, devisList, devisResponsibles, comments, profiles, readKeys]);

  const tasks = useMemo(() => items.filter(i => i.category === 'task'), [items]);
  const notifications = useMemo(() => items.filter(i => i.category === 'notification'), [items]);
  const unreadNotificationsCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const openTasksCount = tasks.length;

  const markAsRead = useCallback(async (key: string) => {
    if (!user || readKeys.has(key)) return;
    setReadKeys(prev => new Set(prev).add(key));
    await supabase.from('notification_reads').upsert(
      { user_id: user.id, item_key: key },
      { onConflict: 'user_id,item_key' },
    );
  }, [user, readKeys]);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.read).map(n => n.key);
    if (unread.length === 0) return;
    setReadKeys(prev => {
      const next = new Set(prev);
      unread.forEach(k => next.add(k));
      return next;
    });
    await supabase.from('notification_reads').upsert(
      unread.map(k => ({ user_id: user.id, item_key: k })),
      { onConflict: 'user_id,item_key' },
    );
  }, [user, notifications]);

  const value: ActionItemsValue = {
    items,
    tasks,
    notifications,
    unreadNotificationsCount,
    openTasksCount,
    totalCount: unreadNotificationsCount + openTasksCount,
    loading,
    markAsRead,
    markAllNotificationsAsRead,
    refresh: load,
  };

  return <ActionItemsContext.Provider value={value}>{children}</ActionItemsContext.Provider>;
}

export function useActionItems(): ActionItemsValue {
  const ctx = useContext(ActionItemsContext);
  if (!ctx) throw new Error('useActionItems must be used within ActionItemsProvider');
  return ctx;
}
