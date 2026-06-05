import Dexie, { type Table } from 'dexie';

export type InboxItem = {
  id?: number;
  text: string;
  createdAt: number;
  processed: boolean;
};

export type Project = {
  id?: number;
  name: string;
  goal?: string;
  dueDate?: string; // ISO yyyy-mm-dd
  status: 'active' | 'archived';
  createdAt: number;
};

export type Area = {
  id?: number;
  name: string;
  description?: string;
  createdAt: number;
};

export type Resource = {
  id?: number;
  name: string;
  description?: string;
  createdAt: number;
};

export type KanbanColumn = 'todo' | 'doing' | 'done';

// Recurrence: when a recurring task is completed it reactivates after the interval.
export type RecurUnit = 'day' | 'week' | 'month';

export type Task = {
  id?: number;
  projectId?: number;     // null/undefined => standalone task
  areaId?: number;
  title: string;
  note?: string;
  urgent: boolean;
  important: boolean;
  dueDate?: string;       // ISO yyyy-mm-dd
  kanban: KanbanColumn;
  intention?: string;     // "implementation intention" (when/where/how)
  pomodoros: number;      // completed pomodoros
  scheduledFor?: string;  // ISO yyyy-mm-dd for the Day planner
  blockStart?: string;    // 'HH:MM' for time blocking
  blockEnd?: string;      // 'HH:MM'
  recurUnit?: RecurUnit;  // undefined => not recurring
  recurEvery?: number;    // interval count (default 1) — e.g. every 2 weeks
  recurCount?: number;    // times this recurring task has been completed
  completedAt?: number;   // epoch ms, set when a non-recurring task is completed
  createdAt: number;
  archived: boolean;
};

// One row per completed pomodoro work block — powers "horas dedicadas".
export type Session = {
  id?: number;
  taskId?: number;
  taskTitle?: string;
  minutes: number;
  completedAt: number;    // epoch ms
};

// One row per task completion (including each cycle of a recurring task).
export type Completion = {
  id?: number;
  taskId?: number;
  taskTitle: string;
  completedAt: number;    // epoch ms
  recurring: boolean;
};

export type Note = {
  id?: number;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
};

export type Link = {
  id?: number;
  fromId: number;   // note id
  toTitle: string;  // canonical lowercased title
};

export type Setting = {
  key: string;
  value: unknown;
};

// Default keys persisted in `settings`:
//   wipLimit: number (default 3)
//   pomodoroWork, pomodoroBreak, pomodoroLongBreak: minutes
//   lastReview: ISO date string
//   focusWeekTaskId: number | null

export class FocusFlowDB extends Dexie {
  inbox!: Table<InboxItem, number>;
  projects!: Table<Project, number>;
  areas!: Table<Area, number>;
  resources!: Table<Resource, number>;
  tasks!: Table<Task, number>;
  notes!: Table<Note, number>;
  links!: Table<Link, number>;
  settings!: Table<Setting, string>;
  sessions!: Table<Session, number>;
  completions!: Table<Completion, number>;

  constructor() {
    super('focusflow');
    this.version(1).stores({
      inbox: '++id, createdAt',
      projects: '++id, status, createdAt',
      areas: '++id, createdAt',
      resources: '++id, createdAt',
      tasks: '++id, projectId, kanban, scheduledFor, archived, dueDate, createdAt',
      notes: '++id, title, updatedAt',
      links: '++id, fromId, toTitle',
      settings: 'key',
    });
    // v2: time tracking + completion history for the weekly review on "Hoy".
    this.version(2).stores({
      sessions: '++id, completedAt, taskId',
      completions: '++id, completedAt, taskId',
    });
  }
}

export const db = new FocusFlowDB();

// ---- Settings helpers ----
const DEFAULT_SETTINGS: Record<string, unknown> = {
  wipLimit: 3,
  pomodoroWork: 25,
  pomodoroBreak: 5,
  pomodoroLongBreak: 15,
  lastReview: null,
  focusWeekTaskId: null,
};

export async function getSetting<T>(key: string): Promise<T> {
  const row = await db.settings.get(key);
  if (row) return row.value as T;
  return DEFAULT_SETTINGS[key] as T;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

export async function ensureDefaults(): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await db.settings.get(k);
      if (!existing) await db.settings.put({ key: k, value: v });
    }
  });
}
