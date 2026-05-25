import { create } from 'zustand';

export type TabKey = 'inbox' | 'organize' | 'board' | 'notes' | 'today';

type Toast = { id: number; text: string; kind: 'info' | 'warn' | 'error' };

type UIState = {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  captureOpen: boolean;
  openCapture: () => void;
  closeCapture: () => void;
  toasts: Toast[];
  toast: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
};

let toastSeq = 0;

export const useUI = create<UIState>((set, get) => ({
  tab: 'inbox',
  setTab: (t) => set({ tab: t }),
  captureOpen: false,
  openCapture: () => set({ captureOpen: true }),
  closeCapture: () => set({ captureOpen: false }),
  toasts: [],
  toast: (text, kind = 'info') => {
    const id = ++toastSeq;
    set({ toasts: [...get().toasts, { id, text, kind }] });
    setTimeout(() => get().dismissToast(id), 3500);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
