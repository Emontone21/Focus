import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Minus, CircleDot, X } from 'lucide-react';
import { db } from '@/db/schema';
import { useUI, type TabKey } from '@/store/useUI';
import { buildGraph, type GraphNode, type NodeType } from './buildGraph';
import { ForceSim } from './forceSim';

const COLORS: Record<NodeType, string> = {
  task: '#0a84ff',
  project: '#bf5af2',
  area: '#30d158',
  note: '#ffd60a',
};
const RADII: Record<NodeType, number> = { task: 4.5, project: 7, area: 6, note: 5 };
const TYPE_LABEL: Record<NodeType, string> = {
  task: 'Tarea',
  project: 'Proyecto',
  area: 'Área',
  note: 'Nota',
};
const TYPE_TAB: Record<NodeType, TabKey> = {
  task: 'board',
  project: 'organize',
  area: 'organize',
  note: 'notes',
};
const TAB_DISPLAY: Record<TabKey, string> = {
  inbox: 'Bandeja',
  organize: 'Organizar',
  board: 'Tablero',
  notes: 'Notas',
  today: 'Hoy',
  map: 'Mapa',
};

type PointerState = {
  startX: number;
  startY: number;
  curX: number;
  curY: number;
  startT: number;
  mode: 'pan' | 'drag';
  nodeId: string | null;
  startPanX: number;
  startPanY: number;
  startNodeX: number;
  startNodeY: number;
};

type PinchState = {
  initialDist: number;
  initialMidX: number;
  initialMidY: number;
  initialZoom: number;
  initialPanX: number;
  initialPanY: number;
};

const truncate = (s: string) => (s.length > 28 ? s.slice(0, 27) + '…' : s);

