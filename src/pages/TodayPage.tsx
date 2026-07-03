import { useState } from 'react';
import { Header } from '@/components/Header';
import { WeekCalendar } from '@/features/today/WeekCalendar';
import { DayPlanner } from '@/features/today/DayPlanner';
import { PomodoroTimer } from '@/features/today/PomodoroTimer';
import { WeekHistory } from '@/features/today/WeekHistory';
import { todayISO } from '@/lib/time';

export function TodayPage() {
  const [selected, setSelected] = useState(todayISO());

  return (
    <div className="h-full flex flex-col">
      <Header title="Hoy" />
      <div className="flex-1 scroll-y px-4 py-3 space-y-3">
        <PomodoroTimer />
        <WeekCalendar selected={selected} onSelect={setSelected} />
        <DayPlanner date={selected} />
        <WeekHistory />
      </div>
    </div>
  );
}
