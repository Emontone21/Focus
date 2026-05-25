import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type KanbanColumn, type Task } from '@/db/schema';
import { useSettings } from '@/store/useSettings';
import { useUI } from '@/store/useUI';
import { useDraggable, useDropZone } from '@/lib/dnd';
import { TaskEditor } from '@/features/organize/ProjectDetail';
import { Settings2 } from 'lucide-react';

const COLS: { key: KanbanColumn; title: string; hint?: string }[] = [
  { key: 'todo',  title: 'Por hacer' },
  { key: 'doing', title: 'Haciendo', hint: 'WIP' },
  { key: 'done',  title: 'Hecho' },
];

export function KanbanBoard() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const board = tasks.filter((t) => !t.archived);
  const { wipLimit, setWipLimit } = useSettings();
  const toast = useUI((s) => s.toast);
  const [showSettings, setShowSettings] = useState(false);
  const [editingTask, setEditingTask] = useState<number | null>(null);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pb-2 flex items-center justify-between">
        <p className="text-[11px] text-ios-muted">
          Límite WIP en <strong>Haciendo</strong>: {wipLimit}. El límite te obliga a terminar antes de empezar.
        </p>
        <button onClick={() => setShowSettings((s) => !s)} className="text-ios-muted">
          <Settings2 size={18} />
        </button>
      </div>
      {showSettings && (
        <div className="mx-4 mb-2 rounded-xl border border-ios-sep/40 dark:border-ios-sepDark p-3 bg-ios-card dark:bg-ios-cardDark flex items-center gap-2">
          <label className="text-xs text-ios-muted">Límite WIP</label>
          <input
            type="number"
            min={1}
            max={20}
            value={wipLimit}
            onChange={(e) => setWipLimit(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="ios-input w-20"
          />
        </div>
      )}

      <div className="flex-1 scroll-y px-3 pb-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {COLS.map((c) => {
            const items = board.filter((t) => t.kanban === c.key);
            return (
              <Column
                key={c.key}
                col={c.key}
                title={c.title}
                items={items}
                wipLimit={c.key === 'doing' ? wipLimit : undefined}
                onPickTask={(id) => setEditingTask(id)}
                onBlocked={(reason) => toast(reason, 'warn')}
              />
            );
          })}
        </div>
      </div>

      <TaskEditor taskId={editingTask} onClose={() => setEditingTask(null)} />
    </div>
  );
}

function Column({
  col, title, items, wipLimit, onPickTask, onBlocked,
}: {
  col: KanbanColumn;
  title: string;
  items: Task[];
  wipLimit?: number;
  onPickTask: (id: number) => void;
  onBlocked: (reason: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDropZone(ref, {
    accept: 'task',
    canDrop: (p) => {
      if (col !== 'doing' || wipLimit === undefined) return true;
      // Count tasks currently in `doing`, excluding the one being dragged.
      const draggedId = p.id as number;
      const isAlreadyHere = items.some((t) => t.id === draggedId);
      if (isAlreadyHere) return true;
      if (items.length >= wipLimit) {
        return `Límite WIP alcanzado (${wipLimit}). Terminá una tarea de "Haciendo" antes de empezar otra — ese es el punto del límite.`;
      }
      return true;
    },
    onDrop: async (p) => {
      const id = p.id as number;
      const t = await db.tasks.get(id);
      if (!t) return;
      // Re-check the limit at drop time (race-safe-ish for single-user app)
      if (col === 'doing' && wipLimit !== undefined && t.kanban !== 'doing') {
        const current = await db.tasks.where('kanban').equals('doing').count();
        if (current >= wipLimit) {
          onBlocked(`Límite WIP alcanzado (${wipLimit}).`);
          return;
        }
      }
      await db.tasks.update(id, { kanban: col });
    },
  });

  const overLimit = col === 'doing' && wipLimit !== undefined && items.length >= wipLimit;

  return (
    <div
      ref={ref}
      className={`rounded-xl border-2 p-2 min-h-[160px] ${
        overLimit ? 'border-ios-warn/60 bg-ios-warn/5' : 'border-ios-sep/30 dark:border-ios-sepDark bg-ios-card/70 dark:bg-ios-cardDark/60'
      }`}
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-xs font-bold uppercase tracking-wide">{title}</div>
        <div className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
          overLimit ? 'bg-ios-warn/20 text-ios-warn' : 'bg-ios-muted/15 text-ios-muted'
        }`}>
          {items.length}{wipLimit !== undefined ? `/${wipLimit}` : ''}
        </div>
      </div>
      <ul className="space-y-1.5">
        {items.map((t) => (
          <KanbanCard key={t.id} task={t} onClick={() => onPickTask(t.id!)} />
        ))}
      </ul>
    </div>
  );
}

function KanbanCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const ref = useRef<HTMLLIElement>(null);
  useDraggable(ref, { payload: { kind: 'task', id: task.id! } });
  return (
    <li
      ref={ref}
      onClick={onClick}
      className="rounded-lg bg-ios-card dark:bg-ios-cardDark border border-ios-sep/30 dark:border-ios-sepDark p-2 text-xs select-none touch-none shadow-ios"
    >
      <div className="font-medium text-[13px] leading-tight">{task.title}</div>
      <div className="flex items-center gap-1 mt-1 flex-wrap">
        {task.urgent && <Pill tone="danger">Urgente</Pill>}
        {task.important && <Pill tone="accent">Importante</Pill>}
        {task.pomodoros > 0 && <Pill tone="muted">{task.pomodoros} 🍅</Pill>}
        {task.dueDate && <Pill tone="muted">{task.dueDate}</Pill>}
      </div>
    </li>
  );
}

function Pill({ tone, children }: { tone: 'danger' | 'accent' | 'muted'; children: React.ReactNode }) {
  const t =
    tone === 'danger' ? 'bg-ios-danger/15 text-ios-danger' :
    tone === 'accent' ? 'bg-ios-accent/15 text-ios-accent' :
    'bg-ios-muted/15 text-ios-muted';
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${t}`}>{children}</span>;
}
