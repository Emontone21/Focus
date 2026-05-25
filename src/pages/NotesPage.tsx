import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { Header } from '@/components/Header';
import { Plus, Search } from 'lucide-react';
import { NoteEditor } from '@/features/notes/NoteEditor';

export function NotesPage() {
  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), []) || [];
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<number | 'new' | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return notes;
    const q = query.toLowerCase();
    return notes.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
  }, [notes, query]);

  return (
    <div className="h-full flex flex-col">
      <Header
        title="Notas"
        right={
          <button onClick={() => setOpen('new')} className="text-ios-accent font-semibold text-sm flex items-center gap-1">
            <Plus size={16} /> Nueva
          </button>
        }
      />
      <div className="flex-1 scroll-y px-4 py-3">
        {open !== null ? (
          <NoteEditor
            noteId={open}
            onBack={() => setOpen(null)}
            onOpenNote={(id) => setOpen(id)}
          />
        ) : (
          <>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en notas"
                className="ios-input pl-9"
              />
            </div>

            {filtered.length === 0 ? (
              <Empty />
            ) : (
              <ul className="space-y-2">
                {filtered.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => setOpen(n.id!)}
                    className="rounded-xl bg-ios-card dark:bg-ios-cardDark border border-ios-sep/30 dark:border-ios-sepDark p-3"
                  >
                    <div className="font-semibold text-[15px]">{n.title}</div>
                    {n.body && (
                      <div className="text-xs text-ios-muted mt-1 line-clamp-2">
                        {n.body.slice(0, 160)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="text-center text-ios-muted py-12 px-6">
      <p className="text-base font-medium mb-2">Sin notas todavía</p>
      <p className="text-sm">Una idea por nota. Conectalas con <code>[[título]]</code> y crecen como Zettelkasten.</p>
    </div>
  );
}
