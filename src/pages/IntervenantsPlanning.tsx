import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '@/store/StoreContext';
import { useSidebarState } from '@/components/AppLayout';
import { getWorkingDays, formatDayHeader, getTimeSlots, timeToMinutes } from '@/lib/planning';
import { format, isSameDay, addDays, addMonths, startOfMonth, endOfMonth, differenceInCalendarDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import RdvBlock from '@/components/planning/RdvBlock';
import RdvModal from '@/components/planning/RdvModal';
import { Plus, ChevronLeft, ChevronRight, Users, Search, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { RendezVous } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/store/AuthContext';

const SLOT_WIDTH = 80; // px per 30-minute slot
const SNAP_MINUTES = 15;
const STORAGE_KEY = 'intervenants-planning-visible';

type Periode = 'jour' | 'semaine' | 'mois';

interface Intervenant {
  id: string;
  name: string;
  metier?: string | null;
  poste?: string | null;
}

const UNASSIGNED = '__unassigned__';

/** Couleur stable dérivée du nom de l'intervenant. */
function avatarHue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('');
}

export default function IntervenantsPlanning() {
  const { rdvs, settings, updateRdv, appointmentIntervenants, appointmentResponsibles } = useStore();
  const { user } = useAuth();
  const { collapsed } = useSidebarState();

  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [periode, setPeriode] = useState<Periode>('semaine');
  const [startDate, setStartDate] = useState(new Date());

  const [visibleIds, setVisibleIds] = useState<Set<string> | null>(null);
  const [resourceSearch, setResourceSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editRdv, setEditRdv] = useState<RendezVous | null>(null);
  const [newRdvDefaults, setNewRdvDefaults] = useState<{ date?: Date; time?: string; intervenantId?: string }>({});

  // Chargement des intervenants
  useEffect(() => {
    supabase
      .from('intervenants')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (!data) return;
        const list: Intervenant[] = (data as any[]).map(i => ({
          id: i.id,
          name: i.name,
          metier: i.metier ?? null,
          poste: i.poste ?? null,
        }));
        setIntervenants(list);
        // Restauration de la sélection de session
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const ids: string[] = JSON.parse(stored);
            setVisibleIds(new Set(ids));
            return;
          } catch {
            /* ignore */
          }
        }
        setVisibleIds(new Set([...list.map(i => i.id), UNASSIGNED]));
      });
  }, []);

  useEffect(() => {
    if (visibleIds) sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...visibleIds]));
  }, [visibleIds]);

  const allResources: Intervenant[] = useMemo(
    () => [...intervenants, { id: UNASSIGNED, name: 'Sans intervenant' }],
    [intervenants]
  );

  const displayDays = useMemo(() => {
    if (periode === 'jour') return getWorkingDays(startDate, settings.joursOuvres, 1);
    if (periode === 'semaine') return getWorkingDays(startDate, settings.joursOuvres, 6);
    const first = startOfMonth(startDate);
    const last = endOfMonth(startDate);
    const count = differenceInCalendarDays(last, first) + 1;
    return getWorkingDays(first, settings.joursOuvres, count).filter(d => d <= last);
  }, [startDate, settings.joursOuvres, periode]);

  const timeSlots = useMemo(() => getTimeSlots(settings.heureMin, settings.heureMax, 30), [settings]);
  const minMinutes = timeToMinutes(settings.heureMin);
  const maxMinutes = timeToMinutes(settings.heureMax);
  const totalMinutes = maxMinutes - minMinutes;
  const PX_PER_MINUTE = SLOT_WIDTH / 30;

  const visibleResources = useMemo(
    () => allResources.filter(r => visibleIds?.has(r.id)),
    [allResources, visibleIds]
  );

  const filteredResourceOptions = useMemo(() => {
    const q = resourceSearch.trim().toLowerCase();
    return q ? allResources.filter(r => r.name.toLowerCase().includes(q)) : allResources;
  }, [allResources, resourceSearch]);

  function toggleResource(id: string) {
    setVisibleIds(prev => {
      const next = new Set(prev || []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function shift(dir: 1 | -1) {
    if (periode === 'jour') setStartDate(d => addDays(d, dir));
    else if (periode === 'semaine') setStartDate(d => addDays(d, dir * 6));
    else setStartDate(d => addMonths(d, dir));
  }

  function openNewRdv(date?: Date, time?: string, intervenantId?: string) {
    setEditRdv(null);
    setNewRdvDefaults({
      date,
      time,
      intervenantId: intervenantId === UNASSIGNED ? undefined : intervenantId,
    });
    setModalOpen(true);
  }

  function openEditRdv(rdv: RendezVous) {
    if (dragState.current || pending) return;
    setEditRdv(rdv);
    setModalOpen(true);
  }

  // ---- Rendez-vous par ressource et par jour ----
  function rdvsFor(resourceId: string, day: Date) {
    const dayStart = new Date(day);
    dayStart.setHours(Math.floor(minMinutes / 60), minMinutes % 60, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(Math.floor(maxMinutes / 60), maxMinutes % 60, 0, 0);

    return rdvs.filter(r => {
      if (r.statut === 'annule') return false;
      const ints = appointmentIntervenants[r.id] || [];
      const match = resourceId === UNASSIGNED ? ints.length === 0 : ints.includes(resourceId);
      if (!match) return false;
      return new Date(r.debut) < dayEnd && new Date(r.fin) > dayStart;
    });
  }

  function conflictIdsOf(list: RendezVous[]) {
    const ids = new Set<string>();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (new Date(a.debut) < new Date(b.fin) && new Date(b.debut) < new Date(a.fin)) {
          ids.add(a.id);
          ids.add(b.id);
        }
      }
    }
    return ids;
  }

  function styleForDay(rdv: RendezVous, day: Date) {
    const rdvStart = new Date(rdv.debut);
    const rdvEnd = new Date(rdv.fin);
    const dayStart = new Date(day);
    dayStart.setHours(Math.floor(minMinutes / 60), minMinutes % 60, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(Math.floor(maxMinutes / 60), maxMinutes % 60, 0, 0);
    const visibleStart = rdvStart < dayStart ? dayStart : rdvStart;
    const visibleEnd = rdvEnd > dayEnd ? dayEnd : rdvEnd;
    const startMin = visibleStart.getHours() * 60 + visibleStart.getMinutes() - minMinutes;
    const duration = (visibleEnd.getTime() - visibleStart.getTime()) / 60000;
    return {
      left: startMin * PX_PER_MINUTE,
      width: Math.max(0, duration * PX_PER_MINUTE - 2),
    };
  }

  // ---- Déplacement / redimensionnement ----
  const dragState = useRef<{
    rdv: RendezVous;
    mode: 'move' | 'left' | 'right';
    startX: number;
    origLeft: number;
    origWidth: number;
    day: Date;
    resourceId: string;
    moved: boolean;
  } | null>(null);

  const [dragId, setDragId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ left: number; width: number } | null>(null);
  const [pending, setPending] = useState<{
    rdv: RendezVous;
    debut: Date;
    fin: Date;
    resourceId: string;
    conflicts: RendezVous[];
  } | null>(null);

  const canEdit = useCallback((rdv: RendezVous) => {
    const responsibles = appointmentResponsibles[rdv.id] || [];
    return responsibles.length === 0 || responsibles.includes(user?.id || '');
  }, [appointmentResponsibles, user?.id]);

  const startDrag = useCallback((
    rdv: RendezVous,
    mode: 'move' | 'left' | 'right',
    e: React.MouseEvent,
    day: Date,
    resourceId: string,
  ) => {
    if (!canEdit(rdv)) {
      toast.error('Seuls les responsables peuvent modifier ce rendez-vous.');
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const { left, width } = styleForDay(rdv, day);
    dragState.current = {
      rdv, mode, startX: e.clientX, origLeft: left, origWidth: width, day, resourceId, moved: false,
    };
    setDragId(rdv.id);
    setPreview({ left, width });
  }, [canEdit, minMinutes, maxMinutes]);

  useEffect(() => {
    if (!dragId) return;

    function snap(m: number) {
      return Math.round(m / SNAP_MINUTES) * SNAP_MINUTES;
    }

    function onMove(e: MouseEvent) {
      const st = dragState.current;
      if (!st) return;
      const dx = e.clientX - st.startX;
      if (Math.abs(dx) > 3) st.moved = true;

      let left = st.origLeft;
      let width = st.origWidth;
      const minWidth = SNAP_MINUTES * PX_PER_MINUTE - 2;

      if (st.mode === 'move') {
        left = st.origLeft + dx;
      } else if (st.mode === 'right') {
        width = Math.max(minWidth, st.origWidth + dx);
      } else {
        left = st.origLeft + dx;
        width = st.origWidth - dx;
        if (width < minWidth) {
          left = st.origLeft + st.origWidth - minWidth;
          width = minWidth;
        }
      }

      const startMin = snap(left / PX_PER_MINUTE);
      const endMin = snap((left + width + 2) / PX_PER_MINUTE);
      const duration = Math.max(SNAP_MINUTES, endMin - startMin);

      let clampedStart = Math.max(0, startMin);
      if (clampedStart + duration > totalMinutes) clampedStart = Math.max(0, totalMinutes - duration);
      const clampedEnd = Math.min(totalMinutes, clampedStart + duration);

      setPreview({
        left: clampedStart * PX_PER_MINUTE,
        width: (clampedEnd - clampedStart) * PX_PER_MINUTE - 2,
      });
    }

    function onUp() {
      const st = dragState.current;
      const prev = previewRef.current;
      dragState.current = null;
      setDragId(null);
      setPreview(null);
      if (!st || !prev) return;

      if (!st.moved) {
        // Simple clic : ouvrir la modification
        setEditRdv(st.rdv);
        setModalOpen(true);
        return;
      }

      const startMin = Math.round(prev.left / PX_PER_MINUTE) + minMinutes;
      const endMin = Math.round((prev.left + prev.width + 2) / PX_PER_MINUTE) + minMinutes;
      const debut = new Date(st.day);
      debut.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
      const fin = new Date(st.day);
      fin.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

      if (debut.getTime() === new Date(st.rdv.debut).getTime() && fin.getTime() === new Date(st.rdv.fin).getTime()) {
        return;
      }

      // Conflits sur la même ressource
      const conflicts = rdvs.filter(r => {
        if (r.id === st.rdv.id || r.statut === 'annule') return false;
        const ints = appointmentIntervenants[r.id] || [];
        if (st.resourceId === UNASSIGNED ? ints.length !== 0 : !ints.includes(st.resourceId)) return false;
        return debut < new Date(r.fin) && fin > new Date(r.debut);
      });

      setPending({ rdv: st.rdv, debut, fin, resourceId: st.resourceId, conflicts });
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragId, minMinutes, totalMinutes, PX_PER_MINUTE, rdvs, appointmentIntervenants]);

  const previewRef = useRef(preview);
  useEffect(() => { previewRef.current = preview; }, [preview]);

  async function confirmPending() {
    if (!pending) return;
    await updateRdv({
      ...pending.rdv,
      debut: pending.debut.toISOString(),
      fin: pending.fin.toISOString(),
    });
    toast.success('Rendez-vous mis à jour.');
    setPending(null);
  }

  const isToday = (d: Date) => isSameDay(d, new Date());

  const periodLabel = useMemo(() => {
    if (displayDays.length === 0) return '';
    if (periode === 'mois') return format(startDate, 'MMMM yyyy', { locale: fr });
    if (displayDays.length === 1) return formatDayHeader(displayDays[0]);
    return `${formatDayHeader(displayDays[0])} — ${formatDayHeader(displayDays[displayDays.length - 1])}`;
  }, [displayDays, periode, startDate]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center justify-between py-4 border-b bg-card flex-wrap gap-3 ${collapsed ? 'pl-20 pr-6' : 'px-6'}`}>
        <div>
          <h1 className="text-xl font-display font-bold">Intervenants</h1>
          <p className="text-sm text-muted-foreground">Planning des interventions par intervenant.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(-1)} aria-label="Période précédente">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setStartDate(new Date())} className="text-xs font-medium text-muted-foreground">
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => shift(1)} aria-label="Période suivante">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Select value={periode} onValueChange={v => setPeriode(v as Periode)}>
            <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="jour">Jour</SelectItem>
              <SelectItem value="semaine">Semaine</SelectItem>
              <SelectItem value="mois">Mois</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm font-semibold font-display capitalize">{periodLabel}</span>
          <Button onClick={() => openNewRdv()} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvel événement</span>
          </Button>
        </div>
      </div>

      {/* Ressources affichées */}
      <div className="flex items-center gap-3 px-6 py-2 border-b bg-card">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Users className="h-4 w-4" />
              Ressources affichées
              <span className="text-xs text-muted-foreground">
                ({visibleResources.length}/{allResources.length})
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-3 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un intervenant…"
                className="pl-8 h-9"
                value={resourceSearch}
                onChange={e => setResourceSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setVisibleIds(new Set(allResources.map(r => r.id)))}
              >
                Tout afficher
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setVisibleIds(new Set())}>
                Tout masquer
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {filteredResourceOptions.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">Aucun intervenant trouvé.</p>
              )}
              {filteredResourceOptions.map(r => (
                <div key={r.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`res-${r.id}`}
                    checked={!!visibleIds?.has(r.id)}
                    onCheckedChange={() => toggleResource(r.id)}
                  />
                  <Label htmlFor={`res-${r.id}`} className="text-sm cursor-pointer truncate">
                    {r.name}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Masquer un intervenant ne supprime aucun événement.
        </p>
      </div>

      {/* Grille : lignes = intervenants, colonnes = horaires */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-fit">
          {/* Bandeau horaires */}
          <div className="sticky top-0 z-20 flex border-b bg-card">
            <div className="w-56 shrink-0 border-r bg-card" />
            {timeSlots.map(slot => {
              const isFullHour = slot.endsWith(':00');
              return (
                <div
                  key={slot}
                  className={`text-center text-[10px] py-2 border-r ${isFullHour ? 'font-semibold text-foreground/70' : 'font-medium text-muted-foreground/50'}`}
                  style={{ width: SLOT_WIDTH, minWidth: SLOT_WIDTH }}
                >
                  {slot}
                </div>
              );
            })}
          </div>

          {visibleResources.length === 0 && (
            <p className="px-6 py-8 text-sm text-muted-foreground">
              Aucune ressource affichée. Utilisez « Ressources affichées » pour en sélectionner.
            </p>
          )}

          {visibleResources.length > 0 && displayDays.map(day => (
            <div key={day.toISOString()}>
              {/* En-tête de jour */}
              <div className={`sticky left-0 flex items-center px-4 py-1.5 text-xs font-semibold uppercase tracking-wide border-b
                ${isToday(day) ? 'bg-primary/5 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
                {formatDayHeader(day)}
              </div>

              {visibleResources.map(res => {
                const dayRdvs = rdvsFor(res.id, day);
                const conflicts = conflictIdsOf(dayRdvs);
                const hue = avatarHue(res.id);

                return (
                  <div key={res.id} className="flex border-b hover:bg-muted/20 transition-colors">
                    {/* Libellé intervenant */}
                    <div className="w-56 shrink-0 flex items-center gap-2 px-3 py-2 border-r bg-card">
                      <span
                        className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: res.id === UNASSIGNED ? 'hsl(var(--muted-foreground))' : `hsl(${hue} 55% 45%)` }}
                      >
                        {res.id === UNASSIGNED ? '—' : initials(res.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-medium truncate">{res.name}</span>
                        {(res.metier || res.poste) && (
                          <span className="block text-[10px] text-muted-foreground truncate">
                            {[res.metier, res.poste].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                      {conflicts.size > 0 && (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 ml-auto" />
                      )}
                    </div>

                    {/* Cellules horaires */}
                    <div
                      className="relative flex-1 cursor-pointer"
                      style={{ minWidth: timeSlots.length * SLOT_WIDTH, height: 48 }}
                      onClick={e => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const slotIndex = Math.floor(x / SLOT_WIDTH);
                        openNewRdv(day, timeSlots[slotIndex] || settings.heureMin, res.id);
                      }}
                    >
                      {timeSlots.map((slot, i) => {
                        const isFullHour = slot.endsWith(':00');
                        return (
                          <div
                            key={slot}
                            className={`absolute top-0 bottom-0 border-r ${isFullHour ? 'border-foreground/20' : 'border-border/50'}`}
                            style={{ left: i * SLOT_WIDTH }}
                          />
                        );
                      })}

                      {dayRdvs.map(r => {
                        const pos = dragId === r.id && preview ? preview : styleForDay(r, day);
                        return (
                          <div
                            key={r.id}
                            className="absolute"
                            style={{ left: pos.left, width: pos.width, top: 2, bottom: 2, cursor: dragId === r.id ? 'grabbing' : 'grab' }}
                            onMouseDown={e => startDrag(r, 'move', e, day, res.id)}
                            onClick={e => e.stopPropagation()}
                          >
                            <RdvBlock
                              rdv={r}
                              onClick={openEditRdv}
                              onResizeStart={(rdv, edge, e) => startDrag(rdv, edge, e, day, res.id)}
                              hasConflict={conflicts.has(r.id)}
                              isResizing={dragId === r.id}
                              style={{ position: 'absolute', inset: 0 }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Récapitulatif avant enregistrement */}
      <AlertDialog open={!!pending} onOpenChange={open => { if (!open) setPending(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la modification</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1.5 text-sm">
                <div>
                  <span className="text-muted-foreground">Intervenant : </span>
                  {allResources.find(r => r.id === pending?.resourceId)?.name || 'Sans intervenant'}
                </div>
                <div>
                  <span className="text-muted-foreground">Date : </span>
                  <span className="capitalize">
                    {pending ? format(pending.debut, 'EEEE d MMMM yyyy', { locale: fr }) : ''}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Horaire : </span>
                  {pending ? `${format(pending.debut, 'HH:mm')} – ${format(pending.fin, 'HH:mm')}` : ''}
                </div>
                <div>
                  <span className="text-muted-foreground">Durée : </span>
                  {pending ? `${Math.round((pending.fin.getTime() - pending.debut.getTime()) / 60000)} min` : ''}
                </div>
                {pending && pending.conflicts.length > 0 && (
                  <div className="rounded-md bg-destructive/10 p-2 text-destructive">
                    <div className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      {pending.conflicts.length === 1 ? '1 conflit détecté' : `${pending.conflicts.length} conflits détectés`}
                    </div>
                    <ul className="mt-1 list-disc pl-5">
                      {pending.conflicts.map(c => (
                        <li key={c.id}>
                          {format(new Date(c.debut), 'HH:mm')} – {format(new Date(c.fin), 'HH:mm')}
                          {c.clientNom ? ` · ${c.clientNom}` : ''}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-xs">Vous pouvez confirmer malgré le conflit ou ajuster l'événement.</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPending}>Enregistrer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RdvModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        rdv={editRdv}
        readOnly={!!editRdv && !canEdit(editRdv)}
        defaultDate={newRdvDefaults.date}
        defaultTime={newRdvDefaults.time}
        defaultIntervenantId={newRdvDefaults.intervenantId}
      />
    </div>
  );
}
