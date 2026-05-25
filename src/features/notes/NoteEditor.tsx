import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/schema';
import { mdToHtml } from '@/lib/markdown';
import { canonical, extractWikiLinks, splitWikiLinks } from '@/lib/wikilinks';
import { useUI } from '@/store/useUI';
import { ArrowLeft, Eye, Pencil, Trash2 } from 'lucide-react';

type Props = { noteId: number | 'new'; onBack: () => void; onOpenNote: (id: number) => void };

export function NoteEditor({ noteId, onBack, onOpenNote }: Props) {
  const note = useLiveQuery(async () => {
    if (noteId === 'new' || typeof noteId !== 'number') return undefined;
    return await db.notes.get(noteId);
  }, [noteId]);
  const allNotes = useLiveQuery(() => db.notes.toArray(), []) || [];
  const toast = useUI((s) => s.toast);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [suggest, setSuggest] = useState<{ open: boolean; query: string; pos: number } | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (noteId === 'new') { setTitle(''); setBody(''); return; }
    if (note) { setTitle(note.title); setBody(note.body); }
  }, [noteId, note?.id]);

  // Auto-save after a brief debounce so links/backlinks stay fresh.
  useEffect(() => {
    if (noteId === 'new') return;
    if (!note) return;
    const handle = setTimeout(async () => {
      const trimmed = title.trim() || 'Sin título';
      await db.notes.update(note.id!, { title: trimmed, body, updatedAt: Date.now() });
      await rebuildLinks(note.id!, body);
    }, 400);
    return () => clearTimeout(handle);
  }, [title, body, noteId, note?.id]);

  const saveNew = async () => {
    const t = title.trim() || 'Sin título';
    const now = Date.now();
    const id = await db.notes.add({ title: t, body, createdAt: now, updatedAt: now });
    await rebuildLinks(id, body);
    toast('Nota creada');
    onOpenNote(id);
  };

  const del = async () => {
    if (noteId === 'new' || !note) return;
    await db.notes.delete(note.id!);
    await db.links.where('fromId').equals(note.id!).delete();
    toast('Nota eliminada');
    onBack();
  };

  // Detect "[[" while typing to open suggestions
  const onBodyChange = (val: string, caret: number) => {
    setBody(val);
    const upto = val.slice(0, caret);
    const m = /\[\[([^\]\n]*)$/.exec(upto);
    if (m) {
      setSuggest({ open: true, query: m[1], pos: caret });
    } else {
      setSuggest(null);
    }
  };

  const suggestions = useMemo(() => {
    if (!suggest) return [];
    const q = suggest.query.toLowerCase();
    return allNotes.filter((n) => n.title.toLowerCase().includes(q)).slice(0, 6);
  }, [suggest, allNotes]);

  const pickSuggestion = (chosenTitle: string) => {
    if (!suggest) return;
    const upto = body.slice(0, suggest.pos);
    const after = body.slice(suggest.pos);
    const newUpto = upto.replace(/\[\[[^\]\n]*$/, `[[${chosenTitle}]]`);
    const newBody = newUpto + after;
    setBody(newBody);
    setSuggest(null);
    setTimeout(() => taRef.current?.focus(), 0);
  };

  // Backlinks live query
  const backlinks = useLiveQuery(async () => {
    const t = (note?.title || title || '').trim();
    if (!t) return [];
    const links = await db.links.where('toTitle').equals(canonical(t)).toArray();
    const ids = [...new Set(links.map((l) => l.fromId))];
    return await Promise.all(ids.map((id) => db.notes.get(id)));
  }, [note?.title, title]) || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-ios-accent text-sm flex items-center gap-1">
          <ArrowLeft size={16} /> Notas
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === 'edit' ? 'preview' : 'edit')}
            className="text-ios-muted text-xs px-2 py-1 rounded-lg border border-ios-sep/40 dark:border-ios-sepDark flex items-center gap-1"
          >
            {view === 'edit' ? <><Eye size={12} /> Vista</> : <><Pencil size={12} /> Editar</>}
          </button>
          {noteId !== 'new' && (
            <button onClick={del} className="text-ios-danger text-xs px-2 py-1 rounded-lg border border-ios-danger/30 flex items-center gap-1">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título"
        className="w-full text-xl font-bold bg-transparent outline-none border-b border-ios-sep/40 dark:border-ios-sepDark pb-2"
      />

      {view === 'edit' ? (
        <div className="relative">
          <textarea
            ref={taRef}
            value={body}
            onChange={(e) => onBodyChange(e.target.value, e.target.selectionStart || 0)}
            onKeyUp={(e) => onBodyChange(body, (e.target as HTMLTextAreaElement).selectionStart || 0)}
            placeholder={"Una idea atómica.\nUsá [[Otra nota]] para enlazar."}
            className="w-full min-h-[280px] resize-none rounded-xl bg-ios-bg dark:bg-ios-bgDark/60 p-3 text-[15px] outline-none border border-ios-sep/40 dark:border-ios-sepDark font-mono leading-relaxed"
          />
          {suggest?.open && (
            <div className="absolute z-30 left-2 bottom-2 right-2 rounded-xl bg-ios-card dark:bg-ios-cardDark border border-ios-sep/40 dark:border-ios-sepDark shadow-lg max-h-48 overflow-y-auto">
              {suggestions.length === 0 && suggest.query.trim() && (
                <button
                  onClick={() => pickSuggestion(suggest.query.trim())}
                  className="block w-full text-left px-3 py-2 text-sm text-ios-accent"
                >
                  Crear nota nueva: “{suggest.query.trim()}”
                </button>
              )}
              {suggestions.map((n) => (
                <button key={n.id} onClick={() => pickSuggestion(n.title)} className="block w-full text-left px-3 py-2 text-sm hover:bg-ios-bg dark:hover:bg-ios-bgDark/40">
                  {n.title}
                </button>
              ))}
              {suggest.query.trim() && !suggestions.some((n) => n.title.toLowerCase() === suggest.query.trim().toLowerCase()) && suggestions.length > 0 && (
                <button
                  onClick={() => pickSuggestion(suggest.query.trim())}
                  className="block w-full text-left px-3 py-2 text-sm text-ios-accent border-t border-ios-sep/30 dark:border-ios-sepDark"
                >
                  + Crear “{suggest.query.trim()}”
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <PreviewBody body={body} onClickLink={async (title) => {
          const target = await findOrCreate(title);
          if (target) onOpenNote(target);
        }} />
      )}

      {noteId === 'new' && (
        <button onClick={saveNew} className="w-full py-2.5 rounded-xl bg-ios-accent text-white text-sm font-semibold active:scale-95">
          Crear nota
        </button>
      )}

      <div className="pt-2 mt-2 border-t border-ios-sep/40 dark:border-ios-sepDark">
        <div className="text-xs font-semibold text-ios-muted uppercase mb-2">
          Backlinks ({backlinks.filter(Boolean).length})
        </div>
        <ul className="space-y-1.5">
          {backlinks.filter(Boolean).map((n) => (
            <li key={n!.id} className="rounded-lg bg-ios-card dark:bg-ios-cardDark border border-ios-sep/30 dark:border-ios-sepDark px-2 py-1.5 text-sm">
              <button onClick={() => onOpenNote(n!.id!)}>{n!.title}</button>
            </li>
          ))}
          {backlinks.filter(Boolean).length === 0 && (
            <div className="text-xs text-ios-muted">Ninguna nota enlaza acá todavía.</div>
          )}
        </ul>
      </div>
    </div>
  );
}

function PreviewBody({ body, onClickLink }: { body: string; onClickLink: (title: string) => void }) {
  const allNotes = useLiveQuery(() => db.notes.toArray(), []) || [];
  const titleSet = new Set(allNotes.map((n) => canonical(n.title)));
  const segs = splitWikiLinks(body);
  return (
    <div className="md text-[15px] leading-relaxed">
      {segs.map((s, i) => {
        if (s.type === 'text') {
          return <span key={i} dangerouslySetInnerHTML={{ __html: mdToHtml(s.text) }} />;
        }
        const exists = titleSet.has(canonical(s.title));
        return (
          <button
            key={i}
            type="button"
            onClick={() => onClickLink(s.title)}
            className={`wikilink ${exists ? '' : 'missing'} inline`}
          >
            {s.title}
          </button>
        );
      })}
    </div>
  );
}

async function rebuildLinks(noteId: number, body: string) {
  const titles = extractWikiLinks(body);
  await db.transaction('rw', db.links, async () => {
    await db.links.where('fromId').equals(noteId).delete();
    for (const t of titles) {
      await db.links.add({ fromId: noteId, toTitle: t });
    }
  });
}

async function findOrCreate(title: string): Promise<number | null> {
  const ck = canonical(title);
  const existing = (await db.notes.toArray()).find((n) => canonical(n.title) === ck);
  if (existing) return existing.id!;
  const now = Date.now();
  const id = await db.notes.add({ title: title.trim(), body: '', createdAt: now, updatedAt: now });
  return id;
}
