import { addDays, format, getDay, startOfDay, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Returns the next N working days starting from a reference date.
 * - Finds the current or next working day from `startFrom`
 * - Then returns `count` consecutive working days (including that first one)
 */
export function getWorkingDays(startFrom: Date, joursOuvres: number[], count: number): Date[] {
  const days: Date[] = [];
  let current = startOfDay(startFrom);

  // Find the first working day >= startFrom
  for (let i = 0; i < 14; i++) {
    const dow = getDay(current); // 0=Sun, 1=Mon...6=Sat
    if (joursOuvres.includes(dow)) {
      break;
    }
    current = addDays(current, 1);
  }

  // Collect `count` working days
  for (let i = 0; days.length < count && i < 60; i++) {
    const dow = getDay(current);
    if (joursOuvres.includes(dow)) {
      days.push(new Date(current));
    }
    current = addDays(current, 1);
  }

  return days;
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
