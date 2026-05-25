import { Plus } from 'lucide-react';
import { useUI } from '@/store/useUI';

export function FAB() {
  const openCapture = useUI((s) => s.openCapture);
  return (
    <button
      aria-label="Capturar"
      onClick={openCapture}
      className="absolute z-40 right-4 rounded-full shadow-lg bg-ios-accent text-white flex items-center justify-center active:scale-95 transition"
      style={{
        bottom: `calc(72px + var(--safe-bottom))`,
        width: 56,
        height: 56,
      }}
    >
      <Plus size={28} strokeWidth={2.5} />
    </button>
  );
}
