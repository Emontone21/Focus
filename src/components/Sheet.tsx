import { useEffect } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  full?: boolean;
};

export function Sheet({ open, onClose, title, children, full }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Cerrar"
      />
      <div
        className={`relative bg-ios-card dark:bg-ios-cardDark rounded-t-2xl shadow-2xl flex flex-col ${
          full ? 'h-[88%]' : 'max-h-[88%]'
        }`}
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-ios-sep/40 dark:border-ios-sepDark/60">
          <div className="w-8" />
          <div className="text-sm font-semibold">{title}</div>
          <button onClick={onClose} aria-label="Cerrar" className="w-8 h-8 flex items-center justify-center text-ios-muted">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-y px-4 py-3">{children}</div>
      </div>
    </div>
  );
}
