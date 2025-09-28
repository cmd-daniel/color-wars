import type { HexGridConfig, PositionedHex } from '@/types/map'

const SQRT_3 = Math.sqrt(3)

export const axialToPixel = (q: number, r: number, grid: Pick<HexGridConfig, 'orientation' | 'hexSize'>) => {
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

export const hexCorners = (center: { x: number; y: number }, size: number, orientation: HexGridConfig['orientation']) => {
  const points: { x: number; y: number }[] = []
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

export const buildPositionedHex = (
  q: number,
  r: number,
  s: number,
  territoryId: PositionedHex['territoryId'],
  grid: HexGridConfig,
  chunkSize: number,
): PositionedHex => {
  const center = axialToPixel(q, r, grid)
  const corners = hexCorners(center, grid.hexSize, grid.orientation)
  const chunkX = Math.floor(center.x / chunkSize)
  const chunkY = Math.floor(center.y / chunkSize)
  const chunkKey = `${chunkX},${chunkY}`

  return {
    id: `${q},${r}`,
    q,
    r,
    s,
    territoryId,
    center,
    corners,
    chunkKey,
  }
}
