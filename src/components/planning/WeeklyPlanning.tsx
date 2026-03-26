import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '@/store/StoreContext';
import { useSidebarState } from '@/components/AppLayout';
import { MetierType } from '@/types';
import { getWorkingDays, formatDayHeader, getTimeSlots, timeToMinutes } from '@/lib/planning';
import { format, isSameDay, addDays, addMinutes } from 'date-fns';
import RdvBlock from './RdvBlock';
import RdvModal from './RdvModal';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { RendezVous } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/store/AuthContext';

const SLOT_WIDTH = 80; // px per time slot
const DAYS_SHOWN = 6;

export default function WeeklyPlanning() {
  const { rdvs, postes, settings, updateRdv, checkConflict, metiers, appointmentResponsibles } = useStore();
  const { user, isAdmin, permissions } = useAuth();
  const { collapsed } = useSidebarState();
  const [startDate, setStartDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editRdv, setEditRdv] = useState<RendezVous | null>(null);
  const [newRdvDefaults, setNewRdvDefaults] = useState<{ date?: Date; posteId?: string; time?: string }>({});
  const [visibleMetiers, setVisibleMetiers] = useState<Set<string>>(new Set(metiers.map(m => m.id)));

  // Resize state
  const [resizingRdvId, setResizingRdvId] = useState<string | null>(null);
  const [resizePreview, setResizePreview] = useState<{ left: number; width: number } | null>(null);
  const resizeRef = useRef<{
    rdv: RendezVous;
    edge: 'left' | 'right';
    startX: number;
    origLeftPx: number;
    origWidthPx: number;
    dayDate: Date;
  } | null>(null);

  const displayDays = useMemo(() => getWorkingDays(startDate, settings.joursOuvres, DAYS_SHOWN), [startDate, settings.joursOuvres]);
  const timeSlots = useMemo(() => getTimeSlots(settings.heureMin, settings.heureMax, 30), [settings]);
  const activePostes = useMemo(() => postes.filter(p => p.actif && visibleMetiers.has(p.metierId) && (isAdmin || permissions.includes(p.id))), [postes, visibleMetiers, isAdmin, permissions]);

  const minMinutes = timeToMinutes(settings.heureMin);
  const maxMinutes = timeToMinutes(settings.heureMax);
  const totalMinutes = maxMinutes - minMinutes;

  const SNAP_MINUTES = 15;
  const PX_PER_MINUTE = SLOT_WIDTH / 30;

  function snapToGrid(minutes: number): number {
    return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
  }

  function toggleMetier(id: string) {
    setVisibleMetiers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (visibleMetiers.size === metiers.length) {
      setVisibleMetiers(new Set());
    } else {
      setVisibleMetiers(new Set(metiers.map(m => m.id)));
    }
  }

  function openNewRdv(date?: Date, posteId?: string, time?: string) {
    setEditRdv(null);
    setNewRdvDefaults({ date, posteId, time });
    setModalOpen(true);
  }

  function openEditRdv(rdv: RendezVous) {
    if (resizingRdvId) return;
    setEditRdv(rdv);
    setModalOpen(true);
  }

  function getRdvStyleForDay(rdv: RendezVous, day: Date) {
    const rdvStart = new Date(rdv.debut);
    const rdvEnd = new Date(rdv.fin);

    // Clip to the day's business hours
    const dayStart = new Date(day);
    dayStart.setHours(Math.floor(minMinutes / 60), minMinutes % 60, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(Math.floor(maxMinutes / 60), maxMinutes % 60, 0, 0);

    const visibleStart = rdvStart < dayStart ? dayStart : rdvStart;
    const visibleEnd = rdvEnd > dayEnd ? dayEnd : rdvEnd;

    const startMin = visibleStart.getHours() * 60 + visibleStart.getMinutes() - minMinutes;
    const duration = (visibleEnd.getTime() - visibleStart.getTime()) / 60000;
    const leftPx = startMin * PX_PER_MINUTE;
    const widthPx = Math.max(0, duration * PX_PER_MINUTE - 2);
    return { left: `${leftPx}px`, width: `${widthPx}px` };
  }

  // --- Resize handlers ---
  const handleResizeStart = useCallback((rdv: RendezVous, edge: 'left' | 'right', e: React.MouseEvent) => {
    const responsibles = appointmentResponsibles[rdv.id] || [];
    if (!responsibles.includes(user?.id || '')) {
      toast.error("Seuls les responsables peuvent modifier ce rendez-vous.");
      return;
    }
    const start = new Date(rdv.debut);
    const end = new Date(rdv.fin);
    const startMin = start.getHours() * 60 + start.getMinutes() - minMinutes;
    const duration = (end.getTime() - start.getTime()) / 60000;
    const leftPx = startMin * PX_PER_MINUTE;
    const widthPx = duration * PX_PER_MINUTE - 2;

    const dayDate = new Date(start);
    dayDate.setHours(0, 0, 0, 0);

    resizeRef.current = { rdv, edge, startX: e.clientX, origLeftPx: leftPx, origWidthPx: widthPx, dayDate };
    setResizingRdvId(rdv.id);
    setResizePreview({ left: leftPx, width: widthPx });
  }, [minMinutes, PX_PER_MINUTE, user?.id, appointmentResponsibles]);

  useEffect(() => {
    if (!resizingRdvId) return;

    function onMouseMove(e: MouseEvent) {
      const ref = resizeRef.current;
      if (!ref) return;

      const dx = e.clientX - ref.startX;

      let newLeft = ref.origLeftPx;
      let newWidth = ref.origWidthPx;

      if (ref.edge === 'right') {
        newWidth = Math.max(SNAP_MINUTES * PX_PER_MINUTE - 2, ref.origWidthPx + dx);
      } else {
        newLeft = ref.origLeftPx + dx;
        newWidth = ref.origWidthPx - dx;
        if (newWidth < SNAP_MINUTES * PX_PER_MINUTE - 2) {
          newLeft = ref.origLeftPx + ref.origWidthPx - (SNAP_MINUTES * PX_PER_MINUTE - 2);
          newWidth = SNAP_MINUTES * PX_PER_MINUTE - 2;
        }
      }

      // Snap to grid
      const newStartMin = snapToGrid(newLeft / PX_PER_MINUTE);
      const newEndMin = snapToGrid((newLeft + newWidth + 2) / PX_PER_MINUTE);

      // Clamp to business hours
      const clampedStart = Math.max(0, Math.min(newStartMin, totalMinutes - SNAP_MINUTES));
      const clampedEnd = Math.max(clampedStart + SNAP_MINUTES, Math.min(newEndMin, totalMinutes));

      setResizePreview({
        left: clampedStart * PX_PER_MINUTE,
        width: (clampedEnd - clampedStart) * PX_PER_MINUTE - 2,
      });
    }

    async function onMouseUp() {
      const ref = resizeRef.current;
      if (!ref) { setResizingRdvId(null); setResizePreview(null); return; }

      const preview = resizePreview;
      if (!preview) { setResizingRdvId(null); return; }

      const newStartMin = Math.round(preview.left / PX_PER_MINUTE) + minMinutes;
      const newEndMin = Math.round((preview.left + preview.width + 2) / PX_PER_MINUTE) + minMinutes;

      const newDebut = new Date(ref.dayDate);
      newDebut.setHours(Math.floor(newStartMin / 60), newStartMin % 60, 0, 0);
      const newFin = new Date(ref.dayDate);
      newFin.setHours(Math.floor(newEndMin / 60), newEndMin % 60, 0, 0);

      // Check conflicts
      const conflict = checkConflict(ref.rdv.posteId, newDebut.toISOString(), newFin.toISOString(), ref.rdv.id);
      if (conflict) {
        toast.error('Impossible : chevauchement avec un autre rendez-vous.');
        setResizingRdvId(null);
        setResizePreview(null);
        resizeRef.current = null;
        return;
      }

      await updateRdv({
        ...ref.rdv,
        debut: newDebut.toISOString(),
        fin: newFin.toISOString(),
      });

      setResizingRdvId(null);
      setResizePreview(null);
      resizeRef.current = null;
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizingRdvId, resizePreview, minMinutes, totalMinutes, PX_PER_MINUTE, checkConflict, updateRdv]);

  const isToday = (d: Date) => isSameDay(d, new Date());

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center justify-between py-4 border-b bg-card flex-wrap gap-3 ${collapsed ? 'pl-20 pr-6' : 'px-6'}`}>
        <div>
          <h1 className="text-xl font-display font-bold">Planning</h1>
          <p className="text-sm text-muted-foreground">Votre planning est à jour.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setStartDate(d => addDays(d, -DAYS_SHOWN))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setStartDate(new Date())} className="text-xs font-medium text-muted-foreground">
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setStartDate(d => addDays(d, DAYS_SHOWN))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {displayDays.length >= 2 && (
            <span className="text-sm font-semibold font-display capitalize">
              {formatDayHeader(displayDays[0])} — {formatDayHeader(displayDays[displayDays.length - 1])}
            </span>
          )}
          <Button onClick={() => openNewRdv()} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouveau RDV</span>
          </Button>
        </div>
      </div>

      {/* Métier filters */}
      <div className="flex items-center gap-4 px-6 py-2 border-b bg-card">
        <div className="flex items-center gap-2">
          <Checkbox
            id="filter-all"
            checked={visibleMetiers.size === metiers.length}
            onCheckedChange={toggleAll}
          />
          <Label htmlFor="filter-all" className="text-sm font-medium cursor-pointer">Tout</Label>
        </div>
        {metiers.map(m => (
          <div key={m.id} className="flex items-center gap-2">
            <Checkbox
              id={`filter-${m.id}`}
              checked={visibleMetiers.has(m.id)}
              onCheckedChange={() => toggleMetier(m.id)}
            />
            <Label htmlFor={`filter-${m.id}`} className="text-sm cursor-pointer flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: `hsl(var(--${m.couleur}))` }}
              />
              {m.nom}
            </Label>
          </div>
        ))}
      </div>

      {/* Grid: rows = day+poste, columns = time */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-fit">
          {/* Time header row */}
          <div className="sticky top-0 z-20 flex border-b bg-card">
            <div className="w-48 shrink-0 border-r bg-card" />
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

          {/* Day groups */}
          {displayDays.map(day => {
            const dayPostes = activePostes;
            if (dayPostes.length === 0) return null;

            return (
              <div key={day.toISOString()}>
                {/* Day header */}
                <div className={`sticky left-0 flex items-center px-4 py-1.5 text-xs font-semibold uppercase tracking-wide border-b
                  ${isToday(day) ? 'bg-primary/5 text-primary' : 'bg-muted/50 text-muted-foreground'}`}>
                  {formatDayHeader(day)}
                </div>

                {/* Poste rows */}
                {dayPostes.map(poste => {
                  const metier = metiers.find(m => m.id === poste.metierId);
                  const dayRdvs = rdvs.filter(r => {
                    if (r.posteId !== poste.id || r.statut === 'annule') return false;
                    const rdvStart = new Date(r.debut);
                    const rdvEnd = new Date(r.fin);
                    // Check if the RDV overlaps with this day's business hours
                    const dayStart = new Date(day);
                    dayStart.setHours(Math.floor(minMinutes / 60), minMinutes % 60, 0, 0);
                    const dayEnd = new Date(day);
                    dayEnd.setHours(Math.floor(maxMinutes / 60), maxMinutes % 60, 0, 0);
                    return rdvStart < dayEnd && rdvEnd > dayStart;
                  });

                  // Detect overlapping RDVs
                  const conflictIds = new Set<string>();
                  for (let i = 0; i < dayRdvs.length; i++) {
                    for (let j = i + 1; j < dayRdvs.length; j++) {
                      const a = dayRdvs[i], b = dayRdvs[j];
                      const aStart = new Date(a.debut).getTime();
                      const aEnd = new Date(a.fin).getTime();
                      const bStart = new Date(b.debut).getTime();
                      const bEnd = new Date(b.fin).getTime();
                      if (aStart < bEnd && bStart < aEnd) {
                        conflictIds.add(a.id);
                        conflictIds.add(b.id);
                      }
                    }
                  }

                  return (
                    <div key={poste.id} className="flex border-b hover:bg-muted/20 transition-colors">
                      {/* Poste label */}
                      <div className="w-48 shrink-0 flex items-center gap-2 px-4 py-2 border-r bg-card">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: `hsl(var(--${metier?.couleur || 'muted-foreground'}))` }}
                        />
                        <span className="text-xs font-medium truncate">{poste.nom}</span>
                      </div>

                      {/* Time cells */}
                      <div
                        className="relative flex-1 cursor-pointer"
                        style={{ minWidth: timeSlots.length * SLOT_WIDTH, height: 48 }}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const slotIndex = Math.floor(x / SLOT_WIDTH);
                          const time = timeSlots[slotIndex] || settings.heureMin;
                          openNewRdv(day, poste.id, time);
                        }}
                      >
                        {/* Vertical slot lines — full hours bolder */}
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

                        {/* RDV blocks */}
                        {dayRdvs.map(r => (
                          <RdvBlock
                            key={r.id}
                            rdv={r}
                            onClick={openEditRdv}
                            onResizeStart={handleResizeStart}
                            hasConflict={conflictIds.has(r.id)}
                            isResizing={resizingRdvId === r.id}
                            style={
                              resizingRdvId === r.id && resizePreview
                                ? { left: `${resizePreview.left}px`, width: `${resizePreview.width}px`, top: '2px', bottom: '2px', position: 'absolute' as const }
                                : { ...getRdvStyleForDay(r, day), top: '2px', bottom: '2px', position: 'absolute' as const }
                            }
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <RdvModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        rdv={editRdv}
        readOnly={!!editRdv && (appointmentResponsibles[editRdv.id] || []).length > 0 && !(appointmentResponsibles[editRdv.id] || []).includes(user?.id || '')}
        defaultDate={newRdvDefaults.date}
        defaultPosteId={newRdvDefaults.posteId}
        defaultTime={newRdvDefaults.time}
      />
    </div>
  );
}
