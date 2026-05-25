import { Header } from '@/components/Header';
import { DayPlanner } from '@/features/today/DayPlanner';
import { PomodoroTimer } from '@/features/today/PomodoroTimer';

export function TodayPage() {
  return (
    <div className="h-full flex flex-col">
      <Header title="Hoy" />
      <div className="flex-1 scroll-y px-4 py-3 space-y-3">
        <PomodoroTimer />
        <DayPlanner />
      </div>
    </div>
  );
}
