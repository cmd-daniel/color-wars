import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Polygon } from 'pixi.js'
import type { Graphics, FederatedPointerEvent } from 'pixi.js'
import type { PositionedHex, TerritoryId } from '@/types/map'
import { hexPolygonCommands } from '@/utils/pixiGeometry'
import type { Bounds, TerritoryRenderInfo } from '@/utils/territoryGeometry'
import type { ViewportBounds, ViewportEvents } from './MapViewport'

const TERRITORY_FILL_ALPHA = 1
const PASSIVE_OUTLINE_ALPHA = 1
const SELECTED_OUTLINE_COLOR = 0xffffff
const HOVER_OUTLINE_COLOR = 0xfff
const HIGHLIGHT_OUTLINE_COLOR = 0x111
const DEFAULT_TERRITORY_COLOR = 0x3c3c3c

type VisibleBounds = ViewportBounds

interface MapHexLayerProps {
  positionedHexes: PositionedHex[]
  viewportEvents: ViewportEvents
  hexDetailThreshold: number
  hexSize: number
  territoryColorLookup: Map<TerritoryId, string>
  hoveredTerritory: TerritoryId | null
  selectedTerritory: TerritoryId | null
  highlightedTerritory: TerritoryId | null
  onHover: (territoryId: TerritoryId | null) => void
  onSelect: (territoryId: TerritoryId | null) => void
  territoryRenderList: TerritoryRenderInfo[]
  territoryRenderMap: Map<TerritoryId, TerritoryRenderInfo>
  hexGap: number
  outlineWidth: number
  showTerritoryLabels: boolean
}

const colorToNumber = (color: string | undefined): number => {
  if (!color) return DEFAULT_TERRITORY_COLOR

  const normalized = color.startsWith('#') ? color.slice(1) : color
  const value = Number.parseInt(normalized, 16)
  return Number.isNaN(value) ? DEFAULT_TERRITORY_COLOR : value
}

const shrinkPoint = (point: { x: number; y: number }, center: { x: number; y: number }, amount: number) => {
  const dx = point.x - center.x
  const dy = point.y - center.y
  const length = Math.hypot(dx, dy) || 1
  const scale = Math.max(1 - amount / length, 0)
  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  }
}

const shrinkHexCorners = (hex: PositionedHex, gap: number) => {
  if (gap <= 0) return hex.corners
  return hex.corners.map((corner) => shrinkPoint(corner, hex.center, gap))
}

const intersectsBounds = (bounds: Bounds, viewport: VisibleBounds) =>
  bounds.maxX >= viewport.left &&
  bounds.minX <= viewport.right &&
  bounds.maxY >= viewport.top &&
  bounds.minY <= viewport.bottom

const buildCommandLookup = (territories: TerritoryRenderInfo[]) => {
  const map = new Map<TerritoryId, number[][]>()
  territories.forEach((entry) => {
    map.set(
      entry.id,
      entry.outline.map((loop) => loop.flatMap((point) => [point.x, point.y])),
    )
  })
  return map
}

const buildHitAreaLookup = (territories: TerritoryRenderInfo[]) => {
  const map = new Map<TerritoryId, Polygon>()
  territories.forEach((entry) => {
    if (entry.primaryLoop.length >= 3) {
      map.set(entry.id, new Polygon(entry.primaryLoop.flatMap((point) => [point.x, point.y])))
    }
  })
  return map
}

