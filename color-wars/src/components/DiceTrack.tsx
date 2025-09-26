import { defineHex, Direction, fromCoordinates, Grid, Hex, move, Orientation, type Traverser } from 'honeycomb-grid'
import { useLayoutEffect, useEffect, useState, useRef } from 'react'
import { initializeDemoGame } from '@/stores/gameStoreHelpers'
import HexCell from './HexCell'
import styles from './DiceTrack.module.css'
import PixiViewport from './PixiViewport'
// ==========================
// Config
// ==========================
const GRID_CONFIG = {
  hexDimensions: 24,
  hexOrigin: 'topLeft' as const,
  viewBoxPadding: 10,
  defaultViewBox: '0 0 100 100',
  hexScale: 0.97, // used by HexCell, not needed for mask path
}

// One knob to tune the visual gap between hexes and cutout (world units)
const GAP = GRID_CONFIG.hexDimensions * 0.15

// Toggle if you want to see loop vertices for sanity
const SHOW_DEBUG_POINTS = false

// ==========================
// Your explicit inner edges
// ==========================
const INNER_EDGE_SPEC: Record<string, Array<number | string>> = {
  // top edge (left → right)
  '0,0':   ['SE'],
  '1,-1':  ['S'],
  '2,-1':  ['SW','S','SE'],
  '3,-2':  ['S'],
  '4,-2':  ['SW','S','SE'],
  '5,-3':  ['S'],
  '6,-3':  ['SW','S','SE'],
  '7,-4':  ['S'],
  '8,-4':  ['SW','S','SE'],
  '9,-5':  ['S'],
  '10,-5': ['SW'],

  // right edge (top → bottom)
  '10,-4': ['NW','SW'],
  '10,-3': ['NW','SW'],
  '10,-2': ['NW','SW'],
  '10,-1': ['NW','SW'],
  '10,0':  ['NW','SW'],
  '10,1':  ['NW','SW'],
  '10,2':  ['NW'],          // bottom-right corner

  // bottom edge (right → left)
  '9,3':   ['N'],
  '8,3':   ['NE','N','NW'],
  '7,4':   ['N'],
  '6,4':   ['NE','N','NW'],
  '5,5':   ['N'],
  '4,5':   ['NE','N','NW'],
  '3,6':   ['N'],
  '2,6':   ['NE','N','NW'],
  '1,7':   ['N'],
  '0,7':   ['NE'],          // bottom-left corner

  // left edge (bottom → top)
  '0,6':   ['NE','SE'],
  '0,5':   ['NE','SE'],
  '0,4':   ['NE','SE'],
  '0,3':   ['NE','SE'],
  '0,2':   ['NE','SE'],
  '0,1':   ['NE','SE'],
}

// ==========================
// Geometry helpers
// ==========================
type Pt = { x: number; y: number }

const keyPt = (p: Pt, dp = 4) => `${p.x.toFixed(dp)},${p.y.toFixed(dp)}`

function centroid(points: Pt[]): Pt {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length
  return { x: cx, y: cy }
}

// Rounded polygon path (matches your HexCell style)
function roundedPolygonPath(points: Pt[], radius: number, scale = 1) {
  const len = points.length
  if (len < 3) return ''
  const c = centroid(points)
  const scaled = points.map(p => ({ x: c.x + (p.x - c.x) * scale, y: c.y + (p.y - c.y) * scale }))

  let d = ''
  for (let i = 0; i < len; i++) {
    const prev = scaled[(i - 1 + len) % len]
    const curr = scaled[i]
    const next = scaled[(i + 1) % len]

    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y }
    const v2 = { x: next.x - curr.x, y: next.y - curr.y }

    const l1 = Math.hypot(v1.x, v1.y)
    const l2 = Math.hypot(v2.x, v2.y)
    const n1 = { x: v1.x / l1, y: v1.y / l1 }
    const n2 = { x: v2.x / l2, y: v2.y / l2 }

    const r = Math.min(radius, l1 / 2, l2 / 2)
    const p1 = { x: curr.x - n1.x * r, y: curr.y - n1.y * r }
    const p2 = { x: curr.x + n2.x * r, y: curr.y + n2.y * r }

    if (i === 0) d += `M ${p1.x} ${p1.y} `
    else d += `L ${p1.x} ${p1.y} `
    d += `Q ${curr.x} ${curr.y} ${p2.x} ${p2.y} `
  }
  d += 'Z'
  return d
}

