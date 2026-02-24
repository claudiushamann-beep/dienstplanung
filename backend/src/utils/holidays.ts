/**
 * Deutsche Feiertage – Gauss/Meeus Oster-Algorithmus
 * Unterstützte Bundesländer: BW, BY, BE, BB, HB, HH, HE, MV, NI, NW, RP, SL, SN, ST, SH, TH
 */

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

function fmt(date: Date): string {
  return date.toISOString().split('T')[0];
}

export interface Holiday {
  date: string;
  name: string;
}

export function getGermanHolidays(year: number, state: string = 'SH'): Holiday[] {
  const easter = easterSunday(year);
  const holidays: Holiday[] = [];

  const add = (date: Date, name: string) => {
    holidays.push({ date: fmt(date), name });
  };

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

  // Heilige Drei Könige
  if (['BW', 'BY', 'ST'].includes(s)) {
    add(new Date(year, 0, 6), 'Heilige Drei Könige');
  }

  // Frauentag (BE, MV)
  if (['BE', 'MV'].includes(s)) {
    add(new Date(year, 2, 8), 'Internationaler Frauentag');
  }

  // Gründonnerstag (BY – nur in manchen Gemeinden, übersprungen)

  // Fronleichnam
  if (['BW', 'BY', 'HE', 'NW', 'RP', 'SL'].includes(s)) {
    add(addDays(easter, 60), 'Fronleichnam');
  }

  // Mariä Himmelfahrt
  if (['BY', 'SL'].includes(s)) {
    add(new Date(year, 7, 15), 'Mariä Himmelfahrt');
  }

  // Weltkindertag (TH)
  if (s === 'TH') {
    add(new Date(year, 8, 20), 'Weltkindertag');
  }

  // Reformationstag
  if (['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'].includes(s)) {
    add(new Date(year, 9, 31), 'Reformationstag');
  }

  // Allerheiligen
  if (['BW', 'BY', 'NW', 'RP', 'SL'].includes(s)) {
    add(new Date(year, 10, 1), 'Allerheiligen');
  }

  // Buß- und Bettag (SN)
  if (s === 'SN') {
    // Mittwoch vor dem 23. November
    const nov23 = new Date(year, 10, 23);
    const dayOfWeek = nov23.getDay();
    const daysToWed = (dayOfWeek >= 3) ? dayOfWeek - 3 : dayOfWeek + 4;
    add(addDays(nov23, -daysToWed), 'Buß- und Bettag');
  }

  return holidays;
}

export function isGermanHoliday(date: Date, state: string = 'SH'): boolean {
  const year = date.getFullYear();
  const dateStr = date.toISOString().split('T')[0];
  const holidays = getGermanHolidays(year, state);
  return holidays.some(h => h.date === dateStr);
}

export function getGermanHolidayName(date: Date, state: string = 'SH'): string | null {
  const year = date.getFullYear();
  const dateStr = date.toISOString().split('T')[0];
  const holidays = getGermanHolidays(year, state);
  const found = holidays.find(h => h.date === dateStr);
  return found ? found.name : null;
}
