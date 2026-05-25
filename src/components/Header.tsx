import { Moon, Sun } from 'lucide-react';
import { useSettings } from '@/store/useSettings';

export function Header({ title, right }: { title: string; right?: React.ReactNode }) {
  const { theme, toggleTheme } = useSettings();
  return (
    <header
      className="sticky top-0 z-30 bg-ios-bg/85 dark:bg-ios-bgDark/85 backdrop-blur border-b border-ios-sep/40 dark:border-ios-sepDark/60"
      style={{ paddingTop: 'max(8px, var(--safe-top))' }}
    >
      <div className="px-4 pb-2 pt-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold leading-tight">{title}</h1>
        <div className="flex items-center gap-2">
          {right}
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="w-9 h-9 rounded-full flex items-center justify-center text-ios-muted active:scale-95"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