export function GraphView() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);
  const projects = useLiveQuery(() => db.projects.toArray(), []);
  const areas = useLiveQuery(() => db.areas.toArray(), []);
  const notes = useLiveQuery(() => db.notes.toArray(), []);
  const linksLQ = useLiveQuery(() => db.links.toArray(), []);

  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<ForceSim | null>(null);
  const rafRef = useRef<number | null>(null);
  const settledFramesRef = useRef(0);
  const pointersRef = useRef<Map<number, PointerState>>(new Map());
  const pinchRef = useRef<PinchState | null>(null);

  const [, setTick] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Record<NodeType, boolean>>({
    task: true,
    project: true,
    area: true,
    note: true,
  });
  const setTab = useUI((s) => s.setTab);

  const reheat = useCallback(() => {
    settledFramesRef.current = 0;
    if (rafRef.current != null) return;
    const tick = () => {
      const sim = simRef.current;
      if (!sim) {
        rafRef.current = null;
        return;
      }
      const maxV = sim.step();
      if (maxV < 0.05) {
        settledFramesRef.current++;
        if (settledFramesRef.current >= 30) {
          rafRef.current = null;
          setTick((t) => t + 1);
          return;
        }
      } else {
        settledFramesRef.current = 0;
      }
      setTick((t) => t + 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // ResizeObserver on container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Build / rebuild graph when live queries change
  useEffect(() => {
    if (!tasks || !projects || !areas || !notes || !linksLQ) return;
    let cancelled = false;
    (async () => {
      const { nodes, edges } = await buildGraph();
      if (cancelled) return;
      const prevById = simRef.current?.byId;
      if (prevById) {
        for (const n of nodes) {
          const p = prevById.get(n.id);
          if (p) {
            n.x = p.x;
            n.y = p.y;
            n.vx = p.vx;
            n.vy = p.vy;
          }
        }
      }
      simRef.current = new ForceSim(nodes, edges);
      reheat();
      setTick((t) => t + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [tasks, projects, areas, notes, linksLQ, reheat]);

  // Cleanup rAF on unmount
  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    },
    [],
  );

  const sim = simRef.current;
  const nodes = (sim?.nodes ?? []) as unknown as GraphNode[];
  const edges = sim?.edges ?? [];
  const getNode = (id: string): GraphNode | null =>
    (sim?.byId.get(id) as unknown as GraphNode | undefined) ?? null;

  const activeId = hovered ?? selected;
  let neighbors: Set<string> | null = null;
  if (activeId) {
    neighbors = new Set<string>([activeId]);
    for (const e of edges) {
      if (e.source === activeId) neighbors.add(e.target);
      else if (e.target === activeId) neighbors.add(e.source);
    }
  }

  const degreeMap = new Map<string, number>();
  for (const e of edges) {
    degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
  }

  const W = size.w;
  const H = size.h;

  const findNodeFromTarget = (target: EventTarget | null): GraphNode | null => {
    if (!(target instanceof Element)) return null;
    const el = target.closest('[data-nid]');
    if (!el) return null;
    const id = el.getAttribute('data-nid');
    if (!id) return null;
    return getNode(id);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const node = findNodeFromTarget(e.target);
    const st: PointerState = {
      startX: e.clientX,
      startY: e.clientY,
      curX: e.clientX,
      curY: e.clientY,
      startT: Date.now(),
      mode: node ? 'drag' : 'pan',
      nodeId: node?.id ?? null,
      startPanX: pan.x,
      startPanY: pan.y,
      startNodeX: node?.x ?? 0,
      startNodeY: node?.y ?? 0,
    };
    pointersRef.current.set(e.pointerId, st);
    if (node) {
      node.fixed = true;
      node.vx = 0;
      node.vy = 0;
    }
    if (pointersRef.current.size === 2 && containerRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const rect = containerRef.current.getBoundingClientRect();
      const dx = pts[1].curX - pts[0].curX;
      const dy = pts[1].curY - pts[0].curY;
      pinchRef.current = {
        initialDist: Math.hypot(dx, dy) || 1,
        initialMidX: (pts[0].curX + pts[1].curX) / 2 - rect.left,
        initialMidY: (pts[0].curY + pts[1].curY) / 2 - rect.top,
        initialZoom: zoom,
        initialPanX: pan.x,
        initialPanY: pan.y,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const st = pointersRef.current.get(e.pointerId);
    if (!st) {
      // Desktop hover
      const node = findNodeFromTarget(e.target);
      setHovered((h) => (h === (node?.id ?? null) ? h : node?.id ?? null));
      return;
    }
    st.curX = e.clientX;
    st.curY = e.clientY;

    if (pointersRef.current.size >= 2 && pinchRef.current && containerRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const rect = containerRef.current.getBoundingClientRect();
      const dx = pts[1].curX - pts[0].curX;
      const dy = pts[1].curY - pts[0].curY;
      const dist = Math.hypot(dx, dy);
      const midX = (pts[0].curX + pts[1].curX) / 2 - rect.left;
      const midY = (pts[0].curY + pts[1].curY) / 2 - rect.top;
      const p = pinchRef.current;
      const ratio = dist / p.initialDist;
      const newZoom = Math.max(0.2, Math.min(4, p.initialZoom * ratio));
      const worldX = (p.initialMidX - W / 2 - p.initialPanX) / p.initialZoom;
      const worldY = (p.initialMidY - H / 2 - p.initialPanY) / p.initialZoom;
      const newPanX = midX - W / 2 - worldX * newZoom;
      const newPanY = midY - H / 2 - worldY * newZoom;
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
      return;
    }

    if (st.mode === 'drag' && st.nodeId) {
      const node = getNode(st.nodeId);
      if (node) {
        const dxScreen = st.curX - st.startX;
        const dyScreen = st.curY - st.startY;
        node.x = st.startNodeX + dxScreen / zoom;
        node.y = st.startNodeY + dyScreen / zoom;
        node.vx = 0;
        node.vy = 0;
        reheat();
      }
    } else if (st.mode === 'pan') {
      setPan({
        x: st.startPanX + (st.curX - st.startX),
        y: st.startPanY + (st.curY - st.startY),
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const st = pointersRef.current.get(e.pointerId);
    if (!st) return;
    if (st.nodeId) {
      const node = getNode(st.nodeId);
      if (node) node.fixed = false;
      reheat();
    }
    const dist = Math.hypot(st.curX - st.startX, st.curY - st.startY);
    const dt = Date.now() - st.startT;
    if (dist < 5 && dt < 400) {
      setSelected(st.nodeId);
    }
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.002);
    const newZoom = Math.max(0.2, Math.min(4, zoom * factor));
    const worldX = (cx - W / 2 - pan.x) / zoom;
    const worldY = (cy - H / 2 - pan.y) / zoom;
    const newPanX = cx - W / 2 - worldX * newZoom;
    const newPanY = cy - H / 2 - worldY * newZoom;
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    reheat();
  };

  const toggleFilter = (k: NodeType) =>
    setFilter((f) => ({ ...f, [k]: !f[k] }));

  const visibleNodes = nodes.filter((n) => filter[n.type]);
  const visibleEdges = edges.filter((e) => {
    const a = getNode(e.source);
    const b = getNode(e.target);
    return !!a && !!b && filter[a.type] && filter[b.type];
  });

  const selectedRef = selected ? getNode(selected) : null;
  const selectedDegree = selectedRef ? degreeMap.get(selectedRef.id) ?? 0 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-graph overflow-hidden"
    >
      {W > 0 && H > 0 && (
        <svg
          width={W}
          height={H}
          className="touch-none select-none block"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          <g
            transform={`translate(${W / 2 + pan.x} ${H / 2 + pan.y}) scale(${zoom})`}
          >
            {visibleEdges.map((e, i) => {
              const a = getNode(e.source);
              const b = getNode(e.target);
              if (!a || !b) return null;
              const incident =
                activeId !== null &&
                (e.source === activeId || e.target === activeId);
              const dim = activeId !== null && !incident;
              return (
                <line
                  key={`${e.source}|${e.target}|${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--graph-edge)"
                  strokeWidth={1 / zoom}
                  opacity={dim ? 0.08 : 0.35}
                />
              );
            })}
            {visibleNodes.map((n) => {
              const isActive = n.id === activeId;
              const deg = degreeMap.get(n.id) ?? 0;
              const r = RADII[n.type] + Math.min(4, deg * 0.4);
              const dim =
                activeId !== null && neighbors !== null && !neighbors.has(n.id);
              return (
                <g
                  key={n.id}
                  data-nid={n.id}
                  opacity={dim ? 0.15 : 1}
                  style={{ cursor: 'pointer' }}
                >
                  {isActive && (
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={r + 4}
                      fill={COLORS[n.type]}
                      opacity={0.25}
                    />
                  )}
                  <circle cx={n.x} cy={n.y} r={r} fill={COLORS[n.type]} />
                  {(zoom > 1.4 || isActive) && (
                    <text
                      x={n.x}
                      y={n.y - r - 3}
                      textAnchor="middle"
                      fontSize={9 / zoom}
                      fill="var(--graph-label)"
                      style={{ pointerEvents: 'none' }}
                    >
                      {truncate(n.label)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {/* Filter chips */}
      <div className="absolute top-2 right-2 flex gap-1.5 z-10">
        {(Object.keys(COLORS) as NodeType[]).map((k) => {
          const active = filter[k];
          return (
            <button
              key={k}
              onClick={() => toggleFilter(k)}
              className="text-[10px] font-semibold px-2 py-1 rounded-full border backdrop-blur"
              style={{
                background: active ? `${COLORS[k]}55` : 'transparent',
                borderColor: active ? COLORS[k] : 'var(--graph-edge)',
                color: active ? COLORS[k] : 'var(--graph-edge)',
              }}
            >
              {TYPE_LABEL[k]}
            </button>
          );
        })}
      </div>

      {/* Counter */}
      <div className="absolute bottom-2 left-2 text-[10px] text-ios-muted bg-ios-card/70 dark:bg-ios-cardDark/70 backdrop-blur rounded-full px-2 py-1 z-10">
        {nodes.length} nodos · {edges.length} enlaces
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1 z-10">
        <button
          onClick={() => setZoom((z) => Math.min(4, z * 1.2))}
          className="w-8 h-8 rounded-full bg-ios-card dark:bg-ios-cardDark border border-ios-sep/40 dark:border-ios-sepDark flex items-center justify-center text-ios-muted"
          aria-label="Zoom in"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.2, z / 1.2))}
          className="w-8 h-8 rounded-full bg-ios-card dark:bg-ios-cardDark border border-ios-sep/40 dark:border-ios-sepDark flex items-center justify-center text-ios-muted"
          aria-label="Zoom out"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={resetView}
          className="w-8 h-8 rounded-full bg-ios-card dark:bg-ios-cardDark border border-ios-sep/40 dark:border-ios-sepDark flex items-center justify-center text-ios-muted"
          aria-label="Reset view"
        >
          <CircleDot size={14} />
        </button>
      </div>

      {/* Selection panel */}
      {selectedRef && (
        <div className="absolute left-2 right-2 bottom-12 z-10 rounded-xl bg-ios-card dark:bg-ios-cardDark border border-ios-sep/40 dark:border-ios-sepDark p-3 shadow-ios">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div
                className="text-[10px] uppercase font-semibold"
                style={{ color: COLORS[selectedRef.type] }}
              >
                {TYPE_LABEL[selectedRef.type]}
              </div>
              <div className="text-sm font-semibold truncate">
                {selectedRef.label}
              </div>
              <div className="text-[11px] text-ios-muted">
                {selectedDegree} enlaces
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-ios-muted shrink-0"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => {
                setTab(TYPE_TAB[selectedRef.type]);
                setSelected(null);
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-ios-accent text-white"
            >
              Ir a {TAB_DISPLAY[TYPE_TAB[selectedRef.type]]}
            </button>
            <button
              onClick={() => setSelected(null)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-ios-muted/15 text-ios-muted"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
