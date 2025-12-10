import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from 'react'
import { Application, extend, useApplication } from '@pixi/react'
import { Container, Graphics, Rectangle, Text } from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { useShallow } from 'zustand/shallow'
import { useMapStore } from '@/stores/mapStore'
import { useMapInteractionsStore } from '@/stores/mapInteractionsStore'
import MapHexLayer from './MapHexLayer'
import { computeTerritoryRenderInfo, mapTerritoryRenderInfo } from '@/utils/territoryGeometry'
import type { TerritoryId } from '@/types/map'
import styles from './PixiViewport.module.css'
import DiceTrackLayer from './DiceTrackLayer'
import { computeViewBox, createHollowGrid} from '@/utils/gridUtils'
import { buildInnerPathFromSpec } from '@/utils/hexEdgeUtils' 
import { INNER_EDGE_SPEC } from '@/utils/diceTrackConfig'

extend({ Container, Graphics, Viewport, Text })

// const BACKGROUND_COLOR = 0x222222
const HEX_DETAIL_THRESHOLD = 4
const EMPTY_TERRITORY_OWNERSHIP = Object.freeze({}) as Record<TerritoryId, string | null>
const EMPTY_PLAYER_COLORS = Object.freeze({}) as Record<string, string>

export interface ViewportBounds {
  left: number
  right: number
  top: number
  bottom: number
}

type BoundsListener = (bounds: ViewportBounds) => void
type ScaleListener = (scale: number) => void

export interface ViewportEvents {
  emitBounds: (bounds: ViewportBounds) => void
  emitScale: (scale: number) => void
  subscribeToBounds: (listener: BoundsListener) => () => void
  subscribeToScale: (listener: ScaleListener) => () => void
  getLatestBounds: () => ViewportBounds | null
  getLatestScale: () => number
}

const createViewportEvents = (initialScale = 1): ViewportEvents => {
  let latestBounds: ViewportBounds | null = null
  let latestScale = initialScale
  const boundsListeners = new Set<BoundsListener>()
  const scaleListeners = new Set<ScaleListener>()

  return {
    emitBounds(bounds) {
      latestBounds = bounds
      boundsListeners.forEach((listener) => listener(bounds))
    },
    emitScale(scale) {
      latestScale = scale
      scaleListeners.forEach((listener) => listener(scale))
    },
    subscribeToBounds(listener) {
      boundsListeners.add(listener)
      if (latestBounds) {
        listener(latestBounds)
      }
      return () => {
        boundsListeners.delete(listener)
      }
    },
    subscribeToScale(listener) {
      scaleListeners.add(listener)
      listener(latestScale)
      return () => {
        scaleListeners.delete(listener)
      }
    },
    getLatestBounds() {
      return latestBounds
    },
    getLatestScale() {
      return latestScale
    },
  }
}

interface WorldBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  centerX: number
  centerY: number
}

interface InteractiveViewportProps {
  width: number
  height: number
  worldBounds: WorldBounds
  onBoundsChange?: (bounds: ViewportBounds) => void
  onScaleChange?: (scale: number) => void
  fitPadding: number
  initialZoomFactor: number
  children: ReactNode
}

