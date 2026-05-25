// Parse [[wiki style]] links out of a markdown body.
// Returns a list of titles (in lowercase for canonical matching) and a
// helper that splits the body into segments so the renderer can interpolate.

export const WIKILINK_RE = /\[\[([^\]\n]+)\]\]/g;

export function extractWikiLinks(body: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  WIKILINK_RE.lastIndex = 0;
  while ((m = WIKILINK_RE.exec(body)) !== null) {
    const t = m[1].trim();
    if (t) out.add(t.toLowerCase());
  }
  return [...out];
}

export type Segment =
  | { type: 'text'; text: string }
  | { type: 'wikilink'; title: string };

export function splitWikiLinks(body: string): Segment[] {
  const segs: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  WIKILINK_RE.lastIndex = 0;
  while ((m = WIKILINK_RE.exec(body)) !== null) {
    if (m.index > last) segs.push({ type: 'text', text: body.slice(last, m.index) });
    segs.push({ type: 'wikilink', title: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < body.length) segs.push({ type: 'text', text: body.slice(last) });
  return segs;
}

export const canonical = (title: string) => title.trim().toLowerCase();