// Build hex edges using a given scale for edges (use **1** for perfect joins)
function hexEdges(hex: Hex, scaleForEdges: number) {
  const corners = hex.corners as Pt[]
  const c = centroid(corners)
  const scaled = scaleForEdges === 1
    ? corners
    : corners.map(p => ({ x: c.x + (p.x - c.x) * scaleForEdges, y: c.y + (p.y - c.y) * scaleForEdges }))

  const edges = []
  for (let i = 0; i < 6; i++) {
    const a = scaled[i]
    const b = scaled[(i + 1) % 6]
    edges.push({ a, b, index: i, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } })
  }
  return edges
}

// Direction name → angle bins (support two common schemes)
const DIR_ANGLES_N = { N: 270, NE: 330, SE: 30, S: 90, SW: 150, NW: 210 } as const // y axis down
const DIR_ANGLES_E = { E: 0, NE: 60, NW: 120, W: 180, SW: 240, SE: 300 } as const

function angleDeg(cx: number, cy: number, px: number, py: number) {
  const a = (Math.atan2(py - cy, px - cx) * 180) / Math.PI
  return (a + 360) % 360
}

function pickEdgeIndexByDirName(hex: Hex, name: string, scaleForEdges: number): number | null {
  const edges = hexEdges(hex, scaleForEdges)
  const c = centroid(edges.map(e => e.mid))
  const targetA = (DIR_ANGLES_N as any)[name] ?? (DIR_ANGLES_E as any)[name] ?? null
  if (targetA == null) return null

  let best = { idx: -1, diff: 9999 }
  for (const e of edges) {
    const a = angleDeg(c.x, c.y, e.mid.x, e.mid.y)
    const diff = Math.min(Math.abs(a - targetA), 360 - Math.abs(a - targetA))
    if (diff < best.diff) best = { idx: e.index, diff }
  }
  return best.diff <= 30 ? best.idx : null
}

function collectInnerSegmentsFromSpec(
  grid: Grid<Hex>,
  spec: Record<string, Array<number | string>>,
  scaleForEdges: number // **use 1 here** to ensure joints meet perfectly
) {
  const segs: Array<{ a: Pt; b: Pt }> = []
  grid.forEach((hex: Hex) => {
    const key = `${hex.q},${hex.r}`
    const wanted = spec[key]
    if (!wanted?.length) return

    const edges = hexEdges(hex, scaleForEdges)
    for (const w of wanted) {
      let idx: number | null = null
      if (typeof w === 'number') idx = ((w % 6) + 6) % 6
      else idx = pickEdgeIndexByDirName(hex, w, scaleForEdges)
      if (idx == null) continue
      const e = edges[idx]
      segs.push({ a: e.a, b: e.b })
    }
  })
  return segs
}

function loopFromSegments(segments: Array<{ a: Pt; b: Pt }>) {
  if (!segments.length) return null

  // snap endpoints a bit to merge tiny float diffs
  const snap = (p: Pt) => ({ x: +p.x.toFixed(4), y: +p.y.toFixed(4) })

  const adj = new Map<string, Pt[]>()
  for (const s of segments) {
    const a = snap(s.a), b = snap(s.b)
    const ka = keyPt(a), kb = keyPt(b)
    adj.set(ka, [...(adj.get(ka) ?? []), b])
    adj.set(kb, [...(adj.get(kb) ?? []), a])
  }

  const loops: Pt[][] = []
  const visited = new Set<string>()

  for (const [k] of adj.entries()) {
    if (visited.has(k)) continue

    const [sx, sy] = k.split(',').map(Number)
    let curr: Pt = { x: sx, y: sy }
    const startKey = k
    const loop: Pt[] = [curr]
    visited.add(startKey)
    let prevKey = ''

    while (true) {
      const candidates = adj.get(keyPt(curr)) ?? []
      let next: Pt | null = null
      for (const n of candidates) {
        const nk = keyPt(n)
        if (nk !== prevKey) { next = n; break }
      }
      if (!next) break
      const nk = keyPt(next)
      if (nk === startKey) break // closed
      loop.push(next)
      prevKey = keyPt(curr)
      curr = next
      visited.add(nk)
    }

    if (loop.length > 2) loops.push(loop)
  }

  if (!loops.length) return null

  // pick smallest-area loop → the inner hole
  const area = (pts: Pt[]) => {
    let a = 0
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length]
      a += p.x * q.y - q.x * p.y
    }
    return Math.abs(a / 2)
  }
  loops.sort((a, b) => area(a) - area(b))
  return loops[0]
}

