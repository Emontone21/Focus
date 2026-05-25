import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Project, type Area, type Resource } from '@/db/schema';
import { Sheet } from '@/components/Sheet';
import { Plus, ChevronRight, Trash2, ArrowRight, Archive } from 'lucide-react';
import { useUI } from '@/store/useUI';

type Bucket = 'projects' | 'areas' | 'resources' | 'archive';

const BUCKETS: { key: Bucket; label: string; desc: string }[] = [
  { key: 'projects', label: 'Proyectos', desc: 'Resultados concretos con fecha' },
  { key: 'areas', label: 'Áreas', desc: 'Responsabilidades continuas' },
  { key: 'resources', label: 'Recursos', desc: 'Temas de interés / referencia' },
  { key: 'archive', label: 'Archivo', desc: 'Inactivo' },
];

export function PARAView({ onOpenProject }: { onOpenProject: (id: number) => void }) {
  const [bucket, setBucket] = useState<Bucket>('projects');
  const [editing, setEditing] = useState<{ kind: Bucket; id?: number } | null>(null);

  const projects = useLiveQuery(() => db.projects.toArray(), []) || [];
  const areas = useLiveQuery(() => db.areas.toArray(), []) || [];
  const resources = useLiveQuery(() => db.resources.toArray(), []) || [];
  const archivedProjects = projects.filter((p) => p.status === 'archived');
  const activeProjects = projects.filter((p) => p.status === 'active');

  const counts: Record<Bucket, number> = {
    projects: activeProjects.length,
    areas: areas.length,
    resources: resources.length,
    archive: archivedProjects.length,
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {BUCKETS.map((b) => (
          <button
            key={b.key}
            onClick={() => setBucket(b.key)}
            className={`rounded-xl p-2 text-xs font-semibold border ${
              bucket === b.key
                ? 'bg-ios-accent text-white border-ios-accent'
                : 'bg-ios-card dark:bg-ios-cardDark border-ios-sep/40 dark:border-ios-sepDark text-ios-muted'
            }`}
          >
            <div>{b.label}</div>
            <div className="text-[10px] opacity-80 mt-0.5">{counts[b.key]}</div>
          </button>
        ))}
      </div>

      <p className="text-[11px] text-ios-muted px-1">
        {BUCKETS.find((b) => b.key === bucket)!.desc}
      </p>

      <div className="space-y-2">
        {bucket === 'projects' && (
          <ProjectList projects={activeProjects} onOpen={onOpenProject} onEdit={(id) => setEditing({ kind: 'projects', id })} />
        )}
        {bucket === 'areas' && (
          <AreaList areas={areas} onEdit={(id) => setEditing({ kind: 'areas', id })} />
        )}
        {bucket === 'resources' && (
          <ResourceList resources={resources} onEdit={(id) => setEditing({ kind: 'resources', id })} />
        )}
        {bucket === 'archive' && (
          <ProjectList projects={archivedProjects} onOpen={onOpenProject} onEdit={(id) => setEditing({ kind: 'projects', id })} archived />
        )}
      </div>

      {bucket !== 'archive' && (
        <button
          onClick={() => setEditing({ kind: bucket })}
          className="w-full py-2.5 rounded-xl bg-ios-accent text-white text-sm font-semibold active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Nuevo en {BUCKETS.find((b) => b.key === bucket)!.label.toLowerCase()}
        </button>
      )}

      <EditorSheet
        editing={editing}
        onClose={() => setEditing(null)}
        projects={projects}
        areas={areas}
        resources={resources}
      />
    </div>
  );
}

