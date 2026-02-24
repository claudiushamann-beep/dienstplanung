/**
 * Deutsche Feiertage – Frontend-Utility
 * Standard-Bundesland: SH (Schleswig-Holstein)
 */

const DEFAULT_STATE = 'SH';

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface Holiday {
  date: string;
  name: string;
}

function getHolidaysForYear(year: number, state: string = DEFAULT_STATE): Holiday[] {
  const easter = easterSunday(year);
  const holidays: Holiday[] = [];

  const add = (date: Date, name: string) => holidays.push({ date: toDateStr(date), name });

  // Bundesweite Feiertage
  add(new Date(year, 0, 1), 'Neujahr');
  add(addDays(easter, -2), 'Karfreitag');
  add(easter, 'Ostersonntag');
  add(addDays(easter, 1), 'Ostermontag');
  add(new Date(year, 4, 1), 'Tag der Arbeit');
  add(addDays(easter, 39), 'Christi Himmelfahrt');
  add(addDays(easter, 49), 'Pfingstsonntag');
  add(addDays(easter, 50), 'Pfingstmontag');
  add(new Date(year, 9, 3), 'Tag der Deutschen Einheit');
  add(new Date(year, 11, 25), '1. Weihnachtstag');
  add(new Date(year, 11, 26), '2. Weihnachtstag');

  const s = state.toUpperCase();

  if (['BW', 'BY', 'ST'].includes(s)) add(new Date(year, 0, 6), 'Heilige Drei Könige');
  if (['BE', 'MV'].includes(s)) add(new Date(year, 2, 8), 'Internationaler Frauentag');
  if (['BW', 'BY', 'HE', 'NW', 'RP', 'SL'].includes(s)) add(addDays(easter, 60), 'Fronleichnam');
  if (['BY', 'SL'].includes(s)) add(new Date(year, 7, 15), 'Mariä Himmelfahrt');
  if (s === 'TH') add(new Date(year, 8, 20), 'Weltkindertag');
  if (['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'].includes(s)) {
    add(new Date(year, 9, 31), 'Reformationstag');
  }
  if (['BW', 'BY', 'NW', 'RP', 'SL'].includes(s)) add(new Date(year, 10, 1), 'Allerheiligen');
  if (s === 'SN') {
    const nov23 = new Date(year, 10, 23);
    const dow = nov23.getDay();
    const daysToWed = dow >= 3 ? dow - 3 : dow + 4;
    add(addDays(nov23, -daysToWed), 'Buß- und Bettag');
  }

  return holidays;
}

// Cache per year to avoid recomputing on every render
const cache: Record<number, Holiday[]> = {};

function getCached(year: number): Holiday[] {
  if (!cache[year]) cache[year] = getHolidaysForYear(year, DEFAULT_STATE);
  return cache[year];
}

export function isHoliday(date: Date): boolean {
  const dateStr = toDateStr(date);
  return getCached(date.getFullYear()).some(h => h.date === dateStr);
}

export function getHolidayName(date: Date): string | null {
  const dateStr = toDateStr(date);
  const found = getCached(date.getFullYear()).find(h => h.date === dateStr);
  return found ? found.name : null;
}
