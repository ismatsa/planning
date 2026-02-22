import { startOfWeek, addDays, format, isSameDay, startOfDay, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Returns working days for the week.
 * - If viewing the current week: starts from today, only shows today + future working days
 * - If viewing a past or future week: shows all working days in normal order
 */
export function getWeekDays(date: Date, joursOuvres: number[], isCurrentWeek: boolean): Date[] {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  const allDays = joursOuvres.map(j => addDays(monday, j === 0 ? 6 : j - 1));

  if (!isCurrentWeek) {
    return allDays;
  }

  // Current week: filter out past days (keep today + future)
  const today = startOfDay(new Date());
  return allDays.filter(d => !isBefore(d, today));
}

export function formatDayHeader(date: Date): string {
  return format(date, 'EEE d MMM', { locale: fr });
}

export function getTimeSlots(heureMin: string, heureMax: string, step: number = 30): string[] {
  const slots: string[] = [];
  const [minH, minM] = heureMin.split(':').map(Number);
  const [maxH, maxM] = heureMax.split(':').map(Number);
  let current = minH * 60 + minM;
  const end = maxH * 60 + maxM;
  while (current < end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    current += step;
  }
  return slots;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function dateWithTime(date: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
