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
import { Container, Graphics } from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { useMapStore } from '@/stores/mapStore'
import { useMapInteractionsStore } from '@/stores/mapInteractionsStore'
import { hexPolygonCommands } from '@/utils/pixiGeometry'
import styles from './PixiViewport.module.css'

extend({ Container, Graphics, Viewport })

const BACKGROUND_COLOR = 0x0b1120
const SELECTED_OUTLINE = 0xffffff
const HOVER_OUTLINE = 0xfacc15
const NEIGHBOUR_OUTLINE = 0x93c5fd
const TERRITORY_ALPHA = 0.82

const colorToNumber = (color: string) => {
  const normalized = color.startsWith('#') ? color.slice(1) : color
  const value = Number.parseInt(normalized, 16)
  return Number.isNaN(value) ? 0x64748b : value
}

interface InteractiveViewportProps {
  width: number
  height: number
  worldWidth: number
  worldHeight: number
  onBoundsChange?: (bounds: { left: number; right: number; top: number; bottom: number }) => void
  children: ReactNode
}

const InteractiveViewport = ({
  width,
  height,
  worldWidth,
  worldHeight,
  onBoundsChange,
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
    viewport.drag().pinch().wheel().decelerate()
    viewport.clampZoom({ minScale: 0.25, maxScale: 4 })
    viewport.resize(width, height, worldWidth, worldHeight)
    viewport.moveCenter(worldWidth / 2, worldHeight / 2)

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

    viewport.on('moved', notify)
    notify()

    return () => {
      viewport.plugins.removeAll()
      viewport.off('moved', notify)
    }
  }, [height, isReady, onBoundsChange, ticker, renderer, width, worldHeight, worldWidth])

  if (!isReady) {
    return null
  }

  return (
    <pixiViewport
      ref={viewportRef}
      screenWidth={width}
      screenHeight={height}
      worldWidth={worldWidth}
      worldHeight={worldHeight}
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
}

const MapViewport = ({ className, background, transparent = false }: MapViewportProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 800, height: 600 })
  const [visibleBounds, setVisibleBounds] = useState<{
    left: number
    right: number
    top: number
    bottom: number
  } | null>(null)
  const { map, positionedHexes, loadMap, loading } = useMapStore()
  const {
    selectedTerritory,
    hoveredTerritory,
    setSelectedTerritory,
    setHoveredTerritory,
  } = useMapInteractionsStore()

  useEffect(() => {
    loadMap()
  }, [loadMap])

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
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
    if (!map) return new Map<string, string>()
    return new Map(map.territories.map((territory) => [territory.id, territory.displayColor]))
  }, [map])

  const visibleHexes = useMemo(() => {
    if (!map) return []
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
  }, [map, positionedHexes, visibleBounds])

  const selectedNeighbours = useMemo(() => {
    if (!map || !selectedTerritory) return new Set<string>()
    return new Set(map.adjacencies[selectedTerritory] ?? [])
  }, [map, selectedTerritory])

  

  if (!map || loading) {
    return <div className={styles.loading}>Loading map…</div>
  }

  const worldWidth = (map.grid.bounds.maxQ - map.grid.bounds.minQ + 1) * map.grid.hexSize * Math.sqrt(3)
  const worldHeight = (map.grid.bounds.maxR - map.grid.bounds.minR + 1) * map.grid.hexSize * 1.5
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
      >
        <InteractiveViewport
          width={viewportSize.width}
          height={viewportSize.height}
          worldWidth={worldWidth}
          worldHeight={worldHeight}
          onBoundsChange={setVisibleBounds}
        >
          <pixiContainer>
            {visibleHexes.map((hex) => {
              const commands = hexPolygonCommands(hex.corners)
              const isSelected = hex.territoryId === selectedTerritory
              const isHovered = hex.territoryId === hoveredTerritory
              const isNeighbour = hex.territoryId && selectedNeighbours.has(hex.territoryId)

              const territoryColor = hex.territoryId
                ? territoryColorLookup.get(hex.territoryId) ?? '#4b5563'
                : '#1f2937'
              const colorValue = colorToNumber(territoryColor)

              return (
                <pixiGraphics
                  key={hex.id}
                  draw={(graphics: Graphics) => {
                    graphics.clear()
                    graphics.poly(commands)
                    graphics.fill({ color: colorValue, alpha: TERRITORY_ALPHA })

                    if (isSelected || isHovered || isNeighbour) {
                      graphics.poly(commands)
                      graphics.stroke({
                        width: isSelected ? 3 : 2,
                        color: isSelected ? SELECTED_OUTLINE : isHovered ? HOVER_OUTLINE : NEIGHBOUR_OUTLINE,
                      })
                    }
                  }}
                  eventMode="static"
                  cursor="pointer"
                  onPointerOver={() => setHoveredTerritory(hex.territoryId ?? null)}
                  onPointerOut={() => setHoveredTerritory(null)}
                  onPointerTap={() => setSelectedTerritory(hex.territoryId ?? null)}
                />
              )
            })}
          </pixiContainer>
        </InteractiveViewport>
      </Application>
    </div>
  )
}

export default MapViewport
