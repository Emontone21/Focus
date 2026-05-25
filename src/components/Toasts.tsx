import { useUI } from '@/store/useUI';

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div
      className="absolute left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none"
      style={{ top: 'calc(8px + var(--safe-top))' }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-xl px-3 py-2 text-sm shadow-lg text-white max-w-[90%] ${
            t.kind === 'error' ? 'bg-ios-danger' : t.kind === 'warn' ? 'bg-ios-warn' : 'bg-zinc-800/95'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