const InteractiveViewport = ({
  width,
  height,
  worldBounds,
  onBoundsChange,
  onScaleChange,
  fitPadding,
  initialZoomFactor,
  children,
}: InteractiveViewportProps) => {
  const { app } = useApplication()
  const viewportRef = useRef<Viewport | null>(null)
  const renderer = app.renderer
  const ticker = app.ticker
  const isReady = Boolean(renderer?.events && ticker)

  const fitAppliedKeyRef = useRef<string | null>(null)

  useLayoutEffect(() => {
    return () => {
      const viewport = viewportRef.current
      if (!viewport) return

      viewport.plugins.removeAll()
      viewport.hitArea = null
      viewport.forceHitArea = undefined
    }
  }, [])

  useLayoutEffect(() => {
    if (!isReady) {
      return
    }

    const viewport = viewportRef.current
    if (!viewport) return

    viewport.options.events = renderer.events
    viewport.options.ticker = ticker
    viewport.clampZoom({ minScale: 0.25, maxScale: 4 })

    if (!viewport.plugins.get('drag')) viewport.drag()
    if (!viewport.plugins.get('pinch')) viewport.pinch()
    if (!viewport.plugins.get('wheel')) viewport.wheel()
    if (!viewport.plugins.get('decelerate')) viewport.decelerate()

    const notify = () => {
      if (!onBoundsChange) return
      const bounds = viewport.getVisibleBounds()
      onBoundsChange({
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        bottom: bounds.bottom,
      })
    }

    const notifyScale = () => {
      if (!onScaleChange) return
      onScaleChange(viewport.scale.x)
    }

    viewport.on('moved', notify)
    viewport.on('zoomed', notifyScale)
    notify()
    notifyScale()

    return () => {
      viewport.off('moved', notify)
      viewport.off('zoomed', notifyScale)
    }
  }, [isReady, onBoundsChange, onScaleChange, renderer, ticker])

  useLayoutEffect(() => {
    if (!isReady) {
      return
    }

    const viewport = viewportRef.current
    if (!viewport) return

    const dominantDimension = Math.max(worldBounds.width, worldBounds.height, 1)
    // Pad the hit area well beyond the rendered map so the entire canvas responds to drag/zoom.
    const hitAreaPadding = dominantDimension * 2
    const hitArea = new Rectangle(
      worldBounds.minX - hitAreaPadding,
      worldBounds.minY - hitAreaPadding,
      worldBounds.width + hitAreaPadding * 2,
      worldBounds.height + hitAreaPadding * 2,
    )
    viewport.forceHitArea = hitArea
    viewport.hitArea = hitArea
    viewport.resize(width, height, worldBounds.width, worldBounds.height)

    const paddedWorldWidth = worldBounds.width + fitPadding * 2
    const paddedWorldHeight = worldBounds.height + fitPadding * 2
    const fitKey = [
      worldBounds.minX,
      worldBounds.minY,
      worldBounds.maxX,
      worldBounds.maxY,
      fitPadding,
      initialZoomFactor,
    ].join(':')

    if (
      (!fitAppliedKeyRef.current || fitAppliedKeyRef.current !== fitKey) &&
      paddedWorldWidth > 0 &&
      paddedWorldHeight > 0 &&
      width > 0 &&
      height > 0
    ) {
      const baseScale = Math.min(width / paddedWorldWidth, height / paddedWorldHeight)
      const fitScale = baseScale * initialZoomFactor
      if (Number.isFinite(fitScale) && fitScale > 0) {
        viewport.setZoom(fitScale, true)
        viewport.moveCenter(worldBounds.centerX, worldBounds.centerY)
        fitAppliedKeyRef.current = fitKey
      }
    }
  }, [fitPadding, height, initialZoomFactor, isReady, width, worldBounds])

  if (!isReady) {
    return null
  }

  return (
    <pixiViewport
      ref={viewportRef}
      screenWidth={width}
      screenHeight={height}
      worldWidth={worldBounds.width}
      worldHeight={worldBounds.height}
      events={renderer.events}
      ticker={ticker}
    >
      {children}
    </pixiViewport>
  )
}



interface MapViewportProps {
  className?: string
  transparent?: boolean
  initialZoomFactor?: number
  fitPadding?: number
  resolutionMultiplier?: number
  maxResolution?: number
}

