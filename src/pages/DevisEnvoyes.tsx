import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/store/AuthContext';
import { format, differenceInCalendarDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Send, Bell, AlertTriangle, Clock, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { parsePhone, toWhatsAppNumber } from '@/components/ui/phone-input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Devis } from '@/types/devis';

type Bucket = 'recent' | 'monitor' | 'followup' | 'critical';

const BUCKETS: {
  key: Bucket;
  label: string;
  icon: any;
  rangeLabel: string;
  cardClass: string;
  iconClass: string;
}[] = [
  { key: 'recent',   label: 'Récents',     icon: Send,          rangeLabel: '< 3 jours',    cardClass: 'border-l-4 border-l-blue-500',   iconClass: 'text-blue-600' },
  { key: 'monitor',  label: 'À surveiller', icon: Clock,        rangeLabel: '3 – 7 jours',  cardClass: 'border-l-4 border-l-amber-500',  iconClass: 'text-amber-600' },
  { key: 'followup', label: 'À relancer',   icon: Bell,         rangeLabel: '7 – 30 jours', cardClass: 'border-l-4 border-l-orange-500', iconClass: 'text-orange-600' },
  { key: 'critical', label: 'Critique',     icon: AlertTriangle,rangeLabel: '> 30 jours',   cardClass: 'border-l-4 border-l-red-600',    iconClass: 'text-red-600' },
];

function bucketFor(days: number): Bucket {
  if (days < 3) return 'recent';
  if (days < 7) return 'monitor';
  if (days <= 30) return 'followup';
  return 'critical';
}

export default function DevisEnvoyes() {
  const { metiers, devis: devisStore } = useStore();
  const { devisList, devisResponsibles, devisMetiers, recordFollowUp } = devisStore;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [profileOptions, setProfileOptions] = useState<{ id: string; company: string }[]>([]);

  const [followUpTarget, setFollowUpTarget] = useState<Devis | null>(null);
  const [followUpComment, setFollowUpComment] = useState('');
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('profiles').select('id, company');
      if (data) {
        setProfileOptions(
          (data as any[])
            .filter(p => p.company && p.company.trim() !== '')
            .map(p => ({ id: p.id, company: p.company }))
        );
      }
    }
    load();
  }, []);

  const sentDevis = useMemo(() => {
    const today = new Date();
    return devisList
      .filter(d => d.statut === 'envoye')
      .filter(d => {
        if (!search) return true;
        const s = search.toLowerCase();
        const vehicleStr = [d.marque, d.modele].filter(Boolean).join(' ').toLowerCase();
        return d.clientNom?.toLowerCase().includes(s) || vehicleStr.includes(s);
      })
      .map(d => {
        const ref = d.sentAt ? new Date(d.sentAt) : new Date(d.updatedAt);
        const days = differenceInCalendarDays(today, ref);
        return { devis: d, days, bucket: bucketFor(days) };
      })
      .sort((a, b) => b.days - a.days);
  }, [devisList, search]);

  const grouped = useMemo(() => {
    const map: Record<Bucket, typeof sentDevis> = {
      recent: [], monitor: [], followup: [], critical: [],
    };
    for (const item of sentDevis) map[item.bucket].push(item);
    return map;
  }, [sentDevis]);

  async function submitFollowUp() {
    if (!followUpTarget) return;
    setSavingFollowUp(true);
    await recordFollowUp(followUpTarget.id, followUpComment);
    toast.success('Relance enregistrée');
    setSavingFollowUp(false);
    setFollowUpTarget(null);
    setFollowUpComment('');
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold">Devis envoyés</h1>
          <p className="text-sm text-muted-foreground">
            {sentDevis.length} devis en attente de réponse client
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
      </div>

      {sentDevis.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Send className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">Aucun devis envoyé</p>
          <p className="text-sm mt-1">
            Passez un devis au statut « Devis envoyé » pour commencer le suivi.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {BUCKETS.map(b => {
            const items = grouped[b.key];
            if (items.length === 0) return null;
            const Icon = b.icon;
            return (
              <section key={b.key} className={`rounded-lg border bg-card overflow-hidden ${b.cardClass}`}>
                <header className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${b.iconClass}`} />
                    <h2 className="font-semibold text-sm">{b.label}</h2>
                    <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{b.rangeLabel}</span>
                </header>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Envoyé le</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Délai</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Client</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Téléphone</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Véhicule</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Métiers</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Assigné</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Relances</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(({ devis: d, days }) => {
                      const dMetiers = devisMetiers[d.id] || [];
                      return (
                        <tr
                          key={d.id}
                          className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => navigate(`/devis/${d.id}`)}
                        >
                          <td className="px-4 py-3 text-xs">
                            {d.sentAt
                              ? format(new Date(d.sentAt), 'd MMM yyyy', { locale: fr })
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs font-medium">
                            {days === 0 ? "aujourd'hui" : `${days} j`}
                          </td>
                          <td className="px-4 py-3">{d.clientNom || '—'}</td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            {d.clientTel ? (() => {
                              const { countryCode, number } = parsePhone(d.clientTel);
                              const waNum = toWhatsAppNumber(countryCode, number);
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={`https://wa.me/${waNum}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs hover:underline"
                                      style={{ color: '#25D366' }}
                                    >
                                      <MessageCircle className="h-3.5 w-3.5" />
                                      {countryCode} {number}
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent>Relance WhatsApp</TooltipContent>
                                </Tooltip>
                              );
                            })() : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {[d.marque, d.modele, d.annee].filter(Boolean).join(' ') || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {dMetiers.map(mid => {
                                const m = metiers.find(m => m.id === mid);
                                return (
                                  <span
                                    key={mid}
                                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium metier-${m?.couleur}-light`}
                                  >
                                    {m?.nom || mid}
                                  </span>
                                );
                              })}
                              {dMetiers.length === 0 && '—'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {d.assignedUserId
                              ? (profileOptions.find(p => p.id === d.assignedUserId)?.company || '—')
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {d.followUpCount > 0 ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1">
                                    <Bell className="h-3 w-3 text-orange-600" />
                                    {d.followUpCount}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Dernière relance :{' '}
                                  {d.lastFollowUpAt
                                    ? format(new Date(d.lastFollowUpAt), 'd MMM yyyy HH:mm', { locale: fr })
                                    : '—'}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setFollowUpTarget(d);
                                setFollowUpComment('');
                              }}
                            >
                              <Bell className="h-3.5 w-3.5 mr-1.5" />
                              Relancer
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      )}

      {/* Follow-up dialog */}
      <Dialog open={!!followUpTarget} onOpenChange={(o) => !o && setFollowUpTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer une relance</DialogTitle>
          </DialogHeader>
          {followUpTarget && (
            <div className="space-y-3 py-2">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {followUpTarget.clientNom || 'Client'}
                </span>
                {' — '}
                {[followUpTarget.marque, followUpTarget.modele].filter(Boolean).join(' ')}
              </div>
              <div className="text-xs text-muted-foreground">
                Relance #{(followUpTarget.followUpCount || 0) + 1}
                {followUpTarget.sentAt && (
                  <>
                    {' · '}envoyé il y a{' '}
                    {differenceInCalendarDays(new Date(), new Date(followUpTarget.sentAt))} jour(s)
                  </>
                )}
              </div>
              <Textarea
                placeholder="Note de relance (ajoutée au fil de discussion)…"
                value={followUpComment}
                onChange={e => setFollowUpComment(e.target.value)}
                rows={4}
                autoFocus
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFollowUpTarget(null)} disabled={savingFollowUp}>
              Annuler
            </Button>
            <Button onClick={submitFollowUp} disabled={savingFollowUp}>
              {savingFollowUp ? 'Enregistrement…' : 'Enregistrer la relance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
