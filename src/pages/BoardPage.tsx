import { Header } from '@/components/Header';
import { KanbanBoard } from '@/features/board/KanbanBoard';

export function BoardPage() {
  return (
    <div className="h-full flex flex-col">
      <Header title="Tablero" />
      <div className="flex-1 overflow-hidden">
        <KanbanBoard />
      </div>
    </div>
  );
}
