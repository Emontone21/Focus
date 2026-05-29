import { Inbox, FolderKanban, KanbanSquare, NotebookText, Sun, Network } from 'lucide-react';
import { useUI, type TabKey } from '@/store/useUI';

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'inbox', label: 'Bandeja', icon: Inbox },
  { key: 'organize', label: 'Organizar', icon: FolderKanban },
  { key: 'board', label: 'Tablero', icon: KanbanSquare },
  { key: 'notes', label: 'Notas', icon: NotebookText },
  { key: 'today', label: 'Hoy', icon: Sun },
  { key: 'map', label: 'Mapa', icon: Network },
];

export function TabBar() {
  const { tab, setTab } = useUI();
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-40 border-t border-ios-sep/60 dark:border-ios-sepDark/60 bg-ios-card/95 dark:bg-ios-cardDark/95 backdrop-blur"
      style={{ paddingBottom: 'max(8px, var(--safe-bottom))' }}
    >
      <ul className="flex justify-around items-stretch pt-1">
        {tabs.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <li key={key} className="flex-1">
              <button
                onClick={() => setTab(key)}
                className={`w-full flex flex-col items-center justify-center gap-0.5 py-1 ${
                  active ? 'text-ios-accent' : 'text-ios-muted'
                }`}
              >
                <Icon size={22} />
                <span className="text-[10px] leading-tight font-medium">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
