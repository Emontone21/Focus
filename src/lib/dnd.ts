// Touch-friendly drag system using Pointer Events. HTML5 drag-and-drop is
// flaky inside iOS Safari and the Capacitor WebView, so we roll our own.
//
// Usage:
//   useDraggable(ref, { payload: { kind: 'task', id } })
//   useDropZone(ref, { accept: 'task', onDrop: (payload) => ... })
//
// Drop zones can return a "block" reason to prevent acceptance (e.g. WIP limit).

import { useEffect, useRef } from 'react';

export type DragPayload = { kind: string; [k: string]: unknown };

type ActiveDrag = {
  payload: DragPayload;
  ghost: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
  sourceEl: HTMLElement;
  offsetX: number;
  offsetY: number;
} | null;

let active: ActiveDrag = null;
const listeners = new Map<HTMLElement, DropConfig>();

type DropConfig = {
  accept: string;
  canDrop?: (p: DragPayload) => true | string; // string = block reason
  onDrop: (p: DragPayload) => void;
};

const findZone = (x: number, y: number): HTMLElement | null => {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  let cur: HTMLElement | null = el;
  while (cur) {
    if (listeners.has(cur)) return cur;
    cur = cur.parentElement;
  }
  return null;
};

const clearMarks = () => {
  document.querySelectorAll('.drop-target, .drop-blocked').forEach((n) =>
    n.classList.remove('drop-target', 'drop-blocked'),
  );
};

export function useDraggable(
  ref: React.RefObject<HTMLElement>,
  opts: { payload: DragPayload; handle?: React.RefObject<HTMLElement> },
) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleEl = opts.handle?.current || el;

    const onDown = (e: PointerEvent) => {
      if (e.button && e.button !== 0) return;
      const target = e.target as HTMLElement;
      // Don't start drag from form controls inside the card.
      if (target.closest('input, textarea, button, select, [data-no-drag]')) return;
      const rect = el.getBoundingClientRect();
      const ghost = el.cloneNode(true) as HTMLElement;
      ghost.style.position = 'fixed';
      ghost.style.left = `${rect.left}px`;
      ghost.style.top = `${rect.top}px`;
      ghost.style.width = `${rect.width}px`;
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = '9999';
      ghost.style.transform = 'scale(1.03)';
      ghost.style.opacity = '0.9';
      ghost.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
      document.body.appendChild(ghost);
      el.classList.add('dragging');
      active = {
        payload: optsRef.current.payload,
        ghost,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        sourceEl: el,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      };
      try { handleEl.setPointerCapture(e.pointerId); } catch { /* ok */ }
      e.preventDefault();
    };

    const onMove = (e: PointerEvent) => {
      if (!active || active.pointerId !== e.pointerId) return;
      active.ghost.style.left = `${e.clientX - active.offsetX}px`;
      active.ghost.style.top = `${e.clientY - active.offsetY}px`;
      active.ghost.style.display = 'none';
      const zone = findZone(e.clientX, e.clientY);
      active.ghost.style.display = '';
      clearMarks();
      if (zone) {
        const cfg = listeners.get(zone)!;
        if (cfg.accept !== active.payload.kind) return;
        const ok = cfg.canDrop ? cfg.canDrop(active.payload) : true;
        zone.classList.add(ok === true ? 'drop-target' : 'drop-blocked');
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!active || active.pointerId !== e.pointerId) return;
      active.ghost.style.display = 'none';
      const zone = findZone(e.clientX, e.clientY);
      active.ghost.style.display = '';
      if (zone) {
        const cfg = listeners.get(zone)!;
        if (cfg.accept === active.payload.kind) {
          const ok = cfg.canDrop ? cfg.canDrop(active.payload) : true;
          if (ok === true) cfg.onDrop(active.payload);
        }
      }
      cleanup();
    };

    const onCancel = () => { cleanup(); };

    const cleanup = () => {
      if (!active) return;
      active.ghost.remove();
      active.sourceEl.classList.remove('dragging');
      clearMarks();
      active = null;
    };

    handleEl.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      handleEl.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [ref, opts.handle]);
}

export function useDropZone(
  ref: React.RefObject<HTMLElement>,
  cfg: DropConfig,
) {
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    listeners.set(el, {
      accept: cfg.accept,
      canDrop: (p) => (cfgRef.current.canDrop ? cfgRef.current.canDrop(p) : true),
      onDrop: (p) => cfgRef.current.onDrop(p),
    });
    return () => { listeners.delete(el); };
  }, [ref, cfg.accept]);
}
