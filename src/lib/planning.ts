import { startOfWeek, addDays, format, parse, setHours, setMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

export function getWeekDays(date: Date, joursOuvres: number[]): Date[] {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return joursOuvres.map(j => addDays(monday, j - 1));
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
