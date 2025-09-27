import type { HexGridConfig } from '../schema/mapConfig'

const SQRT_3 = Math.sqrt(3)

export interface HexPoint {
  x: number
  y: number
}

export const axialToPixel = (
  q: number,
  r: number,
  grid: Pick<HexGridConfig, 'orientation' | 'hexSize'>,
): HexPoint => {
  const size = grid.hexSize

  if (grid.orientation === 'pointy') {
    const x = size * (SQRT_3 * q + (SQRT_3 / 2) * r)
    const y = size * ((3 / 2) * r)
    return { x, y }
  }

  const x = size * ((3 / 2) * q)
  const y = size * (SQRT_3 * r + (SQRT_3 / 2) * q)
  return { x, y }
}

export const pixelToAxial = (
  x: number,
  y: number,
  grid: Pick<HexGridConfig, 'orientation' | 'hexSize'>,
): { q: number; r: number; s: number } => {
  const size = grid.hexSize

  let q: number
  let r: number

  if (grid.orientation === 'pointy') {
    q = ((SQRT_3 / 3) * x - (1 / 3) * y) / size
    r = ((2 / 3) * y) / size
  } else {
    q = ((2 / 3) * x) / size
    r = ((-1 / 3) * x + (SQRT_3 / 3) * y) / size
  }

  const rounded = axialRound(q, r)
  return rounded
}

export const axialRound = (q: number, r: number): { q: number; r: number; s: number } => {
  let s = -q - r

  let rq = Math.round(q)
  let rr = Math.round(r)
  let rs = Math.round(s)

  const qDiff = Math.abs(rq - q)
  const rDiff = Math.abs(rr - r)
  const sDiff = Math.abs(rs - s)

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs
  } else if (rDiff > sDiff) {
    rr = -rq - rs
  } else {
    rs = -rq - rr
  }

  return { q: rq, r: rr, s: rs }
}

export const hexPolygonPoints = (
  center: HexPoint,
  size: number,
  orientation: HexGridConfig['orientation'],
): HexPoint[] => {
  const points: HexPoint[] = []
  const angleOffset = orientation === 'pointy' ? Math.PI / 6 : 0

  for (let i = 0; i < 6; i += 1) {
    const angle = angleOffset + (i * Math.PI) / 3
    points.push({
      x: center.x + size * Math.cos(angle),
      y: center.y + size * Math.sin(angle),
    })
  }

  return points
}

export const pointsToSvgPath = (points: HexPoint[]): string => {
  if (!points.length) {
    return ''
  }
  const [first, ...rest] = points
  const commands = rest
    .map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
  return `M ${first.x.toFixed(2)} ${first.y.toFixed(2)} ${commands} Z`
}
