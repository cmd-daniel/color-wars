// ==========================
// Geometry utilities
// ==========================

export type Point = { x: number; y: number };

export const keyPoint = (p: Point, dp = 4) => `${p.x.toFixed(dp)},${p.y.toFixed(dp)}`;

export function centroid(points: Point[]): Point {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  return { x: cx, y: cy };
}

// Rounded polygon path (matches your HexCell style)
export function roundedPolygonPath(points: Point[], radius: number, scale = 1) {
  const len = points.length;
  if (len < 3) return "";
  const c = centroid(points);
  const scaled = points.map((p) => ({
    x: c.x + (p.x - c.x) * scale,
    y: c.y + (p.y - c.y) * scale,
  }));

  let d = "";
  for (let i = 0; i < len; i++) {
    const prev = scaled[(i - 1 + len) % len];
    const curr = scaled[i];
    const next = scaled[(i + 1) % len];

    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };

    const l1 = Math.hypot(v1.x, v1.y);
    const l2 = Math.hypot(v2.x, v2.y);
    const n1 = { x: v1.x / l1, y: v1.y / l1 };
    const n2 = { x: v2.x / l2, y: v2.y / l2 };

    const r = Math.min(radius, l1 / 2, l2 / 2);
    const p1 = { x: curr.x - n1.x * r, y: curr.y - n1.y * r };
    const p2 = { x: curr.x + n2.x * r, y: curr.y + n2.y * r };

    if (i === 0) d += `M ${p1.x} ${p1.y} `;
    else d += `L ${p1.x} ${p1.y} `;
    d += `Q ${curr.x} ${curr.y} ${p2.x} ${p2.y} `;
  }
  d += "Z";
  return d;
}

export function angleDeg(cx: number, cy: number, px: number, py: number) {
  const a = (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
  return (a + 360) % 360;
}
