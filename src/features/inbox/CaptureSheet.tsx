import { useEffect, useRef, useState } from 'react';
import { Sheet } from '@/components/Sheet';
import { useUI } from '@/store/useUI';
import { db } from '@/db/schema';

export function CaptureSheet() {
  const open = useUI((s) => s.captureOpen);
  const close = useUI((s) => s.closeCapture);
  const toast = useUI((s) => s.toast);
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => ref.current?.focus(), 50);
    else setText('');
  }, [open]);

  // Cmd/Ctrl+N opens capture from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        useUI.getState().openCapture();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = async () => {
    const t = text.trim();
    if (!t) { close(); return; }
    await db.inbox.add({ text: t, createdAt: Date.now(), processed: false });
    toast('Capturado en Bandeja');
    close();
  };

  return (
    <Sheet open={open} onClose={close} title="Capturar">
      <p className="text-xs text-ios-muted mb-2">
        Escribí lo que tengas en la cabeza. Lo clasificás después.
      </p>
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Una idea, una tarea, un pendiente…"
        className="w-full min-h-[140px] resize-none rounded-xl bg-ios-bg dark:bg-ios-bgDark/60 p-3 text-base outline-none border border-ios-sep/40 dark:border-ios-sepDark"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
        }}
      />
      <div className="flex gap-2 mt-3">
        <button
          onClick={close}
          className="flex-1 py-2.5 rounded-xl bg-ios-bg dark:bg-ios-bgDark/60 border border-ios-sep/40 dark:border-ios-sepDark text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          onClick={submit}
          className="flex-1 py-2.5 rounded-xl bg-ios-accent text-white text-sm font-semibold active:scale-95"
        >
          Guardar
        </button>
      </div>
    </Sheet>
  );
}
