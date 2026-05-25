import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Task } from '@/db/schema';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { useUI } from '@/store/useUI';

export function ProjectDetail({ projectId, onBack }: { projectId: number; onBack: () => void }) {
  const project = useLiveQuery(() => db.projects.get(projectId), [projectId]);
  const tasks = useLiveQuery(
    () => db.tasks.where('projectId').equals(projectId).toArray(),
    [projectId],
  ) || [];
  const [editingTask, setEditingTask] = useState<number | 'new' | null>(null);

  if (!project) return null;

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="flex items-center text-ios-accent text-sm gap-1">
        <ChevronLeft size={16} /> Volver a PARA
      </button>
      <div className="rounded-xl bg-ios-card dark:bg-ios-cardDark border border-ios-sep/30 dark:border-ios-sepDark p-3">
        <div className="font-bold text-lg">{project.name}</div>
        {project.goal && <div className="text-sm text-ios-muted mt-1">{project.goal}</div>}
        {project.dueDate && <div className="text-xs text-ios-accent mt-1">Vence {project.dueDate}</div>}
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="text-xs font-semibold text-ios-muted uppercase">Tareas ({tasks.filter((t) => !t.archived).length})</div>
        <button
          onClick={() => setEditingTask('new')}
          className="text-xs font-semibold text-ios-accent flex items-center gap-1"
        >
          <Plus size={14} /> Nueva tarea
        </button>
      </div>

      <ul className="space-y-2">
        {tasks.filter((t) => !t.archived).map((t) => (
          <li
            key={t.id}
            onClick={() => setEditingTask(t.id!)}
            className="rounded-xl bg-ios-card dark:bg-ios-cardDark border border-ios-sep/30 dark:border-ios-sepDark p-3"
          >
            <div className="flex items-center gap-2">
              <ColumnDot col={t.kanban} />
              <div className="flex-1 text-[15px]">{t.title}</div>
              {(t.urgent || t.important) && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-ios-warn/15 text-ios-warn font-semibold">
                  {t.urgent && t.important ? 'U+I' : t.urgent ? 'U' : 'I'}
                </span>
              )}
            </div>
            {t.dueDate && <div className="text-[11px] text-ios-muted mt-1">Vence {t.dueDate}</div>}
          </li>
        ))}
        {tasks.filter((t) => !t.archived).length === 0 && (
          <div className="text-center text-ios-muted text-sm py-6">
            Sin tareas todavía. Una tarea = una acción siguiente concreta.
          </div>
        )}
      </ul>

      <TaskEditor
        taskId={editingTask}
        projectId={projectId}
        onClose={() => setEditingTask(null)}
      />
    </div>
  );
}

function ColumnDot({ col }: { col: Task['kanban'] }) {
  const map = { todo: 'bg-ios-muted', doing: 'bg-ios-accent', done: 'bg-ios-success' };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${map[col]}`} />;
}

export function TaskEditor({
  taskId, projectId, onClose,
}: { taskId: number | 'new' | null; projectId?: number; onClose: () => void }) {
  const toast = useUI((s) => s.toast);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [important, setImportant] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [intention, setIntention] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (taskId === null) return;
      if (taskId === 'new') {
        setTitle(''); setNote(''); setUrgent(false); setImportant(false); setDueDate(''); setIntention('');
        return;
      }
      const t = await db.tasks.get(taskId);
      if (cancelled || !t) return;
      setTitle(t.title);
      setNote(t.note || '');
      setUrgent(t.urgent);
      setImportant(t.important);
      setDueDate(t.dueDate || '');
      setIntention(t.intention || '');
    })();
    return () => { cancelled = true; };
  }, [taskId]);

  const save = async () => {
    if (!title.trim()) { toast('Título obligatorio', 'warn'); return; }
    if (taskId === 'new') {
      await db.tasks.add({
        title, note: note || undefined,
        urgent, important,
        dueDate: dueDate || undefined,
        intention: intention || undefined,
        projectId,
        kanban: 'todo',
        pomodoros: 0,
        createdAt: Date.now(),
        archived: false,
      });
    } else if (typeof taskId === 'number') {
      await db.tasks.update(taskId, {
        title, note: note || undefined, urgent, important,
        dueDate: dueDate || undefined, intention: intention || undefined,
      });
    }
    toast('Tarea guardada');
    onClose();
  };

  const del = async () => {
    if (typeof taskId !== 'number') return;
    await db.tasks.delete(taskId);
    toast('Tarea eliminada');
    onClose();
  };

  return (
    <Sheet open={taskId !== null} onClose={onClose} title={taskId === 'new' ? 'Nueva tarea' : 'Editar tarea'}>
      <div className="space-y-3">
        <Field label="Título"><input className="ios-input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Nota"><textarea className="ios-input min-h-[70px]" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <ToggleRow label="Urgente" value={urgent} onChange={setUrgent} />
          <ToggleRow label="Importante" value={important} onChange={setImportant} />
        </div>
        <Field label="Fecha"><input type="date" className="ios-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
        <Field label="Intención de implementación (cuándo/dónde/cómo)">
          <textarea
            className="ios-input min-h-[60px]"
            placeholder='Ej: "Mañana 09:00 en mi escritorio, abro el documento X y reviso la sección 3."'
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
          />
        </Field>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-ios-sep/40 dark:border-ios-sepDark text-sm">Cancelar</button>
          <button onClick={save} className="flex-1 py-2.5 rounded-xl bg-ios-accent text-white text-sm font-semibold active:scale-95">Guardar</button>
        </div>
        {typeof taskId === 'number' && (
          <button onClick={del} className="w-full py-2 rounded-xl text-ios-danger text-sm font-medium border border-ios-danger/40 mt-2 flex items-center justify-center gap-2">
            <Trash2 size={14} /> Eliminar
          </button>
        )}
      </div>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-ios-muted mb-1">{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`rounded-xl p-3 text-sm font-medium border flex items-center justify-between ${
        value ? 'bg-ios-accent text-white border-ios-accent' : 'bg-ios-bg dark:bg-ios-bgDark/60 border-ios-sep/40 dark:border-ios-sepDark'
      }`}
    >
      <span>{label}</span>
      <span className={`w-3 h-3 rounded-full ${value ? 'bg-white' : 'bg-ios-muted/40'}`} />
    </button>
  );
}
