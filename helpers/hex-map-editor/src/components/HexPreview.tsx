import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Application, extend, useApplication } from '@pixi/react'
import { Container, Graphics as PixiGraphics, type FederatedPointerEvent } from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { useMapEditorStore } from '../state/useMapEditorStore'
import { axialToPixel, hexPolygonPoints } from '../utils/hexGeometry'
import { colorToNumber } from '../utils/color'

extend({ Container, Graphics: PixiGraphics, Viewport })

const NEUTRAL_FILL = 0x2a2a2a
const STROKE_DEFAULT = 0x161616
const STROKE_SELECTED = 0xffffff
const STROKE_WIDTH = 1.5
const CANVAS_BACKGROUND = 0x080b12
const PADDING_FACTOR = 2.2

interface HexDisplay {
  key: string
  polygon: number[]
  fill: number
  stroke: number
}

interface ViewportMetrics {
  width: number
  height: number
}

interface InteractiveViewportProps {
  viewport: ViewportMetrics
  world: ViewportMetrics
  children: ReactNode
}

const InteractiveViewport = ({ viewport, world, children }: InteractiveViewportProps) => {
  const viewportRef = useRef<Viewport | null>(null)
  const isConfiguredRef = useRef(false)
  const { app } = useApplication()
  const renderer = app.renderer
  const ticker = app.ticker
  const isReady = Boolean(renderer?.events && ticker)

  useLayoutEffect(() => {
    if (!isReady) {
      return
    }

    const instance = viewportRef.current
    if (!instance) {
      return
    }

    instance.options.events = renderer.events
    instance.options.ticker = ticker

    if (!isConfiguredRef.current) {
      instance.drag().pinch().wheel().decelerate()
      isConfiguredRef.current = true
    }

    return () => {
      isConfiguredRef.current = false
      instance.plugins.removeAll()
    }
  }, [isReady, renderer, ticker])

  useLayoutEffect(() => {
    if (!isReady) {
      return
    }

    const instance = viewportRef.current
    if (!instance) {
      return
    }

    instance.resize(viewport.width, viewport.height, world.width, world.height)
    instance.moveCenter(world.width / 2, world.height / 2)
  }, [isReady, viewport.height, viewport.width, world.height, world.width])

  if (!isReady) {
    return null
  }

  return (
    <viewport
      ref={viewportRef}
      screenWidth={viewport.width}
      screenHeight={viewport.height}
      worldWidth={world.width}
      worldHeight={world.height}
      ticker={ticker}
      events={renderer.events}
    >
      {children}
    </viewport>
  )
}

