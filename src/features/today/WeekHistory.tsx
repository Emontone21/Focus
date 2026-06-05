import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { startOfWeek, formatDuration, WEEKDAY_LABELS } from '@/lib/time';
import { CheckCircle2, Clock, History, Repeat } from 'lucide-react';

export function WeekHistory() {
  // Recompute the week anchor once per mount; fine for a day-scoped screen.
  const weekStart = useMemo(() => startOfWeek().getTime(), []);

  const sessions = useLiveQuery(
    () => db.sessions.where('completedAt').aboveOrEqual(weekStart).toArray(),
    [weekStart],
  ) || [];
  const completions = useLiveQuery(
    () => db.completions.where('completedAt').aboveOrEqual(weekStart).toArray(),
    [weekStart],
  ) || [];

  const totalMin = sessions.reduce((s, x) => s + x.minutes, 0);

  // Minutes per weekday (Mon=0 … Sun=6).
  const perDay = useMemo(() => {
    const arr = new Array(7).fill(0) as number[];
    for (const s of sessions) {
      const dow = (new Date(s.completedAt).getDay() + 6) % 7;
      arr[dow] += s.minutes;
    }
    return arr;
  }, [sessions]);
  const maxDay = Math.max(1, ...perDay);

  // Minutes per task title, descending.
  const perTask = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const key = s.taskTitle?.trim() || 'Sin tarea';
      map.set(key, (map.get(key) || 0) + s.minutes);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [sessions]);

  const doneList = useMemo(
    () => [...completions].sort((a, b) => b.completedAt - a.completedAt),
    [completions],
  );

  const fmtDay = (ms: number) =>
    new Date(ms).toLocaleDateString('es-UY', { weekday: 'short', day: '2-digit', month: '2-digit' });
  const fmtTime = (ms: number) =>
    new Date(ms).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rounded-2xl bg-ios-card dark:bg-ios-cardDark border border-ios-sep/30 dark:border-ios-sepDark p-3 space-y-3">
      <div className="flex items-center gap-1 text-xs font-semibold text-ios-muted uppercase">
        <History size={14} /> Esta semana
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<Clock size={14} />} label="Tiempo enfocado" value={formatDuration(totalMin)} />
        <Stat icon={<CheckCircle2 size={14} />} label="Tareas hechas" value={String(completions.length)} />
      </div>

      {/* Per-day bars */}
      <div className="flex items-end justify-between gap-1 h-16 px-1">
        {perDay.map((m, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex-1 flex items-end">
              <div
                className="w-full rounded-t bg-ios-accent/70 min-h-[2px] transition-all"
                style={{ height: `${(m / maxDay) * 100}%` }}
                title={formatDuration(m)}
              />
            </div>
            <div className="text-[9px] text-ios-muted">{WEEKDAY_LABELS[i]}</div>
          </div>
        ))}
      </div>

      {/* Time per task */}
      {perTask.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-ios-muted mb-1">Tiempo por tarea</div>
          <ul className="space-y-1">
            {perTask.slice(0, 5).map(([title, mins]) => (
              <li key={title} className="flex items-center justify-between text-xs">
                <span className="truncate flex-1">{title}</span>
                <span className="font-mono text-[11px] text-ios-muted ml-2 shrink-0">{formatDuration(mins)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Completed-task history */}
      <div>
        <div className="text-[11px] font-semibold text-ios-muted mb-1">Tareas completadas</div>
        {doneList.length === 0 ? (
          <div className="text-xs text-ios-muted py-2">Todavía no completaste tareas esta semana.</div>
        ) : (
          <ul className="space-y-1">
            {doneList.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-xs">
                <CheckCircle2 size={13} className="text-ios-success shrink-0" />
                <span className="truncate flex-1">{c.taskTitle}</span>
                {c.recurring && <Repeat size={11} className="text-ios-accent shrink-0" />}
                <span className="text-[10px] text-ios-muted shrink-0">
                  {fmtDay(c.completedAt)} {fmtTime(c.completedAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-ios-sep/30 dark:border-ios-sepDark p-2.5">
      <div className="flex items-center gap-1 text-[10px] text-ios-muted uppercase">{icon}{label}</div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
    </div>
  );
}
