import type { HexBounds, HexCell, MapConfig, StateRegion, AxialCoord } from '../schema/mapConfig'
import type { ParsedSvgDocument, SvgPathDefinition } from './svgParsing'
import { axialToPixel, pixelToAxial } from './hexGeometry'
import { withRecomputedAdjacency } from './adjacency'

export interface GridOverlayConfig {
  orientation: 'pointy' | 'flat'
  hexSize: number
  offsetX: number
  offsetY: number
}

interface RasterisedResult {
  hexes: HexCell[]
  states: StateRegion[]
  bounds: HexBounds
  origin: AxialCoord
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const normaliseColor = (color: string): string => color.replace(/\s+/g, '').toLowerCase()

const buildPathMap = (paths: SvgPathDefinition[]) =>
  paths
    .filter((path) => path.d.length > 0)
    .map((path, index) => {
      const fallbackColor = path.fill && path.fill !== 'transparent' ? path.fill : `hsl(${(index * 47) % 360} 65% 55%)`
      const defaultId = slugify(path.id || path.label || `path-${index}`)
      return {
        ...path,
        fill: fallbackColor,
        path2d: new Path2D(path.d),
        colorKey: normaliseColor(fallbackColor),
        stateId: defaultId || `state-${index}`,
        stroke: path.stroke,
        strokeWidth: path.strokeWidth,
      }
    })

const ensureCanvasContext = (width: number, height: number): CanvasRenderingContext2D => {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(2, Math.ceil(width))
  canvas.height = Math.max(2, Math.ceil(height))
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Unable to create offscreen canvas for SVG sampling')
  }
  return context
}

const collectBounds = (hexes: HexCell[]): HexBounds => {
  if (!hexes.length) {
    return { minQ: 0, maxQ: 0, minR: 0, maxR: 0 }
  }

  let minQ = Number.POSITIVE_INFINITY
  let maxQ = Number.NEGATIVE_INFINITY
  let minR = Number.POSITIVE_INFINITY
  let maxR = Number.NEGATIVE_INFINITY

  hexes.forEach((hex) => {
    minQ = Math.min(minQ, hex.q)
    maxQ = Math.max(maxQ, hex.q)
    minR = Math.min(minR, hex.r)
    maxR = Math.max(maxR, hex.r)
  })

  return { minQ, maxQ, minR, maxR }
}