const HexPreview = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 960, height: 620 })

  const map = useMapEditorStore((state) => state.map)
  const selectedStateId = useMapEditorStore((state) => state.selectedStateId)
  const paintMode = useMapEditorStore((state) => state.paintMode)
  const interactionMode = useMapEditorStore((state) => state.interactionMode)
  const paintHex = useMapEditorStore((state) => state.paintHex)
  const addHexAtWorldPoint = useMapEditorStore((state) => state.addHexAtWorldPoint)

  useLayoutEffect(() => {
    if (!containerRef.current) {
      return
    }

    const handleResize = () => {
      const bounds = containerRef.current?.getBoundingClientRect()
      if (!bounds) {
        return
      }
      const width = Math.max(320, Math.floor(bounds.width))
      const height = Math.max(240, Math.floor(bounds.height))
      setViewportSize({ width, height })
    }

    const observer = new ResizeObserver(handleResize)
    observer.observe(containerRef.current)
    handleResize()

    return () => {
      observer.disconnect()
    }
  }, [])

  const memoised = useMemo(() => {
    if (!map.hexes.length) {
      return {
        items: [] as HexDisplay[],
        world: {
          width: viewportSize.width,
          height: viewportSize.height,
        },
        offset: { x: 0, y: 0 },
      }
    }

    const stateColorLookup = new Map(map.states.map((state) => [state.id, colorToNumber(state.displayColor, NEUTRAL_FILL)]))

    const rawPoints = map.hexes.map((hex) => {
      const center = axialToPixel(hex.q, hex.r, map.grid)
      const points = hexPolygonPoints(center, map.grid.hexSize, map.grid.orientation)
      return { hex, points }
    })

    let minX = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    rawPoints.forEach(({ points }) => {
      points.forEach((point) => {
        minX = Math.min(minX, point.x)
        maxX = Math.max(maxX, point.x)
        minY = Math.min(minY, point.y)
        maxY = Math.max(maxY, point.y)
      })
    })

    const padding = map.grid.hexSize * PADDING_FACTOR
    const adjustedMinX = minX - padding
    const adjustedMinY = minY - padding
    const adjustedMaxX = maxX + padding
    const adjustedMaxY = maxY + padding

    const offsetX = -adjustedMinX
    const offsetY = -adjustedMinY

    const items = rawPoints.map(({ hex, points }) => {
      const hexKey = `${hex.q},${hex.r}`
      const polygon = points.flatMap((point) => [point.x + offsetX, point.y + offsetY])
      const isSelected = hex.stateId !== null && hex.stateId === selectedStateId
      const fill = hex.stateId ? stateColorLookup.get(hex.stateId) ?? NEUTRAL_FILL : NEUTRAL_FILL

      return {
        key: hexKey,
        polygon,
        fill,
        stroke: isSelected ? STROKE_SELECTED : STROKE_DEFAULT,
      }
    })

    return {
      items,
      world: {
        width: adjustedMaxX - adjustedMinX,
        height: adjustedMaxY - adjustedMinY,
      },
      offset: { x: offsetX, y: offsetY },
    }
  }, [map, selectedStateId, viewportSize.height, viewportSize.width])

  const { items, world, offset } = memoised

  const handleHexClick = (hexKey: string) => {
    if (interactionMode !== 'edit') {
      return
    }
    paintHex(hexKey)
  }

  const handleBackgroundTap = (event: FederatedPointerEvent) => {
    if (interactionMode !== 'edit') {
      return
    }
    if (paintMode === 'flood' && !selectedStateId) {
      return
    }
    const graphic = event.currentTarget as PixiGraphics
    const parent = graphic.parent ?? graphic
    const local = event.getLocalPosition(parent)
    addHexAtWorldPoint({ x: local.x - offset.x, y: local.y - offset.y })
  }

  const worldSize = {
    width: Math.max(world.width, viewportSize.width),
    height: Math.max(world.height, viewportSize.height),
  }

  return (
    <div ref={containerRef} className="hex-preview">
      <Application
        width={viewportSize.width}
        height={viewportSize.height}
        background={CANVAS_BACKGROUND}
        antialias
        eventMode="static"
      >
        <InteractiveViewport viewport={viewportSize} world={worldSize}>
          <pixiContainer sortableChildren>
            <pixiGraphics
              key="world-background"
              draw={(graphics: PixiGraphics) => {
                graphics.clear()
                graphics.rect(0, 0, world.width || 10, world.height || 10)
                graphics.fill({ color: 0x000000, alpha: 0.001 })
              }}
              eventMode="static"
              cursor={interactionMode === 'edit' ? (paintMode === 'erase' ? 'not-allowed' : paintMode === 'delete-hex' ? 'cell' : 'crosshair') : 'default'}
              onPointerTap={handleBackgroundTap}
            />
            {items.map((item) => (
              <pixiGraphics
                key={item.key}
                draw={(graphics: PixiGraphics) => {
                  graphics.clear()
                  graphics.poly(item.polygon)
                  graphics.fill({ color: item.fill })
                  graphics.stroke({ color: item.stroke, width: STROKE_WIDTH })
                }}
                eventMode="static"
                cursor={interactionMode === 'edit' ? (paintMode === 'erase' ? 'not-allowed' : paintMode === 'delete-hex' ? 'cell' : 'pointer') : 'default'}
                onPointerTap={() => handleHexClick(item.key)}
              />
            ))}
          </pixiContainer>
        </InteractiveViewport>
      </Application>
    </div>
  )
}

export default HexPreview
