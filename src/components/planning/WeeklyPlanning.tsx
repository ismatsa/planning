import { useMemo, useState } from 'react';
import { useStore } from '@/store/StoreContext';
import { METIERS } from '@/types';
import { getWeekDays, formatDayHeader, getTimeSlots, timeToMinutes } from '@/lib/planning';
import { format, isSameDay } from 'date-fns';
import RdvBlock from './RdvBlock';
import RdvModal from './RdvModal';
import WeekNavigation from './WeekNavigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RendezVous } from '@/types';

const HOUR_HEIGHT = 60; // px per 30 min slot
const SLOT_STEP = 30;

export default function WeeklyPlanning() {
  const { rdvs, postes, settings } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editRdv, setEditRdv] = useState<RendezVous | null>(null);
  const [newRdvDefaults, setNewRdvDefaults] = useState<{ date?: Date; posteId?: string; time?: string }>({});

  const weekDays = useMemo(() => getWeekDays(currentDate, settings.joursOuvres), [currentDate, settings.joursOuvres]);
  const timeSlots = useMemo(() => getTimeSlots(settings.heureMin, settings.heureMax, SLOT_STEP), [settings]);
  const activePostes = useMemo(() => postes.filter(p => p.actif), [postes]);

  const minMinutes = timeToMinutes(settings.heureMin);
  const totalMinutes = timeToMinutes(settings.heureMax) - minMinutes;

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
    const top = (startMin / SLOT_STEP) * HOUR_HEIGHT;
    const height = (duration / SLOT_STEP) * HOUR_HEIGHT - 2;
    return { top: `${top}px`, height: `${height}px` };
  }

  const isToday = (d: Date) => isSameDay(d, new Date());

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
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

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[900px]">
          {/* Day headers */}
          <div className="sticky top-0 z-20 flex border-b bg-card">
            <div className="w-16 shrink-0" />
            {weekDays.map(day => (
              <div key={day.toISOString()} className="flex-1 min-w-0">
                <div className={`text-center py-2 text-xs font-semibold uppercase tracking-wide border-l
                  ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>
                  {formatDayHeader(day)}
                </div>
                {/* Poste sub-headers */}
                <div className="flex border-t">
                  {activePostes.map(poste => {
                    const metier = METIERS.find(m => m.id === poste.metierId);
                    return (
                      <div
                        key={poste.id}
                        className="flex-1 text-center py-1.5 text-[10px] font-medium border-l truncate px-1"
                        style={{ color: `hsl(var(--${metier?.couleur || 'muted-foreground'}))` }}
                      >
                        {poste.nom}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="flex">
            {/* Time labels */}
            <div className="w-16 shrink-0">
              {timeSlots.map(slot => (
                <div key={slot} className="flex items-start justify-end pr-2 text-[10px] text-muted-foreground" style={{ height: HOUR_HEIGHT }}>
                  {slot}
                </div>
              ))}
            </div>

            {/* Days */}
            {weekDays.map(day => (
              <div key={day.toISOString()} className="flex-1 flex min-w-0">
                {activePostes.map(poste => {
                  const dayRdvs = rdvs.filter(r =>
                    r.posteId === poste.id && isSameDay(new Date(r.debut), day) && r.statut !== 'annule'
                  );
                  return (
                    <div
                      key={poste.id}
                      className="flex-1 border-l relative cursor-pointer"
                      style={{ height: timeSlots.length * HOUR_HEIGHT }}
                      onClick={(e) => {
                        // Calculate clicked time
                        const rect = e.currentTarget.getBoundingClientRect();
                        const y = e.clientY - rect.top;
                        const slotIndex = Math.floor(y / HOUR_HEIGHT);
                        const time = timeSlots[slotIndex] || settings.heureMin;
                        openNewRdv(day, poste.id, time);
                      }}
                    >
                      {/* Hour lines */}
                      {timeSlots.map((slot, i) => (
                        <div
                          key={slot}
                          className="absolute left-0 right-0 border-t border-dashed border-border/50"
                          style={{ top: i * HOUR_HEIGHT }}
                        />
                      ))}
                      {/* RDV blocks */}
                      {dayRdvs.map(r => (
                        <RdvBlock
                          key={r.id}
                          rdv={r}
                          onClick={openEditRdv}
                          style={getRdvStyle(r)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
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