const MapViewport = ({
  className,
  transparent = false,
  initialZoomFactor = 1,
  fitPadding = 0,
  resolutionMultiplier = 1.2,
  maxResolution = 6,
}: MapViewportProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 })
  const [resolution, setResolution] = useState(1)
  const viewportEventsRef = useRef<ViewportEvents | null>(null)
  if (!viewportEventsRef.current) {
    viewportEventsRef.current = createViewportEvents(initialZoomFactor)
  }
  const viewportEvents = viewportEventsRef.current
  const { map, positionedHexes, loading, displayConfig } = useMapStore(
    useShallow((state) => ({
      map: state.map,
      positionedHexes: state.positionedHexes,
      loading: state.loading,
      displayConfig: state.displayConfig,
    })),
  )
  const loadMap = useMapStore((state) => state.loadMap)
  const {
    selectedTerritory,
    hoveredTerritory,
    setSelectedTerritory,
    setHoveredTerritory,
    highlightedTerritory,
  } = useMapInteractionsStore()
  const { ownershipByTerritory, playerColors } = {
    ownershipByTerritory: EMPTY_TERRITORY_OWNERSHIP,
    playerColors: EMPTY_PLAYER_COLORS,
  }

  useEffect(() => {
    if (!map && !loading) {
      void loadMap()
    }
  }, [loadMap, map, loading])

  const handleBoundsChange = useCallback(
    (bounds: ViewportBounds) => {
      if (!map) return
      if (!viewportEvents) return
      const padding = map.grid.hexSize * 4
      const quantizeUnit = Math.max(1, map.grid.hexSize * 2)

      const expanded: ViewportBounds = {
        left: bounds.left - padding,
        right: bounds.right + padding,
        top: bounds.top - padding,
        bottom: bounds.bottom + padding,
      }

      const quantized: ViewportBounds = {
        left: Math.floor(expanded.left / quantizeUnit) * quantizeUnit,
        right: Math.ceil(expanded.right / quantizeUnit) * quantizeUnit,
        top: Math.floor(expanded.top / quantizeUnit) * quantizeUnit,
        bottom: Math.ceil(expanded.bottom / quantizeUnit) * quantizeUnit,
      }

      viewportEvents.emitBounds(quantized)
    },
    [map, viewportEvents],
  )
  const handleScaleChange = useCallback((scale: number) => {
    viewportEvents?.emitScale(scale)
  }, [viewportEvents])

  useEffect(() => {
    const updateResolution = () => {
      if (typeof window === 'undefined') return
      const devicePixelRatio = window.devicePixelRatio || 1
      const base = Math.min(devicePixelRatio * 2, 3)
      const boosted = base * Math.max(1, resolutionMultiplier)
      const clamped = Math.max(1, Math.min(boosted, Math.max(1, maxResolution)))
      setResolution(clamped)
    }

    updateResolution()
    window.addEventListener('resize', updateResolution)
    return () => window.removeEventListener('resize', updateResolution)
  }, [maxResolution, resolutionMultiplier])

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      const squareSize = Math.max(1, Math.round(Math.min(width, height)))
      setViewportSize({
        width: squareSize,
        height: squareSize,
      })
    })

    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])

  const territoryColorLookup = useMemo(() => {
    const lookup = new Map<TerritoryId, string>()
    if (!map) return lookup

    for (const territory of map.territories) {
      const ownerId = ownershipByTerritory[territory.id] ?? null
      const ownerColor = ownerId ? playerColors[ownerId] : undefined
      const color = ownerColor ?? territory.displayColor ?? '#1f2937'
      lookup.set(territory.id, color)
    }

    return lookup
  }, [map, ownershipByTerritory, playerColors])

  const worldBounds = useMemo<WorldBounds | null>(() => {
    if (!positionedHexes.length) {
      return null
    }

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    for (const hex of positionedHexes) {
      const corners = hex.corners.length > 0 ? hex.corners : [hex.center]
      for (const corner of corners) {
        if (corner.x < minX) minX = corner.x
        if (corner.x > maxX) maxX = corner.x
        if (corner.y < minY) minY = corner.y
        if (corner.y > maxY) maxY = corner.y
      }
    }

    if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
      return null
    }

    const width = maxX - minX
    const height = maxY - minY

    if (width <= 0 || height <= 0) {
      return null
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
      centerX: minX + width / 2,
      centerY: minY + height / 2,
    }
  }, [positionedHexes])

  const territoryRenderList = useMemo(() => {
    if (!map) return []
    return computeTerritoryRenderInfo(map.territories, positionedHexes, map.grid.hexSize)
  }, [map, positionedHexes])

  const territoryRenderMap = useMemo(() => mapTerritoryRenderInfo(territoryRenderList), [territoryRenderList])

  const hexSize = map?.grid.hexSize ?? 0
  const hexGap = useMemo(() => (hexSize > 0 ? hexSize * 0.12 : 0), [hexSize])
  const outlineWidth = useMemo(() => (hexSize > 0 ? Math.max(2, hexSize * 0.16) : 2), [hexSize])

  const overlaySize = useMemo(
    () => Math.max(1, Math.round(Math.min(viewportSize.width, viewportSize.height))),
    [viewportSize.height, viewportSize.width],
  )
  const overlayOffsetX = useMemo(() => (viewportSize.width - overlaySize) / 2, [overlaySize, viewportSize.width])
  const overlayOffsetY = useMemo(() => (viewportSize.height - overlaySize) / 2, [overlaySize, viewportSize.height])

  const containerClass = [
    styles.container,
    transparent ? styles.overlay : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  // const backgroundColor = background ?? BACKGROUND_COLOR

  const trackGeometry = useMemo(() => {
    const grid = createHollowGrid()
    const hexes = Array.from(grid)
    const [minX, minY, width, height] = computeViewBox(grid)
      .split(' ')
      .map((value) => Number.parseFloat(value))
    const inner = buildInnerPathFromSpec(grid, INNER_EDGE_SPEC, {
      radius: 3,
      edgeScaleForLoop: 1,
    })
    return {
      hexes,
      viewBox: {
        minX,
        minY,
        width,
        height,
      },
      innerLoop: inner.loop,
    }
  }, [])
  const track = trackGeometry

  return (
    <div ref={containerRef} className={containerClass}>
      {map && !loading && worldBounds ? (
        <Application
          preference='webgl'
          width={viewportSize.width}
          height={viewportSize.height}
          background={0x222222}
          antialias
          eventMode="static"
          autoDensity
          resolution={resolution}
          resizeTo={containerRef}
        >
          <pixiContainer label="map-layer" eventMode="passive">
            <InteractiveViewport
              width={viewportSize.width}
              height={viewportSize.height}
              worldBounds={worldBounds}
              onBoundsChange={handleBoundsChange}
              onScaleChange={handleScaleChange}
              fitPadding={fitPadding}
              initialZoomFactor={initialZoomFactor}
            >
              <MapHexLayer
                positionedHexes={positionedHexes}
                viewportEvents={viewportEvents}
                hexDetailThreshold={HEX_DETAIL_THRESHOLD}
                hexSize={hexSize}
                territoryColorLookup={territoryColorLookup}
                hoveredTerritory={hoveredTerritory}
                selectedTerritory={selectedTerritory}
                highlightedTerritory={highlightedTerritory}
                onHover={setHoveredTerritory}
                onSelect={setSelectedTerritory}
                territoryRenderList={territoryRenderList}
                territoryRenderMap={territoryRenderMap}
                hexGap={hexGap}
                outlineWidth={outlineWidth}
                showTerritoryLabels={displayConfig.showTerritoryLabels}
              />
            </InteractiveViewport>
          </pixiContainer>
          {/* <DiceTrackLayer
            size={overlaySize}
            resolution={resolution}
            offsetX={overlayOffsetX}
            offsetY={overlayOffsetY}
            track={track}
            trackSpaces={[]}
            playerColors={[]}
            playerOrder={[]}
          /> */}
        </Application>
      ) : (
        <div className={styles.loading}>Loading map…</div>
      )}
    </div>
  )
}

export default MapViewport
