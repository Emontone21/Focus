import { create } from 'zustand';
import { db } from '@/db/schema';
import { useSettings } from '@/store/useSettings';
import { notify, ensureNotificationPermission } from '@/lib/notifications';

export type Phase = 'idle' | 'work' | 'break' | 'longBreak';

type State = {
  phase: Phase;
  taskId: number | null;
  taskTitle: string | null;
  endsAt: number | null;   // epoch ms when current phase ends
  remaining: number;       // seconds, derived
  completedInRound: number; // work blocks completed in the current cycle (resets after long break)
  tick: () => void;
  start: (taskId?: number | null) => Promise<void>;
  pause: () => void;       // freezes remaining
  resume: () => void;
  reset: () => void;
  associate: (taskId: number | null, title?: string) => void;
};

let timer: number | null = null;

export const usePomodoro = create<State>((set, get) => ({
  phase: 'idle',
  taskId: null,
  taskTitle: null,
  endsAt: null,
  remaining: 0,
  completedInRound: 0,

  tick: () => {
    const { endsAt, phase } = get();
    if (!endsAt || phase === 'idle') return;
    const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
    set({ remaining });
    if (remaining === 0) {
      // Phase finished → advance
      const settings = useSettings.getState();
      const { phase, completedInRound, taskId, taskTitle } = get();
      if (phase === 'work') {
        // increment task pomodoro count
        if (taskId !== null) {
          db.tasks.get(taskId).then((t) => {
            if (t) db.tasks.update(taskId, { pomodoros: (t.pomodoros || 0) + 1 });
          });
        }
        // log the focused time so "Hoy" can show hours dedicated this week
        db.sessions.add({
          taskId: taskId ?? undefined,
          taskTitle: taskTitle ?? undefined,
          minutes: settings.pomodoroWork,
          completedAt: Date.now(),
        });
        const next = completedInRound + 1;
        const goingLong = next % 4 === 0;
        const mins = goingLong ? settings.pomodoroLongBreak : settings.pomodoroBreak;
        notify(`Pomodoro completado`, `Tomate ${mins} min de pausa ${goingLong ? '(pausa larga)' : ''}`);
        set({
          phase: goingLong ? 'longBreak' : 'break',
          completedInRound: next,
          endsAt: Date.now() + mins * 60000,
          remaining: mins * 60,
        });
      } else {
        notify('Pausa terminada', 'Volvé al trabajo cuando estés listo.');
        set({ phase: 'idle', endsAt: null, remaining: 0 });
      }
    }
  },

  start: async (taskId = null) => {
    await ensureNotificationPermission();
    const mins = useSettings.getState().pomodoroWork;
    const state = get();
    let title: string | null = state.taskTitle;
    if (taskId !== null && taskId !== state.taskId) {
      const t = await db.tasks.get(taskId);
      title = t?.title ?? null;
    }
    set({
      phase: 'work',
      taskId: taskId ?? state.taskId,
      taskTitle: title,
      endsAt: Date.now() + mins * 60000,
      remaining: mins * 60,
    });
  },

  pause: () => {
    const { endsAt } = get();
    if (!endsAt) return;
    const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
    set({ endsAt: null, remaining });
  },

  resume: () => {
    const { remaining, phase } = get();
    if (phase === 'idle' || remaining <= 0) return;
    set({ endsAt: Date.now() + remaining * 1000 });
  },

  reset: () => {
    set({ phase: 'idle', endsAt: null, remaining: 0, completedInRound: 0 });
  },

  associate: (taskId, title) => {
    set({ taskId, taskTitle: title ?? null });
  },
}));

// Start a global tick when this module is imported.
if (typeof window !== 'undefined' && timer === null) {
  timer = window.setInterval(() => {
    usePomodoro.getState().tick();
  }, 500);
}
