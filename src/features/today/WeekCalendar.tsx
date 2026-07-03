import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { todayISO, weekDaysISO, addDaysISO, WEEKDAY_LABELS } from '@/lib/time';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

export function WeekCalendar({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (iso: string) => void;
}) {
  const today = todayISO();
  const days = weekDaysISO(selected);

  // Count of non-archived tasks scheduled on each day of the visible week.
  const all = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const counts: Record<string, number> = {};
  for (const t of all) {
    if (t.archived || !t.scheduledFor) continue;
    counts[t.scheduledFor] = (counts[t.scheduledFor] || 0) + 1;
  }

  const monthLabel = new Date(selected + 'T00:00:00').toLocaleDateString('es-UY', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="rounded-2xl bg-ios-card dark:bg-ios-cardDark border border-ios-sep/30 dark:border-ios-sepDark p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-xs font-semibold text-ios-muted uppercase">
          <CalendarDays size={14} /> Semana
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect(addDaysISO(selected, -7))}
            aria-label="Semana anterior"
            className="p-1 rounded-lg active:bg-ios-sep/30 dark:active:bg-ios-sepDark"
          >
            <ChevronLeft size={16} className="text-ios-muted" />
          </button>
          <span className="text-xs font-semibold capitalize min-w-[7.5rem] text-center">{monthLabel}</span>
          <button
            onClick={() => onSelect(addDaysISO(selected, 7))}
            aria-label="Semana siguiente"
            className="p-1 rounded-lg active:bg-ios-sep/30 dark:active:bg-ios-sepDark"
          >
            <ChevronRight size={16} className="text-ios-muted" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((iso, i) => {
          const dayNum = Number(iso.slice(8, 10));
          const isToday = iso === today;
          const isSel = iso === selected;
          const n = counts[iso] || 0;
          return (
            <button
              key={iso}
              onClick={() => onSelect(iso)}
              className={[
                'flex flex-col items-center gap-0.5 py-1.5 rounded-xl border transition-colors',
                isSel
                  ? 'bg-ios-accent text-white border-ios-accent'
                  : 'border-transparent active:bg-ios-sep/30 dark:active:bg-ios-sepDark',
              ].join(' ')}
            >
              <span className={`text-[9px] uppercase ${isSel ? 'text-white/80' : 'text-ios-muted'}`}>
                {WEEKDAY_LABELS[i]}
              </span>
              <span
                className={[
                  'text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full',
                  !isSel && isToday ? 'border border-ios-accent text-ios-accent' : '',
                ].join(' ')}
              >
                {dayNum}
              </span>
              <span
                className={[
                  'w-1.5 h-1.5 rounded-full',
                  n > 0 ? (isSel ? 'bg-white' : 'bg-ios-accent') : 'bg-transparent',
                ].join(' ')}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
