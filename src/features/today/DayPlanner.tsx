import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Task } from '@/db/schema';
import { todayISO, hmToMinutes } from '@/lib/time';
import { Sheet } from '@/components/Sheet';
import { useUI } from '@/store/useUI';
import { Plus, X } from 'lucide-react';
import { usePomodoro } from '@/store/usePomodoro';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 → 20:00

export function DayPlanner() {
  const today = todayISO();
  const all = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const scheduled = all
    .filter((t) => t.scheduledFor === today && !t.archived)
    .sort((a, b) => hmToMinutes(a.blockStart || '00:00') - hmToMinutes(b.blockStart || '00:00'));
  const pool = all.filter((t) => !t.archived && t.kanban !== 'done' && t.scheduledFor !== today);

  const [picking, setPicking] = useState(false);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-ios-card dark:bg-ios-cardDark border border-ios-sep/30 dark:border-ios-sepDark p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-ios-muted uppercase">Agenda de hoy</div>
          <button
            onClick={() => setPicking(true)}
            className="text-xs font-semibold text-ios-accent flex items-center gap-1"
          >
            <Plus size={14} /> Asignar tarea
          </button>
        </div>

        <div className="relative">
          {HOURS.map((h) => (
            <div key={h} className="flex items-stretch border-t border-ios-sep/30 dark:border-ios-sepDark">
              <div className="w-10 text-[10px] text-ios-muted py-1">
                {String(h).padStart(2, '0')}:00
              </div>
              <div className="flex-1 py-1">
                {scheduled
                  .filter((t) => {
                    const start = hmToMinutes(t.blockStart || '00:00');
                    return start >= h * 60 && start < (h + 1) * 60;
                  })
                  .map((t) => (
                    <BlockChip key={t.id} task={t} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PickSheet open={picking} onClose={() => setPicking(false)} pool={pool} today={today} />
    </div>
  );
}

function BlockChip({ task }: { task: Task }) {
  const associate = usePomodoro((s) => s.associate);
  const toast = useUI((s) => s.toast);
  const clear = async () => {
    await db.tasks.update(task.id!, { scheduledFor: undefined, blockStart: undefined, blockEnd: undefined });
    toast('Sacada del día');
  };
  return (
    <div className="rounded-lg bg-ios-accent/10 border border-ios-accent/40 px-2 py-1.5 text-xs flex items-center gap-2 mb-1">
      <div className="font-mono text-[10px] text-ios-accent">{task.blockStart}–{task.blockEnd}</div>
      <div className="flex-1 truncate" onClick={() => associate(task.id!, task.title)}>
        {task.title}
      </div>
      <button onClick={clear} aria-label="Quitar"><X size={14} className="text-ios-muted" /></button>
    </div>
  );
}

function PickSheet({
  open, onClose, pool, today,
}: { open: boolean; onClose: () => void; pool: Task[]; today: string }) {
  const [taskId, setTaskId] = useState<number | ''>('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('09:30');
  const toast = useUI((s) => s.toast);

  useEffect(() => { if (!open) { setTaskId(''); setStart('09:00'); setEnd('09:30'); } }, [open]);

  const assign = async () => {
    if (!taskId) { toast('Elegí una tarea', 'warn'); return; }
    if (hmToMinutes(end) <= hmToMinutes(start)) { toast('La hora de fin debe ser posterior', 'warn'); return; }
    await db.tasks.update(Number(taskId), { scheduledFor: today, blockStart: start, blockEnd: end });
    toast('Bloque agendado');
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Asignar bloque">
      <div className="space-y-3">
        <label className="block">
          <span className="block text-xs text-ios-muted mb-1">Tarea</span>
          <select value={taskId} onChange={(e) => setTaskId(e.target.value ? Number(e.target.value) : '')} className="ios-input">
            <option value="">Elegir…</option>
            {pool.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-xs text-ios-muted mb-1">Inicio</span>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="ios-input" />
          </label>
          <label className="block">
            <span className="block text-xs text-ios-muted mb-1">Fin</span>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="ios-input" />
          </label>
        </div>
        <button onClick={assign} className="w-full py-2.5 rounded-xl bg-ios-accent text-white text-sm font-semibold active:scale-95">
          Asignar
        </button>
      </div>
    </Sheet>
  );
}
