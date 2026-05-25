import { create } from 'zustand';
import { getSetting, setSetting, ensureDefaults } from '@/db/schema';

type SettingsState = {
  ready: boolean;
  theme: 'light' | 'dark';
  wipLimit: number;
  pomodoroWork: number;
  pomodoroBreak: number;
  pomodoroLongBreak: number;
  lastReview: string | null;
  focusWeekTaskId: number | null;
  load: () => Promise<void>;
  setTheme: (t: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setWipLimit: (n: number) => Promise<void>;
  setPomodoro: (work: number, brk: number, longBrk: number) => Promise<void>;
  setLastReview: (iso: string) => Promise<void>;
  setFocusWeekTaskId: (id: number | null) => Promise<void>;
};

const applyTheme = (t: 'light' | 'dark') => {
  if (t === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
};

export const useSettings = create<SettingsState>((set, get) => ({
  ready: false,
  theme: (localStorage.getItem('ff:theme') as 'light' | 'dark') ||
    (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  wipLimit: 3,
  pomodoroWork: 25,
  pomodoroBreak: 5,
  pomodoroLongBreak: 15,
  lastReview: null,
  focusWeekTaskId: null,

  load: async () => {
    await ensureDefaults();
    const [wipLimit, pomodoroWork, pomodoroBreak, pomodoroLongBreak, lastReview, focusWeekTaskId] =
      await Promise.all([
        getSetting<number>('wipLimit'),
        getSetting<number>('pomodoroWork'),
        getSetting<number>('pomodoroBreak'),
        getSetting<number>('pomodoroLongBreak'),
        getSetting<string | null>('lastReview'),
        getSetting<number | null>('focusWeekTaskId'),
      ]);
    set({
      ready: true,
      wipLimit,
      pomodoroWork,
      pomodoroBreak,
      pomodoroLongBreak,
      lastReview,
      focusWeekTaskId,
    });
    applyTheme(get().theme);
  },

  setTheme: (t) => {
    localStorage.setItem('ff:theme', t);
    applyTheme(t);
    set({ theme: t });
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('ff:theme', next);
    applyTheme(next);
    set({ theme: next });
  },

  setWipLimit: async (n) => {
    await setSetting('wipLimit', n);
    set({ wipLimit: n });
  },
  setPomodoro: async (work, brk, longBrk) => {
    await Promise.all([
      setSetting('pomodoroWork', work),
      setSetting('pomodoroBreak', brk),
      setSetting('pomodoroLongBreak', longBrk),
    ]);
    set({ pomodoroWork: work, pomodoroBreak: brk, pomodoroLongBreak: longBrk });
  },
  setLastReview: async (iso) => {
    await setSetting('lastReview', iso);
    set({ lastReview: iso });
  },
  setFocusWeekTaskId: async (id) => {
    await setSetting('focusWeekTaskId', id);
    set({ focusWeekTaskId: id });
  },
}));
