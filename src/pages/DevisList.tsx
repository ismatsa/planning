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
import { Search, Plus, CalendarDays, Flame, SlidersHorizontal } from 'lucide-react';
import { SearchableMultiSelect } from '@/components/ui/searchable-multi-select';
import { supabase } from '@/integrations/supabase/client';
import { parsePhone, toWhatsAppNumber } from '@/components/ui/phone-input';
import { MessageCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

const TERMINAL_STATUSES: StatutDevis[] = ['valide', 'refuse', 'annule'];

const statusBadgeClass: Record<StatutDevis, string> = {
  demande_recue: 'bg-blue-100 text-blue-700',
  a_chiffrer: 'bg-amber-100 text-amber-700',
  en_cours_de_devis: 'bg-indigo-100 text-indigo-700',
  en_attente_infos: 'bg-orange-100 text-orange-700',
  devis_pret: 'bg-teal-100 text-teal-700',
  envoye: 'bg-purple-100 text-purple-700',
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
  const [onlyMine, setOnlyMine] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Temp state for dialog (apply on confirm)
  const [tmpMetier, setTmpMetier] = useState('all');
  const [tmpStatut, setTmpStatut] = useState('all');
  const [tmpResponsibles, setTmpResponsibles] = useState<string[]>([]);
  const [tmpOnlyMine, setTmpOnlyMine] = useState(false);
  const [tmpShowPast, setTmpShowPast] = useState(false);

  const [profileOptions, setProfileOptions] = useState<{ id: string; company: string }[]>([]);
  const [linkedRdvMap, setLinkedRdvMap] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadOptions() {
      const [profilesRes, rdvRes] = await Promise.all([
        supabase.from('profiles').select('id, company'),
        supabase.from('rendez_vous').select('id, source_devis_id').not('source_devis_id', 'is', null),
      ]);
      if (profilesRes.data) {
        setProfileOptions(
          (profilesRes.data as any[])
            .filter(p => p.company && p.company.trim() !== '')
            .map(p => ({ id: p.id, company: p.company }))
        );
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

  const filtered = useMemo(() => {
    return devisList
      .filter(d => {
        // Always exclude "envoye" from main demands list — it has its own dedicated page
        if (d.statut === 'envoye') return false;
        if (!showPast && !onlyMine && filterStatut === 'all' && TERMINAL_STATUSES.includes(d.statut)) return false;
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
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [devisList, filterMetier, filterStatut, search, filterResponsibles, devisResponsibles, devisIntervenants, devisMetiers, onlyMine, showPast, user]);

  const myActionCount = useMemo(() => {
    if (!user) return 0;
    return devisList.filter(d => d.assignedUserId === user.id && !TERMINAL_STATUSES.includes(d.statut)).length;
  }, [devisList, user]);

  // Count active filters (excluding defaults)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (onlyMine) count++;
    if (showPast) count++;
    if (filterMetier !== 'all') count++;
    if (filterStatut !== 'all') count++;
    if (filterResponsibles.length > 0) count++;
    return count;
  }, [onlyMine, showPast, filterMetier, filterStatut, filterResponsibles]);

  function openFilters() {
    setTmpMetier(filterMetier);
    setTmpStatut(filterStatut);
    setTmpResponsibles([...filterResponsibles]);
    setTmpOnlyMine(onlyMine);
    setTmpShowPast(showPast);
    setFiltersOpen(true);
  }

  function applyFilters() {
    setFilterMetier(tmpMetier);
    setFilterStatut(tmpStatut);
    setFilterResponsibles(tmpResponsibles);
    setOnlyMine(tmpOnlyMine);
    setShowPast(tmpShowPast);
    setFiltersOpen(false);
  }

  function resetFilters() {
    setTmpMetier('all');
    setTmpStatut('all');
    setTmpResponsibles([]);
    setTmpOnlyMine(false);
    setTmpShowPast(false);
  }

  function getRowStyle(d: { statut: StatutDevis; assignedUserId?: string }) {
    const isTerminal = TERMINAL_STATUSES.includes(d.statut);
    const isAssignedToMe = d.assignedUserId === user?.id;

    if (isTerminal) return 'opacity-50';
    if (isAssignedToMe) return 'bg-red-100 border-l-[6px] border-l-red-600 font-semibold';
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

      {/* Search + Filters button */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
        </div>
        <Button variant="outline" size="sm" onClick={openFilters} className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtres
          {(activeFilterCount > 0 || myActionCount > 0) && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
              {myActionCount > 0 ? myActionCount : activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filters Sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-[360px] sm:w-[400px] flex flex-col">
          <SheetHeader>
            <SheetTitle>Filtres</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-5 py-4 overflow-y-auto">
            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <Checkbox
                  checked={tmpOnlyMine}
                  onCheckedChange={(v) => setTmpOnlyMine(v === true)}
                />
                <span className="text-sm font-medium">Mes devis à traiter</span>
                {myActionCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                    {myActionCount}
                  </span>
                )}
              </label>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <Checkbox
                  checked={tmpShowPast}
                  onCheckedChange={(v) => setTmpShowPast(v === true)}
                />
                <span className="text-sm font-medium">Afficher les devis passés</span>
              </label>
            </div>

            <Separator />

            {/* Selectors */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Métier</label>
                <Select value={tmpMetier} onValueChange={setTmpMetier}>
                  <SelectTrigger><SelectValue placeholder="Métier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les métiers</SelectItem>
                    {metiers.map(m => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Statut</label>
                <Select value={tmpStatut} onValueChange={setTmpStatut}>
                  <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    {Object.entries(STATUT_DEVIS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Responsable</label>
                <SearchableMultiSelect
                  options={responsibleFilterOptions}
                  selected={tmpResponsibles}
                  onChange={setTmpResponsibles}
                  placeholder="Responsable…"
                  compact
                  getLabel={(id) => profileOptions.find(p => p.id === id)?.company || id}
                />
              </div>
            </div>
          </div>

          <SheetFooter className="flex-row gap-2 border-t pt-4">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Réinitialiser
            </Button>
            <Button size="sm" onClick={applyFilters}>
              Appliquer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