const interpolateHexes = (
  svg: ParsedSvgDocument,
  overlay: GridOverlayConfig,
): RasterisedResult => {
  const { orientation, hexSize, offsetX, offsetY } = overlay
  const grid = { orientation, hexSize }

  const pathEntries = buildPathMap(svg.paths)
  if (!pathEntries.length) {
    return {
      hexes: [],
      states: [],
      bounds: { minQ: 0, maxQ: 0, minR: 0, maxR: 0 },
      origin: { q: 0, r: 0 },
    }
  }

  console.group('[SVG→Hex] Paths overview')
  pathEntries.slice(0, 6).forEach((path, index) => {
    console.info(`#${index + 1}`, {
      id: path.id,
      label: path.label,
      fill: path.fill,
      stroke: path.stroke,
      strokeWidth: path.strokeWidth,
    })
  })
  if (pathEntries.length > 6) {
    console.info(`… ${pathEntries.length - 6} more paths not logged`)
  }
  console.groupEnd()

  const context = ensureCanvasContext(svg.viewBox.width, svg.viewBox.height)
  context.setTransform(1, 0, 0, 1, -svg.viewBox.x, -svg.viewBox.y)

  const margin = 2
  const corners = [
    pixelToAxial(svg.viewBox.x - offsetX, svg.viewBox.y - offsetY, grid),
    pixelToAxial(svg.viewBox.x + svg.viewBox.width - offsetX, svg.viewBox.y - offsetY, grid),
    pixelToAxial(svg.viewBox.x - offsetX, svg.viewBox.y + svg.viewBox.height - offsetY, grid),
    pixelToAxial(svg.viewBox.x + svg.viewBox.width - offsetX, svg.viewBox.y + svg.viewBox.height - offsetY, grid),
  ]

  const minQ = Math.floor(Math.min(...corners.map((corner) => corner.q))) - margin
  const maxQ = Math.ceil(Math.max(...corners.map((corner) => corner.q))) + margin
  const minR = Math.floor(Math.min(...corners.map((corner) => corner.r))) - margin
  const maxR = Math.ceil(Math.max(...corners.map((corner) => corner.r))) + margin

  console.info('[SVG→Hex] Sampling grid', {
    orientation,
    hexSize,
    offsetX,
    offsetY,
    viewBox: svg.viewBox,
    ranges: { minQ, maxQ, minR, maxR },
    paths: pathEntries.length,
  })

  const hexes: HexCell[] = []
  const stateHexLookup = new Map<string, Set<string>>()
  const colorToState = new Map<string, string>()
  const stateMeta = new Map<string, { displayColor: string; name: string }>()

  for (let r = minR; r <= maxR; r += 1) {
    for (let q = minQ; q <= maxQ; q += 1) {
      const s = -q - r
      const { x, y } = axialToPixel(q, r, grid)
      const sampledX = x + offsetX
      const sampledY = y + offsetY

      let winnerState: string | null = null

      for (const path of pathEntries) {
        if (path.strokeWidth) {
          context.lineWidth = path.strokeWidth
        } else {
          context.lineWidth = 1
        }
        if (context.isPointInPath(path.path2d, sampledX, sampledY)) {
          winnerState = path.stateId
          if (!colorToState.has(path.colorKey)) {
            colorToState.set(path.colorKey, path.stateId)
            stateMeta.set(path.stateId, {
              displayColor: path.fill === 'transparent' ? '#808080' : path.fill,
              name: path.label || path.id,
            })
          }
          break
        }
        if (!winnerState && path.stroke && context.isPointInStroke(path.path2d, sampledX, sampledY)) {
          winnerState = path.stateId
          if (!colorToState.has(path.colorKey)) {
            colorToState.set(path.colorKey, path.stateId)
            stateMeta.set(path.stateId, {
              displayColor: path.stroke,
              name: path.label || path.id,
            })
          }
          break
        }
      }

      if (!winnerState) {
        continue
      }

      if (hexes.length < 5) {
        console.debug('[SVG→Hex] Sample hit', { q, r, sampledX, sampledY, path: winnerState })
      }

      const key = `${q},${r}`
      hexes.push({ q, r, s, stateId: winnerState })
      if (!stateHexLookup.has(winnerState)) {
        stateHexLookup.set(winnerState, new Set())
      }
      stateHexLookup.get(winnerState)?.add(key)
    }
  }

  const states: StateRegion[] = Array.from(stateHexLookup.entries()).map(([stateId, hexIdSet]) => {
    const metadata = stateMeta.get(stateId)
    return {
      id: stateId,
      name: metadata?.name ?? stateId,
      displayColor: metadata?.displayColor ?? '#ffffff',
      hexIds: Array.from(hexIdSet.values()).sort(),
    }
  })

  if (!hexes.length) {
    console.warn('[SVG→Hex] No hexes produced. Check if the SVG paths are closed/fillable or adjust sampling parameters.')
    pathEntries.slice(0, 5).forEach((path, index) => {
      const sampleX = svg.viewBox.x + svg.viewBox.width / 2
      const sampleY = svg.viewBox.y + svg.viewBox.height / 2
      context.lineWidth = path.strokeWidth ?? 1
      const inPath = context.isPointInPath(path.path2d, sampleX, sampleY)
      const inStroke = context.isPointInStroke(path.path2d, sampleX, sampleY)
      console.debug('[SVG→Hex] Center test', index, {
        id: path.id,
        inPath,
        inStroke,
      })
    })
  }

  const bounds = collectBounds(hexes)

  return {
    hexes,
    states,
    bounds,
    origin: { q: bounds.minQ, r: bounds.minR },
  }
}

export const rasteriseSvgToMap = (
  svg: ParsedSvgDocument,
  overlay: GridOverlayConfig,
  currentMap: MapConfig,
): MapConfig => {
  const result = interpolateHexes(svg, overlay)

  return withRecomputedAdjacency({
    ...currentMap,
    grid: {
      ...currentMap.grid,
      orientation: overlay.orientation,
      hexSize: overlay.hexSize,
      bounds: result.bounds,
      origin: result.origin,
    },
    hexes: result.hexes,
    states: result.states,
  })
}
