import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { STATUT_LABELS, StatutRdv, RendezVous } from '@/types';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, Search, AlertTriangle, Users } from 'lucide-react';
import RdvModal from '@/components/planning/RdvModal';
import { getTimeSlots, dateWithTime } from '@/lib/planning';

type Periode = 'jour' | 'semaine' | 'mois';

const statusDot: Record<StatutRdv, string> = {
  prevu: 'bg-muted-foreground',
  confirme: 'bg-green-500',
  annule: 'bg-destructive',
  noshow: 'bg-foreground',
  termine: 'bg-emerald-500',
};

const UNASSIGNED = '__unassigned__';

export default function IntervenantsPlanning() {
  const { rdvs, postes, metiers, settings, appointmentIntervenants } = useStore();

  const [intervenants, setIntervenants] = useState<{ id: string; name: string }[]>([]);
  const [periode, setPeriode] = useState<Periode>('jour');
  const [refDate, setRefDate] = useState<Date>(new Date());
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterMetier, setFilterMetier] = useState('all');
  const [filterPoste, setFilterPoste] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editRdv, setEditRdv] = useState<RendezVous | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>(undefined);
  const [defaultTime, setDefaultTime] = useState<string | undefined>(undefined);
  const [defaultIntervenantId, setDefaultIntervenantId] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase
      .from('intervenants')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setIntervenants((data as any[]).map(i => ({ id: i.id, name: i.name })));
      });
  }, []);

  const days = useMemo(() => {
    if (periode === 'jour') return [refDate];
    if (periode === 'semaine') {
      const start = startOfWeek(refDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: endOfWeek(refDate, { weekStartsOn: 1 }) });
    }
    return eachDayOfInterval({ start: startOfMonth(refDate), end: endOfMonth(refDate) });
  }, [periode, refDate]);

  const periodLabel = useMemo(() => {
    if (periode === 'jour') return format(refDate, 'EEEE d MMMM yyyy', { locale: fr });
    if (periode === 'semaine')
      return `${format(days[0], 'd MMM', { locale: fr })} – ${format(days[days.length - 1], 'd MMM yyyy', { locale: fr })}`;
    return format(refDate, 'MMMM yyyy', { locale: fr });
  }, [periode, refDate, days]);

  function shift(dir: 1 | -1) {
    if (periode === 'jour') setRefDate(d => addDays(d, dir));
    else if (periode === 'semaine') setRefDate(d => addDays(d, dir * 7));
    else setRefDate(d => addMonths(d, dir));
  }

  // Colonnes : intervenants filtrés par la recherche
  const columns = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? intervenants.filter(i => i.name.toLowerCase().includes(q)) : intervenants;
    return [...list, { id: UNASSIGNED, name: 'Sans intervenant' }];
  }, [intervenants, search]);

  // Rendez-vous de la période, filtrés
  const periodRdvs = useMemo(() => {
    const start = new Date(days[0]);
    start.setHours(0, 0, 0, 0);
    const end = new Date(days[days.length - 1]);
    end.setHours(23, 59, 59, 999);
    return rdvs.filter(r => {
      const d = new Date(r.debut);
      if (d < start || d > end) return false;
      if (filterStatut !== 'all' && r.statut !== filterStatut) return false;
      if (filterPoste !== 'all' && r.posteId !== filterPoste) return false;
      if (filterMetier !== 'all') {
        const poste = postes.find(p => p.id === r.posteId);
        if (!poste || poste.metierId !== filterMetier) return false;
      }
      return true;
    });
  }, [rdvs, days, filterStatut, filterPoste, filterMetier, postes]);

  function rdvsFor(intervenantId: string, day: Date) {
    return periodRdvs
      .filter(r => {
        const ints = appointmentIntervenants[r.id] || [];
        const match = intervenantId === UNASSIGNED ? ints.length === 0 : ints.includes(intervenantId);
        return match && isSameDay(new Date(r.debut), day);
      })
      .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime());
  }

  function hasOverlap(rdv: RendezVous, intervenantId: string) {
    if (intervenantId === UNASSIGNED) return false;
    const s = new Date(rdv.debut).getTime();
    const e = new Date(rdv.fin).getTime();
    return periodRdvs.some(other => {
      if (other.id === rdv.id || other.statut === 'annule') return false;
      const ints = appointmentIntervenants[other.id] || [];
      if (!ints.includes(intervenantId)) return false;
      return s < new Date(other.fin).getTime() && e > new Date(other.debut).getTime();
    });
  }

  const slots = useMemo(
    () => getTimeSlots(settings.heureMin, settings.heureMax, 60),
    [settings.heureMin, settings.heureMax]
  );

  function openCreate(day: Date, time: string | undefined, intervenantId: string) {
    setEditRdv(null);
    setDefaultDate(day);
    setDefaultTime(time);
    setDefaultIntervenantId(intervenantId === UNASSIGNED ? undefined : intervenantId);
    setModalOpen(true);
  }

  function openEdit(rdv: RendezVous) {
    setEditRdv(rdv);
    setDefaultDate(undefined);
    setDefaultTime(undefined);
    setDefaultIntervenantId(undefined);
    setModalOpen(true);
  }

  function EventCard({ rdv, intervenantId }: { rdv: RendezVous; intervenantId: string }) {
    const overlap = hasOverlap(rdv, intervenantId);
    const poste = postes.find(p => p.id === rdv.posteId);
    return (
      <button
        onClick={e => {
          e.stopPropagation();
          openEdit(rdv);
        }}
        className={`w-full text-left rounded-md border bg-card px-2 py-1.5 text-xs hover:shadow-sm transition
          ${overlap ? 'border-destructive ring-1 ring-destructive/40' : 'border-border'}`}
      >
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot[rdv.statut]}`} />
          <span className="font-medium">
            {format(new Date(rdv.debut), 'HH:mm')}–{format(new Date(rdv.fin), 'HH:mm')}
          </span>
          {overlap && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
        </div>
        <div className="truncate text-foreground">{rdv.clientNom || 'Sans client'}</div>
        <div className="truncate text-muted-foreground">
          {[rdv.marque, rdv.modele].filter(Boolean).join(' ') || poste?.nom || STATUT_LABELS[rdv.statut]}
        </div>
      </button>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="font-display text-xl font-bold">Intervenants</h1>
        </div>
        <Button onClick={() => openCreate(refDate, undefined, UNASSIGNED)}>
          <Plus className="h-4 w-4 mr-1" /> Créer un événement
        </Button>
      </div>

      {/* Barre de navigation */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Période précédente">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Période suivante">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => setRefDate(new Date())}>Aujourd'hui</Button>
        <span className="text-sm font-medium capitalize px-2">{periodLabel}</span>
        <Input
          type="date"
          className="w-[160px]"
          value={format(refDate, 'yyyy-MM-dd')}
          onChange={e => e.target.value && setRefDate(new Date(`${e.target.value}T12:00:00`))}
        />
        <Select value={periode} onValueChange={v => setPeriode(v as Periode)}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="jour">Jour</SelectItem>
            <SelectItem value="semaine">Semaine</SelectItem>
            <SelectItem value="mois">Mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un intervenant…"
            className="pl-8 w-[220px]"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {(Object.keys(STATUT_LABELS) as StatutRdv[]).map(s => (
              <SelectItem key={s} value={s}>{STATUT_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterMetier} onValueChange={v => { setFilterMetier(v); setFilterPoste('all'); }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Métier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les métiers</SelectItem>
            {metiers.map(m => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPoste} onValueChange={setFilterPoste}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Poste" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les postes</SelectItem>
            {postes
              .filter(p => filterMetier === 'all' || p.metierId === filterMetier)
              .map(p => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grille */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <div className="min-w-max">
          {/* En-têtes */}
          <div className="flex sticky top-0 z-10 bg-muted/50 border-b border-border">
            <div className="w-24 shrink-0 px-2 py-2 text-xs font-semibold text-muted-foreground">
              {periode === 'jour' ? 'Horaire' : 'Jour'}
            </div>
            {columns.map(col => (
              <div
                key={col.id}
                className="w-48 shrink-0 border-l border-border px-2 py-2 text-xs font-semibold truncate"
              >
                {col.name}
              </div>
            ))}
          </div>

          {periode === 'jour'
            ? slots.map(slot => (
                <div key={slot} className="flex border-b border-border last:border-b-0">
                  <div className="w-24 shrink-0 px-2 py-2 text-xs text-muted-foreground">{slot}</div>
                  {columns.map(col => {
                    const items = rdvsFor(col.id, refDate).filter(r => {
                      const h = format(new Date(r.debut), 'HH');
                      return h === slot.slice(0, 2);
                    });
                    return (
                      <div
                        key={col.id}
                        onClick={() => openCreate(refDate, slot, col.id)}
                        className="w-48 shrink-0 border-l border-border p-1 space-y-1 min-h-[52px] cursor-pointer hover:bg-accent/40 transition"
                      >
                        {items.map(r => <EventCard key={r.id} rdv={r} intervenantId={col.id} />)}
                      </div>
                    );
                  })}
                </div>
              ))
            : days.map(day => (
                <div key={day.toISOString()} className="flex border-b border-border last:border-b-0">
                  <div className="w-24 shrink-0 px-2 py-2 text-xs text-muted-foreground capitalize">
                    {format(day, 'EEE d MMM', { locale: fr })}
                  </div>
                  {columns.map(col => {
                    const items = rdvsFor(col.id, day);
                    return (
                      <div
                        key={col.id}
                        onClick={() => openCreate(day, settings.heureMin, col.id)}
                        className="w-48 shrink-0 border-l border-border p-1 space-y-1 min-h-[52px] cursor-pointer hover:bg-accent/40 transition"
                      >
                        {items.map(r => <EventCard key={r.id} rdv={r} intervenantId={col.id} />)}
                      </div>
                    );
                  })}
                </div>
              ))}
        </div>
      </div>

      {intervenants.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun intervenant enregistré. Ajoutez des intervenants dans les paramètres.
        </p>
      )}

      <RdvModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        rdv={editRdv || undefined}
        defaultDate={defaultDate}
        defaultTime={defaultTime}
        defaultIntervenantId={defaultIntervenantId}
      />
    </div>
  );
}
