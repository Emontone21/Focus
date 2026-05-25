import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { useSettings } from '@/store/useSettings';
import { useUI } from '@/store/useUI';
import { CheckCircle2, Circle } from 'lucide-react';
import { todayISO, formatHuman } from '@/lib/time';

const STEPS: { id: string; title: string; help: string }[] = [
  { id: 'inbox',    title: 'Vaciar Bandeja',           help: 'Procesá todos los items capturados hasta que la bandeja quede en cero.' },
  { id: 'projects', title: 'Revisar Proyectos activos', help: 'Asegurate de que cada proyecto tenga una próxima acción concreta.' },
  { id: 'areas',    title: 'Revisar Áreas',             help: '¿Hay algo descuidado en tus responsabilidades continuas?' },
  { id: 'focus',    title: 'Elegir el foco de la semana', help: 'Una sola tarea o proyecto. La revisión sin un foco se diluye.' },
];

export function WeeklyReview() {
  const { lastReview, focusWeekTaskId, setLastReview, setFocusWeekTaskId } = useSettings();
  const toast = useUI((s) => s.toast);
  const inbox = useLiveQuery(() => db.inbox.toArray(), []) || [];
  const inboxPending = inbox.filter((i) => !i.processed).length;
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const projectTasks = tasks.filter((t) => !t.archived && t.kanban !== 'done');

  const [done, setDone] = useState<Record<string, boolean>>({});
  const [focusId, setFocusId] = useState<number | ''>(focusWeekTaskId ?? '');

  const allChecked = STEPS.every((s) => done[s.id]);

  const finish = async () => {
    await setLastReview(todayISO());
    await setFocusWeekTaskId(focusId ? Number(focusId) : null);
    toast('Revisión semanal completada');
    setDone({});
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-ios-card dark:bg-ios-cardDark border border-ios-sep/30 dark:border-ios-sepDark p-3">
        <div className="text-xs text-ios-muted">Última revisión</div>
        <div className="text-base font-semibold">
          {lastReview ? formatHuman(lastReview) : 'Todavía no hiciste ninguna'}
        </div>
      </div>

      <ol className="space-y-2">
        {STEPS.map((s) => {
          const checked = !!done[s.id];
          const blocker =
            s.id === 'inbox' && inboxPending > 0 ? `Quedan ${inboxPending} en la bandeja` :
            s.id === 'focus' && !focusId ? 'Elegí una tarea de foco' :
            null;
          return (
            <li
              key={s.id}
              className={`rounded-xl border p-3 ${
                checked ? 'bg-ios-success/5 border-ios-success/40' : 'bg-ios-card dark:bg-ios-cardDark border-ios-sep/30 dark:border-ios-sepDark'
              }`}
            >
              <button
                onClick={() => {
                  if (blocker) { toast(blocker, 'warn'); return; }
                  setDone((d) => ({ ...d, [s.id]: !d[s.id] }));
                }}
                className="w-full flex items-start gap-2 text-left"
              >
                {checked ? <CheckCircle2 size={20} className="text-ios-success mt-0.5" /> : <Circle size={20} className="text-ios-muted mt-0.5" />}
                <div className="flex-1">
                  <div className="font-semibold text-[15px]">{s.title}</div>
                  <div className="text-xs text-ios-muted">{s.help}</div>
                </div>
              </button>
              {s.id === 'focus' && (
                <select
                  value={focusId}
                  onChange={(e) => setFocusId(e.target.value ? Number(e.target.value) : '')}
                  className="ios-input mt-2"
                >
                  <option value="">Elegir tarea de foco…</option>
                  {projectTasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              )}
            </li>
          );
        })}
      </ol>

      <button
        onClick={finish}
        disabled={!allChecked}
        className={`w-full py-3 rounded-xl text-sm font-semibold ${
          allChecked ? 'bg-ios-accent text-white active:scale-95' : 'bg-ios-muted/30 text-ios-muted'
        }`}
      >
        Cerrar revisión
      </button>
    </div>
  );
}
