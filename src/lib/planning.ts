import { startOfWeek, addDays, format, getDay, isAfter, isSameDay, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Returns working days for the week, reordered so that:
 * - Today is first (if it's a working day)
 * - Then subsequent working days follow in chronological order
 * - Past working days of the week come after
 */
export function getWeekDays(date: Date, joursOuvres: number[]): Date[] {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  const allDays = joursOuvres.map(j => addDays(monday, j === 0 ? 6 : j - 1));
  
  const today = startOfDay(new Date());
  const todayInWeek = allDays.findIndex(d => isSameDay(d, today));
  
  if (todayInWeek >= 0) {
    // Rotate so today is first
    return [...allDays.slice(todayInWeek), ...allDays.slice(0, todayInWeek)];
  }
  
  // If today is not in this week, find the next working day after today
  const nextIdx = allDays.findIndex(d => isAfter(d, today));
  if (nextIdx >= 0) {
    return [...allDays.slice(nextIdx), ...allDays.slice(0, nextIdx)];
  }
  
  return allDays;
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
