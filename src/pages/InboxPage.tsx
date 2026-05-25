import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type InboxItem } from '@/db/schema';
import { Header } from '@/components/Header';
import { ProcessSheet } from '@/features/inbox/ProcessSheet';
import { ChevronRight } from 'lucide-react';

export function InboxPage() {
  // IndexedDB cannot index plain booleans reliably across browsers, so we
  // pull all items and filter in JS — the inbox is small by design.
  const items = useLiveQuery(() => db.inbox.orderBy('createdAt').reverse().toArray(), []) || [];
  const filtered = items.filter((i) => !i.processed);
  const [selected, setSelected] = useState<InboxItem | null>(null);

  return (
    <div className="h-full flex flex-col">
      <Header title="Bandeja" right={
        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-ios-accent/10 text-ios-accent">
          {filtered.length} sin procesar
        </span>
      } />
      <div className="flex-1 scroll-y px-4 py-3">
        {filtered.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-2">
            {filtered.map((it) => (
              <li
                key={it.id}
                className="rounded-xl bg-ios-card dark:bg-ios-cardDark border border-ios-sep/30 dark:border-ios-sepDark p-3 shadow-ios active:scale-[0.99]"
                onClick={() => setSelected(it)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-[15px] whitespace-pre-wrap break-words">{it.text}</p>
                    <p className="text-[11px] text-ios-muted mt-1">
                      {new Date(it.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-ios-muted shrink-0 mt-1" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ProcessSheet item={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function Empty() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-ios-muted px-6">
      <p className="text-base font-medium mb-2">Tu bandeja está vacía.</p>
      <p className="text-sm">Tocá <span className="text-ios-accent font-semibold">+</span> y volcá cualquier idea sin pensar dónde va. La clasificás después.</p>
    </div>
  );
}
