import type { PositionedHex, TerritoryDefinition, TerritoryId } from '@/types/map'

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface TerritoryRenderInfo {
  id: TerritoryId
  name: string
  displayColor: string
  outline: Point[][]
  primaryLoop: Point[]
  bounds: Bounds
  labelPosition: Point
  labelFontSize: number
  labelMaxWidth: number
  labelLineHeight: number
  labelMaxHeight: number
  hexCount: number
}

const pointKey = (point: Point) => `${point.x.toFixed(5)},${point.y.toFixed(5)}`

const makeEdgeKey = (a: Point, b: Point) => {
  const keyA = pointKey(a)
  const keyB = pointKey(b)
  return keyA < keyB ? `${keyA}|${keyB}` : `${keyB}|${keyA}`
}

const polygonArea = (points: Point[]) => {
  if (points.length < 3) return 0

  let area = 0
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    area += current.x * next.y - next.x * current.y
  }

  return Math.abs(area / 2)
}

const buildTerritoryOutline = (hexes: PositionedHex[]): Point[][] => {
  type Edge = { start: Point; end: Point }

  const edgeMap = new Map<string, Edge>()

  hexes.forEach((hex) => {
    const { corners } = hex
    for (let index = 0; index < corners.length; index += 1) {
      const start = corners[index]
      const end = corners[(index + 1) % corners.length]
      const edgeKey = makeEdgeKey(start, end)

      if (edgeMap.has(edgeKey)) {
        edgeMap.delete(edgeKey)
      } else {
        edgeMap.set(edgeKey, { start, end })
      }
    }
  })

  const unusedEdges = new Set(edgeMap.values())
  const outlines: Point[][] = []

  const getKey = pointKey

  while (unusedEdges.size > 0) {
    const iterator = unusedEdges.values()
    const firstEdge = iterator.next().value

    if (!firstEdge) break

    unusedEdges.delete(firstEdge)

    const loop: Point[] = [firstEdge.start, firstEdge.end]
    const startKey = getKey(firstEdge.start)
    let currentKey = getKey(firstEdge.end)

    let guard = 0
    const guardLimit = unusedEdges.size * 3 + 12

    while (currentKey !== startKey && unusedEdges.size > 0) {
      guard += 1
      if (guard > guardLimit) {
        break
      }

      let foundEdge: Edge | null = null
      let reverse = false

      for (const edge of unusedEdges) {
        const startMatch = getKey(edge.start) === currentKey
        const endMatch = getKey(edge.end) === currentKey

        if (startMatch || endMatch) {
          foundEdge = edge
          reverse = endMatch
          break
        }
      }

      if (!foundEdge) {
        break
      }

      unusedEdges.delete(foundEdge)

      if (reverse) {
        loop.push(foundEdge.start)
        currentKey = getKey(foundEdge.start)
      } else {
        loop.push(foundEdge.end)
        currentKey = getKey(foundEdge.end)
      }
    }

    if (loop.length > 1 && getKey(loop[loop.length - 1]) === startKey) {
      loop.pop()
    }

    if (loop.length > 2) {
      outlines.push(loop)
    }
  }

  return outlines
}

const computeBounds = (hexes: PositionedHex[]): Bounds => {
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  hexes.forEach((hex) => {
    hex.corners.forEach(({ x, y }) => {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    })
  })

  return {
    minX,
    maxX,
    minY,
    maxY,
  }
}

const computeLabelPosition = (hexes: PositionedHex[]): Point => {
  const total = hexes.length
  if (total === 0) return { x: 0, y: 0 }

  const sum = hexes.reduce(
    (acc, hex) => {
      acc.x += hex.center.x
      acc.y += hex.center.y
      return acc
    },
    { x: 0, y: 0 },
  )

  return {
    x: sum.x / total,
    y: sum.y / total,
  }
}

const EPSILON = 1e-6

const rayDistanceToPolygon = (origin: Point, direction: Point, polygon: Point[]): number => {
  let minDistance = Number.POSITIVE_INFINITY

  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index]
    const end = polygon[(index + 1) % polygon.length]
    const edge = { x: end.x - start.x, y: end.y - start.y }
    const denominator = direction.x * edge.y - direction.y * edge.x

    if (Math.abs(denominator) < EPSILON) {
      continue
    }

    const diff = { x: start.x - origin.x, y: start.y - origin.y }
    const u = (diff.x * edge.y - diff.y * edge.x) / denominator
    const t = (diff.x * direction.y - diff.y * direction.x) / denominator

    if (u <= EPSILON) continue
    if (t < -EPSILON || t > 1 + EPSILON) continue

    if (u < minDistance) {
      minDistance = u
    }
  }

  return minDistance
}

const computeInteriorBox = (polygon: Point[], center: Point, padding: number) => {
  if (!polygon || polygon.length < 3) return null

  const right = rayDistanceToPolygon(center, { x: 1, y: 0 }, polygon)
  const left = rayDistanceToPolygon(center, { x: -1, y: 0 }, polygon)
  const up = rayDistanceToPolygon(center, { x: 0, y: -1 }, polygon)
  const down = rayDistanceToPolygon(center, { x: 0, y: 1 }, polygon)

  if (![right, left, up, down].every((distance) => Number.isFinite(distance) && distance > EPSILON)) {
    return null
  }

  const width = Math.max(Math.min(left, right) * 2 - padding * 2, 0)
  const height = Math.max(Math.min(up, down) * 2 - padding * 2, 0)

  if (width <= 0 || height <= 0) {
    return null
  }

  return { width, height }
}

