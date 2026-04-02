import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/StoreContext';
import { useAuth } from '@/store/AuthContext';
import { STATUT_DEVIS_LABELS, StatutDevis } from '@/types/devis';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, CalendarDays, Bell, Flame } from 'lucide-react';
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select';
import { supabase } from '@/integrations/supabase/client';
import { parsePhone, toWhatsAppNumber } from '@/components/ui/phone-input';
import { MessageCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const TERMINAL_STATUSES: StatutDevis[] = ['valide', 'refuse', 'annule'];

const statusBadgeClass: Record<StatutDevis, string> = {
  demande_recue: 'bg-blue-100 text-blue-700',
  a_chiffrer: 'bg-amber-100 text-amber-700',
  en_cours_de_devis: 'bg-indigo-100 text-indigo-700',
  en_attente_infos: 'bg-orange-100 text-orange-700',
  devis_pret: 'bg-teal-100 text-teal-700',
  devis_envoye: 'bg-orange-100 text-orange-700',
  valide: 'bg-green-100 text-green-700',
  refuse: 'bg-destructive/10 text-destructive',
  annule: 'bg-muted text-muted-foreground',
};

export default function DevisList() {
  const { metiers, devis: devisStore } = useStore();
  const { devisList, devisResponsibles, devisIntervenants, devisMetiers } = devisStore;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterMetier, setFilterMetier] = useState('all');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterResponsibles, setFilterResponsibles] = useState<string[]>([]);
  const [filterIntervenants, setFilterIntervenants] = useState<string[]>([]);
  const [onlyMine, setOnlyMine] = useState(false);
  const [hideTerminal, setHideTerminal] = useState(true);

  const [profileOptions, setProfileOptions] = useState<{ id: string; company: string }[]>([]);
  const [intervenantOptions, setIntervenantOptions] = useState<{ id: string; name: string }[]>([]);
  const [linkedRdvMap, setLinkedRdvMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadOptions() {
      const [profilesRes, intervenantsRes, rdvRes] = await Promise.all([
        supabase.from('profiles').select('id, company'),
        supabase.from('intervenants').select('id, name').order('name'),
        supabase.from('rendez_vous').select('id, source_devis_id').not('source_devis_id', 'is', null),
      ]);
      if (profilesRes.data) {
        setProfileOptions(
          (profilesRes.data as any[])
            .filter(p => p.company && p.company.trim() !== '')
            .map(p => ({ id: p.id, company: p.company }))
        );
      }
      if (intervenantsRes.data) {
        setIntervenantOptions((intervenantsRes.data as any[]).map(i => ({ id: i.id, name: i.name })));
      }
      if (rdvRes.data) {
        const map: Record<string, string> = {};
        for (const r of rdvRes.data as any[]) {
          if (r.source_devis_id) map[r.source_devis_id] = r.id;
        }
        setLinkedRdvMap(map);
      }
    }
    loadOptions();
  }, []);

  const responsibleFilterOptions = useMemo(() =>
    profileOptions.map(p => ({ id: p.id, label: p.company })), [profileOptions]);
  const intervenantFilterOptions = useMemo(() =>
    intervenantOptions.map(i => ({ id: i.id, label: i.name })), [intervenantOptions]);

  const filtered = useMemo(() => {
    return devisList
      .filter(d => {
        if (onlyMine) {
          if (d.assignedUserId !== user?.id) return false;
          if (TERMINAL_STATUSES.includes(d.statut)) return false;
        }
        if (filterStatut !== 'all' && d.statut !== filterStatut) return false;
        if (filterMetier !== 'all') {
          const dMetiers = devisMetiers[d.id] || [];
          if (!dMetiers.includes(filterMetier)) return false;
        }
        if (search) {
          const s = search.toLowerCase();
          const vehicleStr = [d.marque, d.modele].filter(Boolean).join(' ').toLowerCase();
          if (
            !d.clientNom?.toLowerCase().includes(s) &&
            !vehicleStr.includes(s)
          ) return false;
        }
        if (filterResponsibles.length > 0) {
          const resps = devisResponsibles[d.id] || [];
          if (!filterResponsibles.some(fr => resps.includes(fr))) return false;
        }
        if (filterIntervenants.length > 0) {
          const ints = devisIntervenants[d.id] || [];
          if (!filterIntervenants.some(fi => ints.includes(fi))) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [devisList, filterMetier, filterStatut, search, filterResponsibles, filterIntervenants, devisResponsibles, devisIntervenants, devisMetiers, onlyMine, user]);

  const myActionCount = useMemo(() => {
    if (!user) return 0;
    return devisList.filter(d => d.assignedUserId === user.id && !TERMINAL_STATUSES.includes(d.statut)).length;
  }, [devisList, user]);

  function getRowStyle(d: { statut: StatutDevis; assignedUserId?: string }) {
    const isTerminal = TERMINAL_STATUSES.includes(d.statut);
    const isAssignedToMe = d.assignedUserId === user?.id;
    const isDevisEnvoye = d.statut === 'devis_envoye';

    if (isTerminal) return 'opacity-50';
    if (isAssignedToMe && !isTerminal) return 'bg-red-50 border-l-[5px] border-l-red-500';
    if (isDevisEnvoye) return 'bg-orange-50 border-l-4 border-l-orange-400';
    return '';
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-display font-bold">Demandes de devis</h1>
          <p className="text-sm text-muted-foreground">{devisList.length} devis au total</p>
        </div>
        <Button onClick={() => navigate('/devis/creer')}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau devis
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Button
          variant={onlyMine ? 'default' : 'outline'}
          size="sm"
          onClick={() => setOnlyMine(!onlyMine)}
          className="gap-1.5"
        >
          🔥 Mes devis à traiter
          {myActionCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              {myActionCount}
            </span>
          )}
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56" />
        </div>
        <Select value={filterMetier} onValueChange={setFilterMetier}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Métier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les métiers</SelectItem>
            {metiers.map(m => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(STATUT_DEVIS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="w-48">
          <SearchableMultiSelect
            options={responsibleFilterOptions}
            selected={filterResponsibles}
            onChange={setFilterResponsibles}
            placeholder="Responsable…"
            compact
            getLabel={(id) => profileOptions.find(p => p.id === id)?.company || id}
          />
        </div>
        <div className="w-48">
          <SearchableMultiSelect
            options={intervenantFilterOptions}
            selected={filterIntervenants}
            onChange={setFilterIntervenants}
            placeholder="Intervenant…"
            compact
            getLabel={(id) => intervenantOptions.find(i => i.id === id)?.name || id}
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">Aucun devis</p>
          <p className="text-sm mt-1">Créez une demande de devis pour démarrer.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
             <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Téléphone</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Véhicule</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Métiers</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Responsable(s)</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Assigné à</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Facturation</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const resps = devisResponsibles[d.id] || [];
                const dMetiers = devisMetiers[d.id] || [];
                const billingProfile = d.billingResponsibleUserId
                  ? profileOptions.find(p => p.id === d.billingResponsibleUserId)
                  : null;
                const canSeeDetails = resps.includes(user?.id || '') || d.createdBy === user?.id;
                const isTerminal = TERMINAL_STATUSES.includes(d.statut);
                const isAssignedToMe = d.assignedUserId === user?.id && !isTerminal;
                const isDevisEnvoye = d.statut === 'devis_envoye';
                const linkedRdvId = d.statut === 'valide' ? linkedRdvMap[d.id] : undefined;

                return (
                  <tr
                    key={d.id}
                    className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors ${getRowStyle(d)}`}
                    onClick={() => navigate(`/devis/${d.id}`)}
                  >
                    <td className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {isAssignedToMe && <Flame className="h-4 w-4 text-red-500 shrink-0" />}
                        {format(new Date(d.createdAt), 'd MMM yyyy', { locale: fr })}
                      </span>
                    </td>
                    <td className="px-4 py-3">{canSeeDetails ? (d.clientNom || '—') : '—'}</td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {canSeeDetails && d.clientTel ? (() => {
                        const { countryCode, number } = parsePhone(d.clientTel);
                        const waNum = toWhatsAppNumber(countryCode, number);
                        const display = `${countryCode} ${number}`;
                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={`https://wa.me/${waNum}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm hover:underline cursor-pointer"
                                style={{ color: '#25D366' }}
                              >
                                <MessageCircle className="h-4 w-4 shrink-0" />
                                <span>{display}</span>
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>Envoyer un message WhatsApp</TooltipContent>
                          </Tooltip>
                        );
                      })() : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">{[d.marque, d.modele, d.annee].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {dMetiers.map(mid => {
                          const m = metiers.find(m => m.id === mid);
                          return (
                            <span key={mid} className={`inline-block px-2 py-0.5 rounded text-xs font-medium metier-${m?.couleur}-light`}>
                              {m?.nom || mid}
                            </span>
                          );
                        })}
                        {dMetiers.length === 0 && '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {resps.map(rid => profileOptions.find(p => p.id === rid)?.company || '').filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {d.assignedUserId ? (profileOptions.find(p => p.id === d.assignedUserId)?.company || '—') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {billingProfile ? billingProfile.company : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className={statusBadgeClass[d.statut]}>
                          {STATUT_DEVIS_LABELS[d.statut]}
                        </Badge>
                        {isDevisEnvoye && !isTerminal && (
                          <Badge variant="outline" className="border-orange-400 text-orange-600 text-[10px] px-1.5 py-0 gap-0.5 animate-pulse">
                            <Bell className="h-3 w-3" />
                            À relancer
                          </Badge>
                        )}
                        {linkedRdvId && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={e => { e.stopPropagation(); navigate(`/rendez-vous`); }}
                                className="inline-flex items-center text-primary hover:text-primary/80"
                              >
                                <CalendarDays className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Voir le rendez-vous lié</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
