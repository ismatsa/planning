import { useMemo, useState } from 'react';
import { useStore } from '@/store/StoreContext';
import { METIERS, MetierType } from '@/types';
import { getWeekDays, formatDayHeader, getTimeSlots, timeToMinutes } from '@/lib/planning';
import { format, isSameDay, isSameWeek } from 'date-fns';
import RdvBlock from './RdvBlock';
import RdvModal from './RdvModal';
import WeekNavigation from './WeekNavigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { RendezVous } from '@/types';

const SLOT_WIDTH = 80; // px per time slot

export default function WeeklyPlanning() {
  const { rdvs, postes, settings } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editRdv, setEditRdv] = useState<RendezVous | null>(null);
  const [newRdvDefaults, setNewRdvDefaults] = useState<{ date?: Date; posteId?: string; time?: string }>({});
  const [visibleMetiers, setVisibleMetiers] = useState<Set<MetierType>>(new Set(METIERS.map(m => m.id)));

  const isCurrentWeek = useMemo(() => isSameWeek(currentDate, new Date(), { weekStartsOn: 1 }), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(currentDate, settings.joursOuvres, isCurrentWeek), [currentDate, settings.joursOuvres, isCurrentWeek]);
  const timeSlots = useMemo(() => getTimeSlots(settings.heureMin, settings.heureMax, 30), [settings]);
  const activePostes = useMemo(() => postes.filter(p => p.actif && visibleMetiers.has(p.metierId as MetierType)), [postes, visibleMetiers]);

  const minMinutes = timeToMinutes(settings.heureMin);
  const totalMinutes = timeToMinutes(settings.heureMax) - minMinutes;

  function toggleMetier(id: MetierType) {
    setVisibleMetiers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (visibleMetiers.size === METIERS.length) {
      setVisibleMetiers(new Set());
    } else {
      setVisibleMetiers(new Set(METIERS.map(m => m.id)));
    }
  }

  function openNewRdv(date?: Date, posteId?: string, time?: string) {
    setEditRdv(null);
    setNewRdvDefaults({ date, posteId, time });
    setModalOpen(true);
  }

  function openEditRdv(rdv: RendezVous) {
    setEditRdv(rdv);
    setModalOpen(true);
  }

  function getRdvStyle(rdv: RendezVous) {
    const start = new Date(rdv.debut);
    const end = new Date(rdv.fin);
    const startMin = start.getHours() * 60 + start.getMinutes() - minMinutes;
    const duration = (end.getTime() - start.getTime()) / 60000;
    const left = (startMin / 30) * SLOT_WIDTH;
    const width = (duration / 30) * SLOT_WIDTH - 2;
    return { left: `${left}px`, width: `${width}px` };
  }

  const isToday = (d: Date) => isSameDay(d, new Date());

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-display font-bold">Planning</h1>
          <p className="text-sm text-muted-foreground">Votre planning est à jour.</p>
        </div>
        <div className="flex items-center gap-4">
          <WeekNavigation currentDate={currentDate} onDateChange={setCurrentDate} />
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
            checked={visibleMetiers.size === METIERS.length}
            onCheckedChange={toggleAll}
          />
          <Label htmlFor="filter-all" className="text-sm font-medium cursor-pointer">Tout</Label>
        </div>
        {METIERS.map(m => (
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
            {timeSlots.map(slot => (
              <div
                key={slot}
                className="text-center text-[10px] font-medium text-muted-foreground py-2 border-r"
                style={{ width: SLOT_WIDTH, minWidth: SLOT_WIDTH }}
              >
                {slot}
              </div>
            ))}
          </div>

          {/* Day groups */}
          {weekDays.map(day => {
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
                  const metier = METIERS.find(m => m.id === poste.metierId);
                  const dayRdvs = rdvs.filter(r =>
                    r.posteId === poste.id && isSameDay(new Date(r.debut), day) && r.statut !== 'annule'
                  );

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
                        {/* Vertical slot lines */}
                        {timeSlots.map((slot, i) => (
                          <div
                            key={slot}
                            className="absolute top-0 bottom-0 border-r border-border"
                            style={{ left: i * SLOT_WIDTH }}
                          />
                        ))}

                        {/* RDV blocks */}
                        {dayRdvs.map(r => (
                          <RdvBlock
                            key={r.id}
                            rdv={r}
                            onClick={openEditRdv}
                            hasConflict={conflictIds.has(r.id)}
                            style={{ ...getRdvStyle(r), top: '2px', bottom: '2px', position: 'absolute' }}
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
        defaultDate={newRdvDefaults.date}
        defaultPosteId={newRdvDefaults.posteId}
        defaultTime={newRdvDefaults.time}
      />
    </div>
  );
}
