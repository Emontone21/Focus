import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { usePomodoro } from '@/store/usePomodoro';
import { useSettings } from '@/store/useSettings';
import { Pause, Play, RotateCcw, Timer } from 'lucide-react';

const pad = (n: number) => String(n).padStart(2, '0');

export function PomodoroTimer() {
  const { phase, remaining, taskId, taskTitle, completedInRound, start, pause, resume, reset, associate, endsAt } = usePomodoro();
  const { pomodoroWork, pomodoroBreak, pomodoroLongBreak, setPomodoro } = useSettings();
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const active = tasks.filter((t) => !t.archived && t.kanban !== 'done');

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const phaseLabel =
    phase === 'work' ? 'Trabajando' :
    phase === 'break' ? 'Pausa' :
    phase === 'longBreak' ? 'Pausa larga' :
    'Listo';

  const running = phase !== 'idle' && endsAt !== null;
  const paused = phase !== 'idle' && endsAt === null;

  return (
    <div className="rounded-2xl bg-ios-card dark:bg-ios-cardDark border border-ios-sep/30 dark:border-ios-sepDark p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-ios-muted uppercase tracking-wide flex items-center gap-1">
          <Timer size={14} /> Pomodoro
        </div>
        <div className="text-xs text-ios-muted">{phaseLabel} · ronda {completedInRound % 4}/4</div>
      </div>

      <div className="text-center my-3">
        <div className="text-6xl font-bold tabular-nums tracking-tight">
          {pad(minutes)}:{pad(seconds)}
        </div>
        {taskTitle && (
          <div className="text-xs text-ios-muted mt-1">en: {taskTitle}</div>
        )}
      </div>

      <select
        value={taskId ?? ''}
        onChange={(e) => {
          const id = e.target.value ? Number(e.target.value) : null;
          const t = active.find((x) => x.id === id);
          associate(id, t?.title);
        }}
        className="ios-input"
      >
        <option value="">Asociar a una tarea…</option>
        {active.map((t) => (
          <option key={t.id} value={t.id}>{t.title}</option>
        ))}
      </select>

      <div className="grid grid-cols-3 gap-2 mt-3">
        {phase === 'idle' && (
          <button onClick={() => start(taskId)} className="col-span-3 py-2.5 rounded-xl bg-ios-accent text-white font-semibold flex items-center justify-center gap-2 active:scale-95">
            <Play size={16} /> Empezar {pomodoroWork} min
          </button>
        )}
        {running && (
          <>
            <button onClick={pause} className="col-span-2 py-2.5 rounded-xl bg-ios-warn text-white font-semibold flex items-center justify-center gap-2 active:scale-95">
              <Pause size={16} /> Pausar
            </button>
            <button onClick={reset} className="py-2.5 rounded-xl border border-ios-sep/40 dark:border-ios-sepDark flex items-center justify-center">
              <RotateCcw size={16} />
            </button>
          </>
        )}
        {paused && (
          <>
            <button onClick={resume} className="col-span-2 py-2.5 rounded-xl bg-ios-accent text-white font-semibold flex items-center justify-center gap-2 active:scale-95">
              <Play size={16} /> Reanudar
            </button>
            <button onClick={reset} className="py-2.5 rounded-xl border border-ios-sep/40 dark:border-ios-sepDark flex items-center justify-center">
              <RotateCcw size={16} />
            </button>
          </>
        )}
      </div>

      <details className="mt-3">
        <summary className="text-xs text-ios-muted cursor-pointer">Configurar duraciones</summary>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <NumField label="Trabajo (min)" value={pomodoroWork} onChange={(v) => setPomodoro(v, pomodoroBreak, pomodoroLongBreak)} />
          <NumField label="Pausa (min)" value={pomodoroBreak} onChange={(v) => setPomodoro(pomodoroWork, v, pomodoroLongBreak)} />
          <NumField label="Pausa larga (min)" value={pomodoroLongBreak} onChange={(v) => setPomodoro(pomodoroWork, pomodoroBreak, v)} />
        </div>
      </details>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="block text-[10px] text-ios-muted mb-1">{label}</span>
      <input
        type="number"
        min={1}
        max={120}
        value={value}
        onChange={(e) => onChange(Math.max(1, Math.min(120, Number(e.target.value) || 1)))}
        className="ios-input"
      />
    </label>
  );
}