function ProjectList({
  projects, onOpen, onEdit, archived,
}: { projects: Project[]; onOpen: (id: number) => void; onEdit: (id: number) => void; archived?: boolean }) {
  if (projects.length === 0) {
    return <EmptyHint text={archived ? 'No hay proyectos archivados.' : 'Sin proyectos activos. Creá uno con un resultado concreto.'} />;
  }
  return (
    <ul className="space-y-2">
      {projects.map((p) => (
        <li key={p.id} className="rounded-xl bg-ios-card dark:bg-ios-cardDark border border-ios-sep/30 dark:border-ios-sepDark p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1" onClick={() => onOpen(p.id!)}>
              <div className="font-semibold text-[15px]">{p.name}</div>
              {p.goal && <div className="text-xs text-ios-muted mt-0.5">{p.goal}</div>}
              {p.dueDate && <div className="text-[11px] text-ios-accent mt-1">Vence {p.dueDate}</div>}
            </div>
            <button onClick={() => onEdit(p.id!)} className="text-ios-muted text-xs px-2 py-1 rounded-lg border border-ios-sep/40 dark:border-ios-sepDark">Editar</button>
            <ChevronRight size={18} className="text-ios-muted shrink-0 mt-1" onClick={() => onOpen(p.id!)} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function AreaList({ areas, onEdit }: { areas: Area[]; onEdit: (id: number) => void }) {
  if (areas.length === 0) return <EmptyHint text="Sin áreas. Crea una para responsabilidades continuas (salud, finanzas, equipo X)." />;
  return (
    <ul className="space-y-2">
      {areas.map((a) => (
        <li key={a.id} className="rounded-xl bg-ios-card dark:bg-ios-cardDark border border-ios-sep/30 dark:border-ios-sepDark p-3 flex items-start gap-2">
          <div className="flex-1">
            <div className="font-semibold text-[15px]">{a.name}</div>
            {a.description && <div className="text-xs text-ios-muted mt-0.5">{a.description}</div>}
          </div>
          <button onClick={() => onEdit(a.id!)} className="text-ios-muted text-xs px-2 py-1 rounded-lg border border-ios-sep/40 dark:border-ios-sepDark">Editar</button>
        </li>
      ))}
    </ul>
  );
}

function ResourceList({ resources, onEdit }: { resources: Resource[]; onEdit: (id: number) => void }) {
  if (resources.length === 0) return <EmptyHint text="Sin recursos. Guardá temas de interés / referencia." />;
  return (
    <ul className="space-y-2">
      {resources.map((r) => (
        <li key={r.id} className="rounded-xl bg-ios-card dark:bg-ios-cardDark border border-ios-sep/30 dark:border-ios-sepDark p-3 flex items-start gap-2">
          <div className="flex-1">
            <div className="font-semibold text-[15px]">{r.name}</div>
            {r.description && <div className="text-xs text-ios-muted mt-0.5">{r.description}</div>}
          </div>
          <button onClick={() => onEdit(r.id!)} className="text-ios-muted text-xs px-2 py-1 rounded-lg border border-ios-sep/40 dark:border-ios-sepDark">Editar</button>
        </li>
      ))}
    </ul>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div className="text-center text-ios-muted text-sm py-6 px-4">{text}</div>;
}

function EditorSheet({
  editing, onClose,
}: {
  editing: { kind: Bucket; id?: number } | null;
  onClose: () => void;
  projects: Project[];
  areas: Area[];
  resources: Resource[];
}) {
  const toast = useUI((s) => s.toast);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [moveTo, setMoveTo] = useState<Bucket | ''>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!editing) return;
      if (!editing.id) {
        setName(''); setGoal(''); setDueDate(''); setDescription('');
        return;
      }
      const row =
        editing.kind === 'projects' ? await db.projects.get(editing.id)
        : editing.kind === 'areas' ? await db.areas.get(editing.id)
        : editing.kind === 'resources' ? await db.resources.get(editing.id)
        : null;
      if (cancelled || !row) return;
      setName('name' in row ? row.name : '');
      setGoal('goal' in row && row.goal ? row.goal : '');
      setDueDate('dueDate' in row && row.dueDate ? row.dueDate : '');
      setDescription('description' in row && row.description ? row.description : '');
    })();
    return () => { cancelled = true; };
  }, [editing?.id, editing?.kind]);

  const close = () => {
    setName(''); setGoal(''); setDueDate(''); setDescription(''); setMoveTo('');
    onClose();
  };

  const save = async () => {
    if (!name.trim()) { toast('El nombre es obligatorio', 'warn'); return; }
    const kind = editing!.kind;
    if (kind === 'projects') {
      if (editing!.id) {
        await db.projects.update(editing!.id, { name, goal: goal || undefined, dueDate: dueDate || undefined });
      } else {
        await db.projects.add({ name, goal: goal || undefined, dueDate: dueDate || undefined, status: 'active', createdAt: Date.now() });
      }
    } else if (kind === 'areas') {
      if (editing!.id) await db.areas.update(editing!.id, { name, description: description || undefined });
      else await db.areas.add({ name, description: description || undefined, createdAt: Date.now() });
    } else if (kind === 'resources') {
      if (editing!.id) await db.resources.update(editing!.id, { name, description: description || undefined });
      else await db.resources.add({ name, description: description || undefined, createdAt: Date.now() });
    }
    toast('Guardado');
    close();
  };

  const del = async () => {
    if (!editing?.id) return;
    if (editing.kind === 'projects') await db.projects.delete(editing.id);
    else if (editing.kind === 'areas') await db.areas.delete(editing.id);
    else if (editing.kind === 'resources') await db.resources.delete(editing.id);
    toast('Eliminado');
    close();
  };

  const archiveOrUnarchive = async () => {
    if (!editing?.id || editing.kind !== 'projects') return;
    const p = await db.projects.get(editing.id);
    if (!p) return;
    await db.projects.update(editing.id, { status: p.status === 'active' ? 'archived' : 'active' });
    toast(p.status === 'active' ? 'Archivado' : 'Reactivado');
    close();
  };

  const move = async () => {
    if (!editing?.id || !moveTo || moveTo === editing.kind || moveTo === 'archive') return;
    // Move keeps name/description across PARA siblings (project<->area<->resource).
    const src = editing.kind;
    const id = editing.id;
    const srcRow = src === 'projects' ? await db.projects.get(id)
      : src === 'areas' ? await db.areas.get(id)
      : await db.resources.get(id);
    if (!srcRow) return;
    const common = { name: srcRow.name, createdAt: Date.now() };
    if (moveTo === 'projects') {
      await db.projects.add({ ...common, status: 'active' });
    } else if (moveTo === 'areas') {
      await db.areas.add({ ...common, description: (srcRow as Project).goal || (srcRow as Area).description });
    } else if (moveTo === 'resources') {
      await db.resources.add({ ...common, description: (srcRow as Resource).description || (srcRow as Project).goal });
    }
    if (src === 'projects') await db.projects.delete(id);
    else if (src === 'areas') await db.areas.delete(id);
    else if (src === 'resources') await db.resources.delete(id);
    toast(`Movido a ${moveTo}`);
    close();
  };

  if (!editing) return null;
  const title = editing.id ? 'Editar' : 'Nuevo';

  return (
    <Sheet open={!!editing} onClose={close} title={`${title} ${editing.kind === 'projects' ? 'proyecto' : editing.kind === 'areas' ? 'área' : 'recurso'}`}>
      <div className="space-y-3">
        <Field label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} className="ios-input" />
        </Field>
        {editing.kind === 'projects' && (
          <>
            <Field label="Objetivo / resultado esperado">
              <textarea value={goal} onChange={(e) => setGoal(e.target.value)} className="ios-input min-h-[70px]" />
            </Field>
            <Field label="Fecha objetivo">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="ios-input" />
            </Field>
          </>
        )}
        {(editing.kind === 'areas' || editing.kind === 'resources') && (
          <Field label="Descripción">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="ios-input min-h-[70px]" />
          </Field>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={close} className="flex-1 py-2.5 rounded-xl border border-ios-sep/40 dark:border-ios-sepDark text-sm">Cancelar</button>
          <button onClick={save} className="flex-1 py-2.5 rounded-xl bg-ios-accent text-white text-sm font-semibold active:scale-95">Guardar</button>
        </div>

        {editing.id && (
          <div className="pt-4 mt-2 border-t border-ios-sep/40 dark:border-ios-sepDark space-y-2">
            <div className="text-xs font-semibold text-ios-muted">Acciones</div>
            {editing.kind === 'projects' && (
              <button onClick={archiveOrUnarchive} className="w-full py-2 rounded-xl border border-ios-sep/40 dark:border-ios-sepDark text-sm flex items-center justify-center gap-2">
                <Archive size={14} /> Archivar / Reactivar
              </button>
            )}
            <div className="flex items-center gap-2">
              <select value={moveTo} onChange={(e) => setMoveTo(e.target.value as Bucket | '')} className="ios-input flex-1">
                <option value="">Mover a…</option>
                {BUCKETS.filter((b) => b.key !== 'archive' && b.key !== editing.kind).map((b) => (
                  <option key={b.key} value={b.key}>{b.label}</option>
                ))}
              </select>
              <button onClick={move} className="py-2 px-3 rounded-xl bg-ios-accent text-white text-sm font-semibold active:scale-95 flex items-center gap-1">
                <ArrowRight size={14} /> Mover
              </button>
            </div>
            <button onClick={del} className="w-full py-2 rounded-xl text-ios-danger text-sm font-medium border border-ios-danger/40 active:scale-95 flex items-center justify-center gap-2">
              <Trash2 size={14} /> Eliminar
            </button>
          </div>
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
