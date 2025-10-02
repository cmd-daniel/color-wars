import {
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
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
import { useMapStore } from '@/stores/mapStore'
import { useMapInteractionsStore } from '@/stores/mapInteractionsStore'
import MapHexLayer from './MapHexLayer'
import { computeTerritoryRenderInfo, mapTerritoryRenderInfo } from '@/utils/territoryGeometry'
import type { TerritoryId } from '@/types/map'
import styles from './PixiViewport.module.css'

extend({ Container, Graphics, Viewport, Text })

const BACKGROUND_COLOR = 0x0b1120
const HEX_DETAIL_THRESHOLD = 4

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
  onBoundsChange?: (bounds: { left: number; right: number; top: number; bottom: number }) => void
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

  useLayoutEffect(() => {
    if (!isReady) {
      return
    }

    const viewport = viewportRef.current
    if (!viewport) return

    viewport.options.events = renderer.events
    viewport.options.ticker = ticker
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
    viewport.drag().pinch().wheel().decelerate()
    viewport.clampZoom({ minScale: 0.25, maxScale: 4 })
    viewport.resize(width, height, worldBounds.width, worldBounds.height)
    viewport.moveCenter(worldBounds.centerX, worldBounds.centerY)

    const paddedWorldWidth = worldBounds.width + fitPadding * 2
    const paddedWorldHeight = worldBounds.height + fitPadding * 2

    if (paddedWorldWidth > 0 && paddedWorldHeight > 0 && width > 0 && height > 0) {
      const baseScale = Math.min(width / paddedWorldWidth, height / paddedWorldHeight)
      const fitScale = baseScale * initialZoomFactor
      if (Number.isFinite(fitScale) && fitScale > 0) {
        viewport.setZoom(fitScale, true)
        viewport.moveCenter(worldBounds.centerX, worldBounds.centerY)
      }
    }

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
      viewport.plugins.removeAll()
      viewport.hitArea = null
      viewport.forceHitArea = undefined
      viewport.off('moved', notify)
      viewport.off('zoomed', notifyScale)
    }
  }, [
    fitPadding,
    height,
    initialZoomFactor,
    isReady,
    onBoundsChange,
    onScaleChange,
    ticker,
    renderer,
    width,
    worldBounds,
  ])

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
  background?: number
  transparent?: boolean
  initialZoomFactor?: number
  fitPadding?: number
}

const MapViewport = ({
  className,
  background,
  transparent = false,
  initialZoomFactor = 1,
  fitPadding = 0,
}: MapViewportProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 })
  const [resolution, setResolution] = useState(1)
  const [viewportScale, setViewportScale] = useState(1)
  const [visibleBounds, setVisibleBounds] = useState<{
    left: number
    right: number
    top: number
    bottom: number
  } | null>(null)
  const { map, positionedHexes, loadMap, loading, displayConfig } = useMapStore()
  const {
    selectedTerritory,
    hoveredTerritory,
    setSelectedTerritory,
    setHoveredTerritory,
    highlightedTerritory,
  } = useMapInteractionsStore()

  useEffect(() => {
    loadMap()
  }, [loadMap])

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  const handleBoundsChange = useCallback(
    (bounds: { left: number; right: number; top: number; bottom: number }) => {
      if (!map) return
      const padding = map.grid.hexSize * 4
      setVisibleBounds({
        left: bounds.left - padding,
        right: bounds.right + padding,
        top: bounds.top - padding,
        bottom: bounds.bottom + padding,
      })
    },
    [map],
  )

  useEffect(() => {
    const updateResolution = () => {
      if (typeof window === 'undefined') return
      const devicePixelRatio = window.devicePixelRatio || 1
      setResolution(Math.min(devicePixelRatio * 2, 3))
    }

    updateResolution()
    window.addEventListener('resize', updateResolution)
    return () => window.removeEventListener('resize', updateResolution)
  }, [])

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      setViewportSize({
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height)),
      })
    })

    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])

  const territoryColorLookup = useMemo(() => {
    if (!map) return new Map<TerritoryId, string>()
    return new Map(map.territories.map((territory) => [territory.id, territory.displayColor]))
  }, [map])

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

  const showHexFill = viewportScale >= HEX_DETAIL_THRESHOLD

  const visibleHexes = useMemo(() => {
    if (!map || !showHexFill) return []
    if (!visibleBounds) {
      return positionedHexes
    }

    const padding = map.grid.hexSize * 8
    return positionedHexes.filter((hex) =>
      hex.center.x >= visibleBounds.left - padding &&
      hex.center.x <= visibleBounds.right + padding &&
      hex.center.y >= visibleBounds.top - padding &&
      hex.center.y <= visibleBounds.bottom + padding,
    )
  }, [map, positionedHexes, visibleBounds, showHexFill])

  const territoryRenderList = useMemo(() => {
    if (!map) return []
    return computeTerritoryRenderInfo(map.territories, positionedHexes, map.grid.hexSize)
  }, [map, positionedHexes])

  const territoryRenderMap = useMemo(() => mapTerritoryRenderInfo(territoryRenderList), [territoryRenderList])

  const hexSize = map?.grid.hexSize ?? 0
  const hexGap = useMemo(() => (hexSize > 0 ? hexSize * 0.12 : 0), [hexSize])
  const outlineWidth = useMemo(() => (hexSize > 0 ? Math.max(2, hexSize * 0.16) : 2), [hexSize])

  if (!map || loading || !worldBounds) {
    return <div className={styles.loading}>Loading map…</div>
  }
  const containerClass = [
    styles.container,
    transparent ? styles.overlay : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  const backgroundColor = background ?? BACKGROUND_COLOR

  return (
    <div ref={containerRef} className={containerClass} onWheel={handleWheel}>
      <Application
        width={viewportSize.width}
        height={viewportSize.height}
        background={backgroundColor}
        antialias
        eventMode="static"
        autoDensity
        resolution={resolution}
        resizeTo={containerRef}
      >
        <InteractiveViewport
          width={viewportSize.width}
          height={viewportSize.height}
          worldBounds={worldBounds}
          onBoundsChange={handleBoundsChange}
          onScaleChange={setViewportScale}
          fitPadding={fitPadding}
          initialZoomFactor={initialZoomFactor}
        >
          <MapHexLayer
            hexes={showHexFill ? visibleHexes : []}
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
            visibleBounds={visibleBounds}
            showHexFill={showHexFill}
            showTerritoryLabels={displayConfig.showTerritoryLabels}
          />
        </InteractiveViewport>
      </Application>
    </div>
  )
}

export default MapViewport