function buildInnerPathFromSpec(
  grid: Grid<Hex>,
  spec: Record<string, Array<number | string>>,
  opts?: {
    radius?: number
    edgeScaleForLoop?: number // default 1 (unscaled) so segments touch
  }
) {
  const radius = opts?.radius ?? 3
  const edgeScaleForLoop = opts?.edgeScaleForLoop ?? 1

  const segs = collectInnerSegmentsFromSpec(grid, spec, edgeScaleForLoop)
  const loop = loopFromSegments(segs)
  if (!loop) return { d: '', loop: null }

  const d = roundedPolygonPath(loop, radius, 1)
  return { d, loop }
}

// ==========================
// Component
// ==========================
const HollowGrid = () => {
  const [gridData, setGridData] = useState<{ hexes: Hex[]; viewBox: string; grid: Grid<Hex> | null }>({
    hexes: [],
    viewBox: GRID_CONFIG.defaultViewBox,
    grid: null,
  })
  const pixiContainerRef = useRef<HTMLDivElement>(null)

  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    initializeDemoGame()
  }, [])

  useLayoutEffect(() => {
    const Hexagon = defineHex({
      dimensions: GRID_CONFIG.hexDimensions,
      origin: GRID_CONFIG.hexOrigin,
      orientation: Orientation.FLAT,
    })

    // Build your hollow rectangular ring
    const hollowPath: Array<Traverser<Hex>> = []
    hollowPath.push(fromCoordinates({ q: 0, r: 0, s: 0 }))
    for (let i = 0; i < 5; i++) { hollowPath.push(move(Direction.NE)); hollowPath.push(move(Direction.SE)) }
    for (let i = 0; i < 7; i++) { hollowPath.push(move(Direction.S)) }
    for (let i = 0; i < 5; i++) { hollowPath.push(move(Direction.SW)); hollowPath.push(move(Direction.NW)) }
    for (let i = 0; i < 7; i++) { hollowPath.push(move(Direction.N)) }

    const grid = new Grid(Hexagon, hollowPath)

    // Compute viewBox
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    grid.forEach((hex: Hex) => {
      (hex.corners as Pt[]).forEach(({ x, y }) => {
        minX = Math.min(minX, x); minY = Math.min(minY, y)
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
      })
    })
    const pad = GRID_CONFIG.viewBoxPadding
    const viewBox = `${minX - pad} ${minY - pad} ${(maxX - minX) + 2 * pad} ${(maxY - minY) + 2 * pad}`

    setGridData({ hexes: Array.from(grid), viewBox, grid })
  }, [])

  const built = gridData.grid
    ? buildInnerPathFromSpec(gridData.grid, INNER_EDGE_SPEC, {
        radius: 3,
        edgeScaleForLoop: 1, // **important**: unscaled edges so joints meet perfectly
      })
    : { d: '', loop: null }

  return (
    <div className={`${styles.container} ${styles.debug}`}>
        <div 
                ref={pixiContainerRef}
                className={styles.pixiContainer}
            >
                {/* PixiJS viewport component */}
                {<PixiViewport containerRef={pixiContainerRef} />}
            </div>
      <svg
        ref={svgRef}
        className={styles.gridSvg}
        viewBox={gridData.viewBox}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
      >
        {/* Mask with stroke-based padding */}
        {gridData.grid && (
          <defs>
            <mask id="gridMask" maskUnits="userSpaceOnUse">
              <rect x={-9999} y={-9999} width={20000} height={20000} fill="white" />
              {/* base hole */}
              <path d={built.d} fill="black" />
              {/* extra padding via stroke (easiest to maintain) */}
              {/* <path
                d={built.d}
                fill="black"
                stroke="white"
                strokeWidth={GAP * 2}
                strokeLinejoin="round"
                strokeLinecap="round"
              /> */}
            </mask>
          </defs>
        )}

        {/* Dark overlay that doesn't block interactions */}
        {gridData.grid && (
          <rect
            x={-9999}
            y={-9999}
            width={20000}
            height={20000}
            fill="var(--background)"
            mask="url(#gridMask)"
            pointerEvents="none"
          />
        )}

        {/* Hex ring */}
        {gridData.hexes.map((hex) => (
          <HexCell key={`${hex.q},${hex.r}`} hex={hex} />
        ))}

        {/* Optional debug: see loop vertices */}
        {SHOW_DEBUG_POINTS && built.loop?.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={0.9} fill="#0ff" />
        ))}
      </svg>
    </div>
  )
}

export default HollowGrid
