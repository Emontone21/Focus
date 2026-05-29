import { db } from '@/db/schema';
import { extractWikiLinks, canonical } from '@/lib/wikilinks';

export type NodeType = 'task' | 'project' | 'area' | 'note';

export type GraphNode = {
  id: string;
  type: NodeType;
  refId: number;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed?: boolean;
};

export type GraphEdge = { source: string; target: string };

const seedPos = (i: number) => {
  const angle = (i * 137.508 * Math.PI) / 180;
  const r = 20 + Math.sqrt(i) * 14;
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
};

export async function buildGraph(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const [tasks, projects, areas, notes, links] = await Promise.all([
    db.tasks.toArray(),
    db.projects.toArray(),
    db.areas.toArray(),
    db.notes.toArray(),
    db.links.toArray(),
  ]);

  const nodes: GraphNode[] = [];
  let idx = 0;

  const pushNode = (type: NodeType, refId: number, label: string) => {
    const { x, y } = seedPos(idx++);
    nodes.push({ id: `${type}:${refId}`, type, refId, label, x, y, vx: 0, vy: 0 });
  };

  for (const t of tasks) if (t.id !== undefined) pushNode('task', t.id, t.title);
  for (const p of projects) if (p.id !== undefined) pushNode('project', p.id, p.name);
  for (const a of areas) if (a.id !== undefined) pushNode('area', a.id, a.name);
  for (const n of notes) if (n.id !== undefined) pushNode('note', n.id, n.title);

  const nodeIds = new Set(nodes.map((n) => n.id));
  const noteTitleToId = new Map<string, number>();
  for (const n of notes) {
    if (n.id !== undefined) noteTitleToId.set(canonical(n.title), n.id);
  }

  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const addEdge = (source: string, target: string) => {
    if (source === target) return;
    if (!nodeIds.has(source) || !nodeIds.has(target)) return;
    const key = source < target ? `${source}|${target}` : `${target}|${source}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ source, target });
  };

  const projectIds = new Set(projects.map((p) => p.id).filter((v): v is number => v !== undefined));
  const areaIds = new Set(areas.map((a) => a.id).filter((v): v is number => v !== undefined));

  // 1 & 2: task -> project / area
  for (const t of tasks) {
    if (t.archived || t.id === undefined) continue;
    const tid = `task:${t.id}`;
    if (t.projectId !== undefined && projectIds.has(t.projectId)) {
      addEdge(tid, `project:${t.projectId}`);
    }
    if (t.areaId !== undefined && areaIds.has(t.areaId)) {
      addEdge(tid, `area:${t.areaId}`);
    }
    // 3: wikilinks in task.note
    if (t.note) {
      for (const title of extractWikiLinks(t.note)) {
        const nid = noteTitleToId.get(title);
        if (nid !== undefined) addEdge(tid, `note:${nid}`);
      }
    }
  }

  // 4: project.goal wikilinks
  for (const p of projects) {
    if (p.id === undefined || !p.goal) continue;
    const pid = `project:${p.id}`;
    for (const title of extractWikiLinks(p.goal)) {
      const nid = noteTitleToId.get(title);
      if (nid !== undefined) addEdge(pid, `note:${nid}`);
    }
  }

  // 5: area.description wikilinks
  for (const a of areas) {
    if (a.id === undefined || !a.description) continue;
    const aid = `area:${a.id}`;
    for (const title of extractWikiLinks(a.description)) {
      const nid = noteTitleToId.get(title);
      if (nid !== undefined) addEdge(aid, `note:${nid}`);
    }
  }

  // 6: db.links — note -> note via toTitle map
  for (const link of links) {
    const target = noteTitleToId.get(canonical(link.toTitle));
    if (target === undefined) continue;
    addEdge(`note:${link.fromId}`, `note:${target}`);
  }

  return { nodes, edges };
}
