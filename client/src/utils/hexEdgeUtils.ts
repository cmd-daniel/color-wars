import { Hex, Grid } from "honeycomb-grid";
import { centroid, angleDeg, roundedPolygonPath, type Point } from "./geometryUtils";

// Direction name → angle bins (support two common schemes)
const DIR_ANGLES_N = { N: 270, NE: 330, SE: 30, S: 90, SW: 150, NW: 210 } as const; // y axis down
const DIR_ANGLES_E = { E: 0, NE: 60, NW: 120, W: 180, SW: 240, SE: 300 } as const;

// Build hex edges using a given scale for edges (use **1** for perfect joins)
export function hexEdges(hex: Hex, scaleForEdges: number) {
  const corners = hex.corners as Point[];
  const c = centroid(corners);
  const scaled =
    scaleForEdges === 1
      ? corners
      : corners.map((p) => ({
          x: c.x + (p.x - c.x) * scaleForEdges,
          y: c.y + (p.y - c.y) * scaleForEdges,
        }));

  const edges = [];
  for (let i = 0; i < 6; i++) {
    const a = scaled[i];
    const b = scaled[(i + 1) % 6];
    edges.push({ a, b, index: i, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } });
  }
  return edges;
}

export function pickEdgeIndexByDirName(
  hex: Hex,
  name: string,
  scaleForEdges: number,
): number | null {
  const edges = hexEdges(hex, scaleForEdges);
  const c = centroid(edges.map((e) => e.mid));
  const targetA = (DIR_ANGLES_N as any)[name] ?? (DIR_ANGLES_E as any)[name] ?? null;
  if (targetA == null) return null;

  let best = { idx: -1, diff: 9999 };
  for (const e of edges) {
    const a = angleDeg(c.x, c.y, e.mid.x, e.mid.y);
    const diff = Math.min(Math.abs(a - targetA), 360 - Math.abs(a - targetA));
    if (diff < best.diff) best = { idx: e.index, diff };
  }
  return best.diff <= 30 ? best.idx : null;
}

export function collectInnerSegmentsFromSpec(
  grid: Grid<Hex>,
  spec: Record<string, Array<number | string>>,
  scaleForEdges: number, // **use 1 here** to ensure joints meet perfectly
) {
  const segs: Array<{ a: Point; b: Point }> = [];
  grid.forEach((hex: Hex) => {
    const key = `${hex.q},${hex.r}`;
    const wanted = spec[key];
    if (!wanted?.length) return;

    const edges = hexEdges(hex, scaleForEdges);
    for (const w of wanted) {
      let idx: number | null = null;
      if (typeof w === "number") idx = ((w % 6) + 6) % 6;
      else idx = pickEdgeIndexByDirName(hex, w, scaleForEdges);
      if (idx == null) continue;
      const e = edges[idx];
      segs.push({ a: e.a, b: e.b });
    }
  });
  return segs;
}

export function loopFromSegments(segments: Array<{ a: Point; b: Point }>) {
  if (!segments.length) return null;

  // snap endpoints a bit to merge tiny float diffs
  const snap = (p: Point) => ({ x: +p.x.toFixed(4), y: +p.y.toFixed(4) });

  const adj = new Map<string, Point[]>();
  for (const s of segments) {
    const a = snap(s.a),
      b = snap(s.b);
    const ka = `${a.x.toFixed(4)},${a.y.toFixed(4)}`,
      kb = `${b.x.toFixed(4)},${b.y.toFixed(4)}`;
    adj.set(ka, [...(adj.get(ka) ?? []), b]);
    adj.set(kb, [...(adj.get(kb) ?? []), a]);
  }

  const loops: Point[][] = [];
  const visited = new Set<string>();

  for (const [k] of adj.entries()) {
    if (visited.has(k)) continue;

    const [sx, sy] = k.split(",").map(Number);
    let curr: Point = { x: sx, y: sy };
    const startKey = k;
    const loop: Point[] = [curr];
    visited.add(startKey);
    let prevKey = "";

    while (true) {
      const candidates = adj.get(`${curr.x.toFixed(4)},${curr.y.toFixed(4)}`) ?? [];
      let next: Point | null = null;
      for (const n of candidates) {
        const nk = `${n.x.toFixed(4)},${n.y.toFixed(4)}`;
        if (nk !== prevKey) {
          next = n;
          break;
        }
      }
      if (!next) break;
      const nk = `${next.x.toFixed(4)},${next.y.toFixed(4)}`;
      if (nk === startKey) break; // closed
      loop.push(next);
      prevKey = `${curr.x.toFixed(4)},${curr.y.toFixed(4)}`;
      curr = next;
      visited.add(nk);
    }

    if (loop.length > 2) loops.push(loop);
  }

  if (!loops.length) return null;

  // pick smallest-area loop → the inner hole
  const area = (pts: Point[]) => {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i],
        q = pts[(i + 1) % pts.length];
      a += p.x * q.y - q.x * p.y;
    }
    return Math.abs(a / 2);
  };
  loops.sort((a, b) => area(a) - area(b));
  return loops[0];
}

export function buildInnerPathFromSpec(
  grid: Grid<Hex>,
  spec: Record<string, Array<number | string>>,
  opts?: {
    radius?: number;
    edgeScaleForLoop?: number; // default 1 (unscaled) so segments touch
  },
) {
  const radius = opts?.radius ?? 3;
  const edgeScaleForLoop = opts?.edgeScaleForLoop ?? 1;

  const segs = collectInnerSegmentsFromSpec(grid, spec, edgeScaleForLoop);
  const loop = loopFromSegments(segs);
  if (!loop) return { d: "", loop: null };

  const d = roundedPolygonPath(loop, radius, 1);
  return { d, loop };
}
