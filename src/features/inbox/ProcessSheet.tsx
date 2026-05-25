import { useEffect, useState } from 'react';
import { Sheet } from '@/components/Sheet';
import { db, type InboxItem } from '@/db/schema';
import { useUI } from '@/store/useUI';
import { useLiveQuery } from 'dexie-react-hooks';
import { Archive, Trash2, ListChecks, NotebookText, FolderKanban } from 'lucide-react';

type Props = { item: InboxItem | null; onClose: () => void };

export function ProcessSheet({ item, onClose }: Props) {
  const projects = useLiveQuery(() => db.projects.where('status').equals('active').toArray(), []);
  const areas = useLiveQuery(() => db.areas.toArray(), []);
  const toast = useUI((s) => s.toast);
  const [mode, setMode] = useState<'task' | 'note' | 'area' | null>(null);
  const [projectId, setProjectId] = useState<number | ''>('');
  const [areaId, setAreaId] = useState<number | ''>('');

  useEffect(() => {
    setMode(null);
    setProjectId('');
    setAreaId('');
  }, [item?.id]);

  if (!item) return null;

  const finish = async (markProcessed = true) => {
    if (markProcessed) await db.inbox.update(item.id!, { processed: true });
    onClose();
  };

  const toTask = async () => {
    await db.tasks.add({
      title: item.text,
      projectId: projectId ? Number(projectId) : undefined,
      urgent: false,
      important: false,
      kanban: 'todo',
      pomodoros: 0,
      createdAt: Date.now(),
      archived: false,
    });
    toast('Convertido en tarea');
    await finish();
  };

  const toNote = async () => {
    const now = Date.now();
    const title = item.text.split('\n')[0].slice(0, 80) || `Nota ${new Date().toLocaleString()}`;
    await db.notes.add({ title, body: item.text, createdAt: now, updatedAt: now });
    toast('Convertido en nota');
    await finish();
  };

  const toArea = async () => {
    if (!areaId) { toast('Elegí un área', 'warn'); return; }
    // Stored as a standalone task under an area (no project)
    await db.tasks.add({
      title: item.text,
      areaId: Number(areaId),
      urgent: false,
      important: false,
      kanban: 'todo',
      pomodoros: 0,
      createdAt: Date.now(),
      archived: false,
    });
    toast('Asignado a área');
    await finish();
  };

  const archiveItem = async () => { await finish(); toast('Archivado'); };
  const deleteItem = async () => { await db.inbox.delete(item.id!); onClose(); };

  return (
    <Sheet open={!!item} onClose={onClose} title="Procesar item">
      <div className="rounded-xl bg-ios-bg dark:bg-ios-bgDark/40 p-3 mb-3 text-sm">
        {item.text}
      </div>

      {mode === null && (
        <div className="grid grid-cols-2 gap-2">
          <Action icon={ListChecks} label="Tarea de proyecto" onClick={() => setMode('task')} />
          <Action icon={FolderKanban} label="Asignar a Área" onClick={() => setMode('area')} />
          <Action icon={NotebookText} label="Convertir en Nota" onClick={toNote} />
          <Action icon={Archive} label="Archivar" onClick={archiveItem} />
          <button
            onClick={deleteItem}
            className="col-span-2 mt-1 py-2.5 rounded-xl text-ios-danger text-sm font-medium border border-ios-danger/40 active:scale-95 flex items-center justify-center gap-2"
          >
            <Trash2 size={16} /> Eliminar definitivamente
          </button>
        </div>
      )}

      {mode === 'task' && (
        <div className="space-y-3">
          <label className="text-xs font-medium text-ios-muted">Proyecto (opcional)</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded-xl bg-ios-bg dark:bg-ios-bgDark/60 p-3 text-base border border-ios-sep/40 dark:border-ios-sepDark"
          >
            <option value="">Sin proyecto</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={() => setMode(null)} className="flex-1 py-2.5 rounded-xl border border-ios-sep/40 dark:border-ios-sepDark text-sm">Volver</button>
            <button onClick={toTask} className="flex-1 py-2.5 rounded-xl bg-ios-accent text-white text-sm font-semibold active:scale-95">Crear tarea</button>
          </div>
        </div>
      )}

      {mode === 'area' && (
        <div className="space-y-3">
          <label className="text-xs font-medium text-ios-muted">Área</label>
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded-xl bg-ios-bg dark:bg-ios-bgDark/60 p-3 text-base border border-ios-sep/40 dark:border-ios-sepDark"
          >
            <option value="">Elegir…</option>
            {areas?.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {areas && areas.length === 0 && (
            <p className="text-xs text-ios-muted">No hay áreas. Creá una en Organizar → Áreas.</p>
          )}
          <div className="flex gap-2">
            <button onClick={() => setMode(null)} className="flex-1 py-2.5 rounded-xl border border-ios-sep/40 dark:border-ios-sepDark text-sm">Volver</button>
            <button onClick={toArea} className="flex-1 py-2.5 rounded-xl bg-ios-accent text-white text-sm font-semibold active:scale-95">Asignar</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

function Action({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl p-3 bg-ios-bg dark:bg-ios-bgDark/40 border border-ios-sep/40 dark:border-ios-sepDark text-sm font-medium flex flex-col items-start gap-1 active:scale-95"
    >
      <Icon size={18} />
      {label}
    </button>
  );
}