const determineLabelPosition = (hexes: PositionedHex[], loop: Point[]): Point => {
  const centroid = (() => {
    if (loop.length < 3) return null

    let area = 0
    let cx = 0
    let cy = 0

    for (let index = 0; index < loop.length; index += 1) {
      const current = loop[index]
      const next = loop[(index + 1) % loop.length]
      const cross = current.x * next.y - next.x * current.y
      area += cross
      cx += (current.x + next.x) * cross
      cy += (current.y + next.y) * cross
    }

    area *= 0.5
    if (Math.abs(area) < EPSILON) return null

    return { x: cx / (6 * area), y: cy / (6 * area) }
  })()

  if (centroid) {
    return centroid
  }

  return computeLabelPosition(hexes)
}

const computeLabelMetrics = (
  name: string,
  bounds: Bounds,
  hexCount: number,
  hexSize: number,
  polygon: Point[],
  center: Point,
) => {
  const basePadding = Math.max(hexSize * 0.2, 2)
  const polygonAreaValue = polygonArea(polygon)
  const approximateWidth = Math.max(bounds.maxX - bounds.minX, Math.sqrt(Math.max(polygonAreaValue, 1)))
  const approximateHeight = Math.max(bounds.maxY - bounds.minY, Math.sqrt(Math.max(polygonAreaValue, 1)))
  const fallbackWidth = Math.max(approximateWidth - basePadding * 2, hexSize * 0.75)
  const fallbackHeight = Math.max(approximateHeight - basePadding * 2, hexSize * 0.75)

  const interior = computeInteriorBox(polygon, center, basePadding)

  const interiorWidth = interior ? Math.max(interior.width, fallbackWidth * 0.6) : null
  const interiorHeight = interior ? Math.max(interior.height, fallbackHeight * 0.6) : null

  const usableWidth = Math.max(interiorWidth ?? fallbackWidth, hexSize * 0.75)
  const usableHeight = Math.max(interiorHeight ?? fallbackHeight, hexSize * 0.75)

  const sanitized = name.trim() || '-'
  const words = sanitized.split(/\s+/)
  const longestWord = words.reduce((max, word) => Math.max(max, word.length), 0) || sanitized.length || 1
  const charCount = sanitized.replace(/\s+/g, '').length || 1

  const charWidthFactor = 0.58
  const lineHeightFactor = 1.18

  const widthBased = (usableWidth / Math.max(longestWord, 1)) * 0.95
  const areaBased = Math.sqrt((usableWidth * usableHeight) / charCount) * 0.82
  const maxFont = Math.min(usableWidth, usableHeight) * 0.92

  let fontSize = Math.min(widthBased, areaBased, maxFont)
  let iterations = 0

  while (iterations < 3) {
    const charsPerLine = Math.max(longestWord, Math.floor(usableWidth / (Math.max(fontSize, EPSILON) * charWidthFactor)) || 1)
    const lineCount = Math.max(1, Math.ceil(charCount / charsPerLine))
    const heightLimited = usableHeight / (lineCount * lineHeightFactor)
    const newFontSize = Math.min(fontSize, heightLimited)

    if (Math.abs(newFontSize - fontSize) <= 0.5) {
      fontSize = newFontSize
      break
    }

    fontSize = newFontSize
    iterations += 1
  }

  const sizeFactor = hexCount <= 2 ? 0.28 : hexCount <= 4 ? 0.22 : hexCount <= 8 ? 0.18 : 0.16
  const minFont = Math.max(Math.min(usableWidth, usableHeight) * sizeFactor, hexSize * 0.2, 4.5)
  fontSize = Math.max(Math.min(fontSize, maxFont), minFont)

  const lineHeight = fontSize * lineHeightFactor

  return {
    fontSize,
    maxWidth: usableWidth,
    maxHeight: usableHeight,
    lineHeight,
  }
}

export const computeTerritoryRenderInfo = (
  territories: TerritoryDefinition[],
  positionedHexes: PositionedHex[],
  hexSize: number,
): TerritoryRenderInfo[] => {
  const hexesByTerritory = new Map<TerritoryId, PositionedHex[]>()

  positionedHexes.forEach((hex) => {
    if (!hex.territoryId) return
    if (!hexesByTerritory.has(hex.territoryId)) {
      hexesByTerritory.set(hex.territoryId, [])
    }
    hexesByTerritory.get(hex.territoryId)!.push(hex)
  })

  return territories
    .map((territory) => {
      const territoryHexes = hexesByTerritory.get(territory.id)
      if (!territoryHexes || territoryHexes.length === 0) return null

      const bounds = computeBounds(territoryHexes)
      const outline = buildTerritoryOutline(territoryHexes)
      const primaryLoop = outline.reduce<Point[]>((largest, loop) => {
        if (largest.length === 0) return loop
        return polygonArea(loop) > polygonArea(largest) ? loop : largest
      }, [])
      const labelPosition = determineLabelPosition(territoryHexes, primaryLoop)
      const labelMetrics = computeLabelMetrics(
        territory.name,
        bounds,
        territoryHexes.length,
        hexSize,
        primaryLoop,
        labelPosition,
      )

      return {
        id: territory.id,
        name: territory.name,
        displayColor: territory.displayColor,
        outline,
        primaryLoop,
        bounds,
        labelPosition,
        labelFontSize: labelMetrics.fontSize,
        labelMaxWidth: labelMetrics.maxWidth,
        labelLineHeight: labelMetrics.lineHeight,
        labelMaxHeight: labelMetrics.maxHeight,
        hexCount: territoryHexes.length,
      }
    })
    .filter((entry): entry is TerritoryRenderInfo => Boolean(entry))
}

export const mapTerritoryRenderInfo = (renderInfo: TerritoryRenderInfo[]) => {
  const map = new Map<TerritoryId, TerritoryRenderInfo>()
  renderInfo.forEach((info) => {
    map.set(info.id, info)
  })
  return map
}
