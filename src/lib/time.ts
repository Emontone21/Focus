// Local-date → ISO yyyy-mm-dd (no timezone shift, unlike toISOString()).
export const toISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const todayISO = (): string => toISO(new Date());

// Shift an ISO date by `n` days (n can be negative). Returns a new ISO date.
export const addDaysISO = (iso: string, n: number): string => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toISO(d);
};

// The 7 ISO dates (Mon → Sun) of the week containing `iso`.
export const weekDaysISO = (iso: string): string[] => {
  const monday = startOfWeek(new Date(iso + 'T00:00:00'));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return toISO(d);
  });
};

export const formatHuman = (iso?: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const daysBetween = (a: string, b: string): number => {
  const da = new Date(a + 'T00:00:00').getTime();
  const db = new Date(b + 'T00:00:00').getTime();
  return Math.round((db - da) / 86400000);
};

export const minutesToHM = (mins: number): string => {
  const m = Math.max(0, Math.floor(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `${String(h).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

export const hmToMinutes = (hm: string): number => {
  const [h, m] = hm.split(':').map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
};

// Monday 00:00 of the week containing `d` (local time).
export const startOfWeek = (d: Date = new Date()): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // Mon=0 … Sun=6
  x.setDate(x.getDate() - dow);
  return x;
};

// Human duration from minutes: "2 h 15 min", "45 min", "0 min".
export const formatDuration = (mins: number): string => {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  if (r === 0) return `${h} h`;
  return `${h} h ${r} min`;
};

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
