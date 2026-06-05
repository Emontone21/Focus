import { db, type RecurUnit } from '@/db/schema';
import { todayISO } from '@/lib/time';

const UNIT_LABEL: Record<RecurUnit, [string, string]> = {
  // [singular, plural]
  day: ['día', 'días'],
  week: ['semana', 'semanas'],
  month: ['mes', 'meses'],
};

// Human label for a recurrence rule, e.g. "Cada 2 semanas" or "Semanal".
export const recurLabel = (unit?: RecurUnit, every?: number): string => {
  if (!unit) return '';
  const n = every && every > 0 ? every : 1;
  if (n === 1) {
    return unit === 'day' ? 'Diaria' : unit === 'week' ? 'Semanal' : 'Mensual';
  }
  const [, plural] = UNIT_LABEL[unit];
  return `Cada ${n} ${plural}`;
};

// Add `every` units to an ISO yyyy-mm-dd date, returning ISO.
export const addInterval = (iso: string, unit: RecurUnit, every: number): string => {
  const d = new Date(iso + 'T00:00:00');
  if (unit === 'day') d.setDate(d.getDate() + every);
  else if (unit === 'week') d.setDate(d.getDate() + every * 7);
  else d.setMonth(d.getMonth() + every);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export type CompleteResult = { recurred: boolean; nextDue?: string };

// Mark a task done. Always logs a completion entry. If the task recurs, it is
// reactivated (back to "Por hacer") with its due date bumped by the interval;
// otherwise it stays in "Hecho" with a completedAt timestamp.
export async function completeTask(id: number): Promise<CompleteResult> {
  const t = await db.tasks.get(id);
  if (!t) return { recurred: false };
  const now = Date.now();

  await db.completions.add({
    taskId: t.id,
    taskTitle: t.title,
    completedAt: now,
    recurring: !!t.recurUnit,
  });

  if (t.recurUnit) {
    const every = t.recurEvery && t.recurEvery > 0 ? t.recurEvery : 1;
    const today = todayISO();
    // Keep cadence if the due date is still ahead; otherwise count from today.
    const base = t.dueDate && t.dueDate > today ? t.dueDate : today;
    const nextDue = addInterval(base, t.recurUnit, every);
    await db.tasks.update(id, {
      kanban: 'todo',
      pomodoros: 0,
      dueDate: nextDue,
      scheduledFor: undefined,
      blockStart: undefined,
      blockEnd: undefined,
      completedAt: undefined,
      recurCount: (t.recurCount || 0) + 1,
    });
    return { recurred: true, nextDue };
  }

  await db.tasks.update(id, { kanban: 'done', completedAt: now });
  return { recurred: false };
}