const MapHexLayer = ({
  positionedHexes,
  viewportEvents,
  hexDetailThreshold,
  hexSize,
  territoryColorLookup,
  hoveredTerritory,
  selectedTerritory,
  highlightedTerritory,
  onHover,
  onSelect,
  territoryRenderList,
  territoryRenderMap,
  hexGap,
  outlineWidth,
  showTerritoryLabels,
}: MapHexLayerProps) => {
  const [visibleBounds, setVisibleBounds] = useState<VisibleBounds | null>(() => viewportEvents.getLatestBounds())
  const [showHexFill, setShowHexFill] = useState(() => viewportEvents.getLatestScale() >= hexDetailThreshold)
  const boundsRef = useRef<VisibleBounds | null>(visibleBounds)
  const showHexFillRef = useRef(showHexFill)

  useEffect(() => {
    return viewportEvents.subscribeToBounds((nextBounds) => {
      const previous = boundsRef.current
      if (
        !previous ||
        previous.left !== nextBounds.left ||
        previous.right !== nextBounds.right ||
        previous.top !== nextBounds.top ||
        previous.bottom !== nextBounds.bottom
      ) {
        boundsRef.current = nextBounds
        setVisibleBounds(nextBounds)
      }
    })
  }, [viewportEvents])

  useEffect(() => {
    return viewportEvents.subscribeToScale((scale) => {
      const next = scale >= hexDetailThreshold
      if (showHexFillRef.current !== next) {
        showHexFillRef.current = next
        setShowHexFill(next)
      }
    })
  }, [hexDetailThreshold, viewportEvents])

  const labelEntries = useMemo(() => {
    if (!showTerritoryLabels) return []
    if (!visibleBounds) return territoryRenderList
    return territoryRenderList.filter((entry) => intersectsBounds(entry.bounds, visibleBounds))
  }, [territoryRenderList, visibleBounds, showTerritoryLabels])

  const outlineCommandLookup = useMemo(() => buildCommandLookup(territoryRenderList), [territoryRenderList])
  const hitAreaLookup = useMemo(() => buildHitAreaLookup(territoryRenderList), [territoryRenderList])

  const selectedRenderInfo = selectedTerritory ? territoryRenderMap.get(selectedTerritory) ?? null : null
  const hoveredRenderInfo = hoveredTerritory ? territoryRenderMap.get(hoveredTerritory) ?? null : null
  const highlightedRenderInfo = highlightedTerritory ? territoryRenderMap.get(highlightedTerritory) ?? null : null

  const baseOutlineWidth = Math.max(outlineWidth * 0.45, 1.15)
  const hoverOutlineWidth = Math.max(outlineWidth * 0.75, baseOutlineWidth + 0.5)
  const selectedOutlineWidth = Math.max(outlineWidth, hoverOutlineWidth + 0.5)
  const highlightOutlineWidth = Math.max(outlineWidth * 0.65, baseOutlineWidth + 0.25)

  const drawLoops = (graphics: Graphics, commandSets: number[][]) => {
    commandSets.forEach((commands) => {
      if (commands.length === 0) return
      graphics.poly(commands)
      graphics.closePath()
    })
  }

  const handlePointerOver = (territoryId: TerritoryId) => (event: FederatedPointerEvent) => {
    event.stopPropagation()
    onHover(territoryId)
  }

  const handlePointerOut = (event: FederatedPointerEvent) => {
    event.stopPropagation()
    onHover(null)
  }

  const handlePointerTap = (territoryId: TerritoryId) => (event: FederatedPointerEvent) => {
    event.stopPropagation()
    onSelect(territoryId)
  }

  const visibleHexes = useMemo(() => {
    if (!showHexFill) return []
    if (!visibleBounds) return positionedHexes

    const padding = hexSize > 0 ? hexSize * 8 : 0
    return positionedHexes.filter(
      (hex) =>
        hex.center.x >= visibleBounds.left - padding &&
        hex.center.x <= visibleBounds.right + padding &&
        hex.center.y >= visibleBounds.top - padding &&
        hex.center.y <= visibleBounds.bottom + padding,
    )
  }, [hexSize, positionedHexes, showHexFill, visibleBounds])

  console.log(visibleHexes)
  return (
    <pixiContainer>
      {showHexFill &&
        visibleHexes.map((hex) => {
          const baseColor = colorToNumber(hex.territoryId ? territoryColorLookup.get(hex.territoryId) : undefined)
          const corners = shrinkHexCorners(hex, hexGap)
          const commands = hexPolygonCommands(corners)

          return (
            <pixiGraphics
              key={hex.id}
              draw={(graphics: Graphics) => {
                graphics.clear()
                graphics.poly(commands)
                graphics.fill({ color: baseColor, alpha: TERRITORY_FILL_ALPHA })
              }}
              eventMode="none"
            />
          )
        })}

      {territoryRenderList.map((entry) => {
        const commands = outlineCommandLookup.get(entry.id) ?? []
        const territoryColor = colorToNumber(territoryColorLookup.get(entry.id))
        const baseFillAlpha = showHexFill ? 0.001 : TERRITORY_FILL_ALPHA

        return (
          <pixiGraphics
            key={`territory-base-${entry.id}`}
            draw={(graphics: Graphics) => {
              graphics.clear()
              drawLoops(graphics, commands)

              if (commands.length > 0) {
                graphics.fill({ color: territoryColor, alpha: baseFillAlpha })
                graphics.stroke({
                  width: baseOutlineWidth,
                  color: 0x222222,
                  alignment: 0.5,
                  join: 'round',
                  cap: 'round',
                  alpha: PASSIVE_OUTLINE_ALPHA,
                })
              }

              const hitArea = hitAreaLookup.get(entry.id) ?? null
              graphics.hitArea = hitArea
            }}
            eventMode="static"
            cursor="pointer"
            onPointerOver={handlePointerOver(entry.id)}
            onPointerOut={handlePointerOut}
            onPointerTap={handlePointerTap(entry.id)}
          />
        )
      })}

      {highlightedRenderInfo && (!selectedRenderInfo || highlightedRenderInfo.id !== selectedRenderInfo.id) && (
        <pixiGraphics
          key="territory-highlight-outline"
          draw={(graphics: Graphics) => {
            graphics.clear()
            const commands = outlineCommandLookup.get(highlightedRenderInfo.id) ?? []
            drawLoops(graphics, commands)
            if (commands.length > 0) {
              graphics.fill({ color: HIGHLIGHT_OUTLINE_COLOR, alpha: 0 })
              graphics.stroke({
                width: highlightOutlineWidth,
                color: HIGHLIGHT_OUTLINE_COLOR,
                alignment: 0.5,
                join: 'round',
                cap: 'round',
                alpha: 0.85,
              })
            }
          }}
          eventMode="none"
        />
      )}

      {selectedRenderInfo && selectedRenderInfo.outline.length > 0 && (
        <pixiGraphics
          key="territory-selected-outline"
          draw={(graphics: Graphics) => {
            graphics.clear()
            const commands = outlineCommandLookup.get(selectedRenderInfo.id) ?? []
            drawLoops(graphics, commands)
            if (commands.length > 0) {
              graphics.fill({ color: SELECTED_OUTLINE_COLOR, alpha: 0 })
              graphics.stroke({
                width: selectedOutlineWidth,
                color: SELECTED_OUTLINE_COLOR,
                alignment: 0.5,
                join: 'round',
                cap: 'round',
              })
            }
          }}
          eventMode="none"
        />
      )}

      {hoveredRenderInfo && (!selectedRenderInfo || hoveredRenderInfo.id !== selectedRenderInfo.id) && hoveredRenderInfo.outline.length > 0 && (
        <pixiGraphics
          key="territory-hover-outline"
          draw={(graphics: Graphics) => {
            graphics.clear()
            const commands = outlineCommandLookup.get(hoveredRenderInfo.id) ?? []
            drawLoops(graphics, commands)
            if (commands.length > 0) {
              graphics.fill({ color: HOVER_OUTLINE_COLOR, alpha: 0 })
              graphics.stroke({
                width: hoverOutlineWidth,
                color: HOVER_OUTLINE_COLOR,
                alignment: 0.5,
                join: 'round',
                cap: 'round',
                alpha: 0.95,
              })
            }
          }}
          eventMode="none"
        />
      )}

      {labelEntries.map((entry) => (
        <pixiText
          key={`label-${entry.id}`}
          text={entry.name}
          x={entry.labelPosition.x}
          y={entry.labelPosition.y}
          anchor={0.5}
          eventMode="none"
          style={{
            fill: 0xffffff,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: entry.labelFontSize,
            fontWeight: '600',
            align: 'center',
            wordWrap: true,
            wordWrapWidth: entry.labelMaxWidth,
            breakWords: true,
            lineHeight: entry.labelLineHeight,
            leading: entry.labelLineHeight - entry.labelFontSize,
          }}
        />
      ))}
    </pixiContainer>
  )
}

export default memo(MapHexLayer)
