import { memo, useMemo } from 'react'
import { Polygon } from 'pixi.js'
import type { Graphics, FederatedPointerEvent } from 'pixi.js'
import type { PositionedHex, TerritoryId } from '@/types/map'
import { hexPolygonCommands } from '@/utils/pixiGeometry'
import type { Bounds, TerritoryRenderInfo } from '@/utils/territoryGeometry'

const TERRITORY_FILL_ALPHA = 0.82
const PASSIVE_OUTLINE_ALPHA = 0.65
const PASSIVE_OUTLINE_LIGHTEN = 0.2
const SELECTED_OUTLINE_COLOR = 0xffffff
const HOVER_OUTLINE_COLOR = 0xfacc15
const DEFAULT_TERRITORY_COLOR = 0x1f2937

interface VisibleBounds {
  left: number
  right: number
  top: number
  bottom: number
}

interface MapHexLayerProps {
  hexes: PositionedHex[]
  territoryColorLookup: Map<TerritoryId, string>
  hoveredTerritory: TerritoryId | null
  selectedTerritory: TerritoryId | null
  onHover: (territoryId: TerritoryId | null) => void
  onSelect: (territoryId: TerritoryId | null) => void
  territoryRenderList: TerritoryRenderInfo[]
  territoryRenderMap: Map<TerritoryId, TerritoryRenderInfo>
  hexGap: number
  outlineWidth: number
  visibleBounds: VisibleBounds | null
  showHexFill: boolean
  showTerritoryLabels: boolean
}

const colorToNumber = (color: string | undefined): number => {
  if (!color) return DEFAULT_TERRITORY_COLOR

  const normalized = color.startsWith('#') ? color.slice(1) : color
  const value = Number.parseInt(normalized, 16)
  return Number.isNaN(value) ? DEFAULT_TERRITORY_COLOR : value
}

const lightenColor = (color: number, amount: number) => {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff

  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount)

  return (mix(r) << 16) | (mix(g) << 8) | mix(b)
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
  hexes,
  territoryColorLookup,
  hoveredTerritory,
  selectedTerritory,
  onHover,
  onSelect,
  territoryRenderList,
  territoryRenderMap,
  hexGap,
  outlineWidth,
  visibleBounds,
  showHexFill,
  showTerritoryLabels,
}: MapHexLayerProps) => {
  const labelEntries = useMemo(() => {
    if (!showTerritoryLabels) return []
    if (!visibleBounds) return territoryRenderList
    return territoryRenderList.filter((entry) => intersectsBounds(entry.bounds, visibleBounds))
  }, [territoryRenderList, visibleBounds, showTerritoryLabels])

  const outlineCommandLookup = useMemo(() => buildCommandLookup(territoryRenderList), [territoryRenderList])
  const hitAreaLookup = useMemo(() => buildHitAreaLookup(territoryRenderList), [territoryRenderList])

  const selectedRenderInfo = selectedTerritory ? territoryRenderMap.get(selectedTerritory) ?? null : null
  const hoveredRenderInfo = hoveredTerritory ? territoryRenderMap.get(hoveredTerritory) ?? null : null

  const baseOutlineWidth = Math.max(outlineWidth * 0.45, 1.15)
  const hoverOutlineWidth = Math.max(outlineWidth * 0.75, baseOutlineWidth + 0.5)
  const selectedOutlineWidth = Math.max(outlineWidth, hoverOutlineWidth + 0.5)

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

  return (
    <pixiContainer>
      {showHexFill &&
        hexes.map((hex) => {
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
        const outlineColor = lightenColor(territoryColor, PASSIVE_OUTLINE_LIGHTEN)

        return (
          <pixiGraphics
            key={`territory-base-${entry.id}`}
            draw={(graphics: Graphics) => {
              graphics.clear()
              drawLoops(graphics, commands)

              if (commands.length > 0) {
                graphics.fill({ color: outlineColor, alpha: 0.001 })
                graphics.stroke({
                  width: baseOutlineWidth,
                  color: outlineColor,
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
