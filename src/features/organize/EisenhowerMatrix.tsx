import { useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Task } from '@/db/schema';
import { useDraggable, useDropZone } from '@/lib/dnd';

type Quad = { urgent: boolean; important: boolean };

const QUADS: { key: string; q: Quad; title: string; tone: string; hint: string }[] = [
  { key: 'do',       q: { urgent: true,  important: true  }, title: 'Hacer ya',         tone: 'border-ios-danger/60 bg-ios-danger/5',     hint: 'Urgente + Importante' },
  { key: 'schedule', q: { urgent: false, important: true  }, title: 'Planificar',       tone: 'border-ios-accent/60 bg-ios-accent/5',     hint: 'Importante / No urgente — el cuadrante clave' },
  { key: 'delegate', q: { urgent: true,  important: false }, title: 'Delegar / Acotar', tone: 'border-ios-warn/60 bg-ios-warn/5',         hint: 'Urgente / No importante' },
  { key: 'drop',     q: { urgent: false, important: false }, title: 'Descartar',        tone: 'border-ios-muted/40 bg-ios-muted/5',       hint: 'Ni urgente ni importante' },
];

export function EisenhowerMatrix() {
  const all = useLiveQuery(() => db.tasks.toArray(), []) || [];
  const filtered = all.filter((t) => !t.archived && t.kanban !== 'done');

  return (
    <div className="grid grid-cols-2 gap-2">
      {QUADS.map((q) => (
        <Quadrant key={q.key} cfg={q} tasks={filtered.filter((t) => t.urgent === q.q.urgent && t.important === q.q.important)} />
      ))}
    </div>
  );
}

function Quadrant({ cfg, tasks }: { cfg: typeof QUADS[number]; tasks: Task[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useDropZone(ref, {
    accept: 'task',
    onDrop: async (p) => {
      const id = p.id as number;
      await db.tasks.update(id, { urgent: cfg.q.urgent, important: cfg.q.important });
    },
  });
  return (
    <div
      ref={ref}
      className={`rounded-xl border-2 p-2 min-h-[160px] ${cfg.tone}`}
    >
      <div className="text-xs font-bold">{cfg.title}</div>
      <div className="text-[10px] text-ios-muted mb-2">{cfg.hint}</div>
      <ul className="space-y-1.5">
        {tasks.map((t) => (
          <Card key={t.id} task={t} />
        ))}
      </ul>
    </div>
  );
}

function Card({ task }: { task: Task }) {
  const ref = useRef<HTMLLIElement>(null);
  useDraggable(ref, { payload: { kind: 'task', id: task.id! } });
  return (
    <li
      ref={ref}
      className="rounded-lg bg-ios-card dark:bg-ios-cardDark border border-ios-sep/30 dark:border-ios-sepDark px-2 py-1.5 text-xs touch-none select-none"
    >
      {task.title}
    </li>
  );
}
