export type SimNode = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed?: boolean;
};

export type SimEdge = { source: string; target: string };

export type SimConfig = {
  repulsion: number;
  springLength: number;
  springStrength: number;
  gravity: number;
  damping: number;
  maxVelocity: number;
};

export const DEFAULT_CFG: SimConfig = {
  repulsion: 1800,
  springLength: 70,
  springStrength: 0.05,
  gravity: 0.003,
  damping: 0.82,
  maxVelocity: 14,
};

export class ForceSim {
  nodes: SimNode[];
  edges: SimEdge[];
  cfg: SimConfig;
  byId: Map<string, SimNode>;

  constructor(nodes: SimNode[], edges: SimEdge[], cfg?: Partial<SimConfig>) {
    this.nodes = nodes;
    this.edges = edges;
    this.cfg = { ...DEFAULT_CFG, ...(cfg || {}) };
    this.byId = new Map(nodes.map((n) => [n.id, n]));
  }

  step(): number {
    const { nodes, edges, cfg } = this;
    const n = nodes.length;

    // 1. Coulomb repulsion O(N²)
    for (let i = 0; i < n; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < n; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy + 0.01;
        const d = Math.sqrt(d2);
        const f = cfg.repulsion / d2;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // 2. Hookean springs along edges
    for (const e of edges) {
      const a = this.byId.get(e.source);
      const b = this.byId.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      const f = cfg.springStrength * (d - cfg.springLength);
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // 3. Gravity toward origin, 4. velocity cap, 5. damping, 6. integration
    let maxV = 0;
    for (let i = 0; i < n; i++) {
      const node = nodes[i];
      node.vx -= node.x * cfg.gravity;
      node.vy -= node.y * cfg.gravity;

      const vmag = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (vmag > cfg.maxVelocity) {
        const k = cfg.maxVelocity / vmag;
        node.vx *= k;
        node.vy *= k;
      }

      node.vx *= cfg.damping;
      node.vy *= cfg.damping;

      if (node.fixed) {
        node.vx = 0;
        node.vy = 0;
      } else {
        node.x += node.vx;
        node.y += node.vy;
      }

      const m = Math.abs(node.vx) + Math.abs(node.vy);
      if (m > maxV) maxV = m;
    }

    return maxV;
  }
}
