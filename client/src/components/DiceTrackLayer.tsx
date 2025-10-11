import { memo, useEffect, useMemo } from 'react'
import { useApplication } from '@pixi/react'
import type { Hex } from 'honeycomb-grid'
import type { Graphics } from 'pixi.js'
import type { Point } from '@/utils/geometryUtils'
import { GRID_CONFIG } from '@/utils/diceTrackConfig'
import type { TrackEventKind, TrackSpace } from '@/types/game'
import type { GamePlayer } from '@/stores/sessionStore'

interface TrackGeometry {
  hexes: Hex[]
  viewBox: {
    minX: number
    minY: number
    width: number
    height: number
  }
  innerLoop: Point[] | null
}

interface TokenRender {
  player: GamePlayer
  center: { x: number; y: number }
  index: number
  hopId: number
  moving: boolean
}

interface DiceTrackLayerProps {
  size: number
  resolution: number
  offsetX: number
  offsetY: number
  track: TrackGeometry
  trackSpaces: TrackSpace[]
  tileCenters: Array<{ x: number; y: number }>
  tokens: TokenRender[]
  playerColors: Record<string, string>
  playerOrder: string[]
  players: GamePlayer[]
  tokenRadius: number
}

const START_TILE_STYLE = {
  fill: '#0ea5e9',
  stroke: '#e0f2fe',
  icon: '🚀',
  textColor: '#e0f2fe',
}

const INNER_LOOP_RADIUS = 3
const OVERLAY_FILL_COLOR = 0x020617
const OVERLAY_ALPHA = 1

const EVENT_TILE_STYLE: Record<TrackEventKind, { fill: string; stroke: string; icon: string; textColor: string }> = {
  bonus: { fill: '#14532d', stroke: '#22c55e', icon: '💰', textColor: '#dcfce7' },
  penalty: { fill: '#7f1d1d', stroke: '#f97316', icon: '⚠️', textColor: '#fee2e2' },
  'chest-bonus': { fill: '#1e3a8a', stroke: '#60a5fa', icon: '🎁', textColor: '#e0f2fe' },
  'chest-penalty': { fill: '#4c1d95', stroke: '#c084fc', icon: '☠️', textColor: '#ede9fe' },
  'roll-again': { fill: '#0f172a', stroke: '#facc15', icon: '↻', textColor: '#facc15' },
}

const getTileStyle = (type: 'start' | 'event', eventKind?: TrackEventKind) => {
  if (type === 'start') {
    return START_TILE_STYLE
  }
  if (eventKind) {
    return EVENT_TILE_STYLE[eventKind]
  }
  return { fill: '#1f2937', stroke: '#64748b', icon: '•', textColor: '#e2e8f0' }
}

const colorToNumber = (color: string) => {
  const hex = color.startsWith('#') ? color.slice(1) : color
  const value = Number.parseInt(hex, 16)
  return Number.isNaN(value) ? 0xffffff : value
}

const buildRoundedPolygon = (graphics: Graphics, points: Point[], radius: number, scale = 1) => {
  const len = points.length
  if (len < 3) return

  let cx = 0
  let cy = 0
  for (const p of points) {
    cx += p.x
    cy += p.y
  }
  cx /= len
  cy /= len

  const scaled = points.map((p) => ({
    x: cx + (p.x - cx) * scale,
    y: cy + (p.y - cy) * scale,
  }))

  for (let i = 0; i < len; i += 1) {
    const prev = scaled[(i - 1 + len) % len]
    const curr = scaled[i]
    const next = scaled[(i + 1) % len]

    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y }
    const v2 = { x: next.x - curr.x, y: next.y - curr.y }

    const l1 = Math.hypot(v1.x, v1.y) || 1
    const l2 = Math.hypot(v2.x, v2.y) || 1
    const n1 = { x: v1.x / l1, y: v1.y / l1 }
    const n2 = { x: v2.x / l2, y: v2.y / l2 }

    const r = Math.min(radius, l1 / 2, l2 / 2)
    const p1 = { x: curr.x - n1.x * r, y: curr.y - n1.y * r }
    const p2 = { x: curr.x + n2.x * r, y: curr.y + n2.y * r }

    if (i === 0) {
      graphics.moveTo(p1.x, p1.y)
    } else {
      graphics.lineTo(p1.x, p1.y)
    }
    graphics.quadraticCurveTo(curr.x, curr.y, p2.x, p2.y)
  }
  graphics.closePath()
}

const DiceTrackLayer = memo(
  ({
    size,
    resolution,
    offsetX,
    offsetY,
    track,
    trackSpaces,
    tileCenters,
    tokens,
    playerColors,
    playerOrder,
    players,
    tokenRadius,
  }: DiceTrackLayerProps) => {
    const { app } = useApplication()

    const scaleInfo = useMemo(() => {
      const boxWidth = track.viewBox.width || 1
      const boxHeight = track.viewBox.height || 1
      const maxDimension = Math.max(boxWidth, boxHeight)
      const scale = size / maxDimension
      return {
        scale,
      }
    }, [size, track.viewBox.height, track.viewBox.minX, track.viewBox.minY, track.viewBox.width])

    const squareBounds = useMemo(() => {
      const boxWidth = track.viewBox.width || 1
      const boxHeight = track.viewBox.height || 1
      const maxDimension = Math.max(boxWidth, boxHeight)
      const padX = (maxDimension - boxWidth) / 2
      const padY = (maxDimension - boxHeight) / 2
      return {
        x: track.viewBox.minX - padX,
        y: track.viewBox.minY - padY,
        size: maxDimension,
      }
    }, [track.viewBox.height, track.viewBox.minX, track.viewBox.minY, track.viewBox.width])

    const textResolution = useMemo(() => {
      const base = Math.max(1, resolution)
      const scaled = base * Math.max(1, scaleInfo.scale)
      return Math.min(12, scaled)
    }, [resolution, scaleInfo.scale])

    useEffect(() => {
      if (!app) return
      const renderer = app.renderer
      if (!renderer) return
    }, [app])

    const occupancy = useMemo(() => {
      const map = new Map<number, string[]>()
      tokens.forEach(({ player, index }) => {
        const group = map.get(index) ?? []
        group.push(player.sessionId)
        map.set(index, group)
      })
      return map
    }, [tokens])

    const innerLoop = track.innerLoop
    const hasInnerLoop = Array.isArray(innerLoop) && innerLoop.length > 2

    return (
      <pixiContainer label="dice-track-overlay" eventMode="none" position={{ x: offsetX, y: offsetY }}>
        
        <pixiContainer
          position={{
            x: -squareBounds.x * scaleInfo.scale,
            y: -squareBounds.y * scaleInfo.scale,
          }}
          scale={{ x: scaleInfo.scale, y: scaleInfo.scale }}
          sortableChildren
        >
          {hasInnerLoop ? (
            <pixiGraphics
              eventMode="none"
              label="dice-track-overlay-mask"
              draw={(graphics: Graphics) => {
                graphics.clear()
                const padding = GRID_CONFIG.hexDimensions * 4
                const rectX = squareBounds.x - padding
                const rectY = squareBounds.y - padding
                const rectSize = squareBounds.size + padding * 2

                graphics.beginPath()
                graphics.rect(rectX, rectY, rectSize, rectSize)
                graphics.fill({ color: OVERLAY_FILL_COLOR, alpha: OVERLAY_ALPHA })

                graphics.beginPath()
                buildRoundedPolygon(graphics, innerLoop, INNER_LOOP_RADIUS, 1)
                graphics.cut()
              }}
            />
          ) : null}

          {track.hexes.map((hex: Hex, index) => {
            const space = trackSpaces[index] ?? { index, type: 'event', label: 'Event' }
            const corners = (hex.corners as Point[]) ?? []
            const center = tileCenters[index] ?? { x: hex.x, y: hex.y }
            const style = getTileStyle(space.type as 'start' | 'event', space.event?.kind)
            const fillColor = colorToNumber(style.fill)
            const strokeColor = colorToNumber(style.stroke)
            const fontSize = GRID_CONFIG.hexDimensions * 0.55
            const labelFontSize = GRID_CONFIG.hexDimensions * 0.32

            return (
              <pixiContainer key={`${hex.q},${hex.r}`} x={0} y={0}>
                <pixiGraphics
                  draw={(graphics: Graphics) => {
                    graphics.clear()
                    buildRoundedPolygon(graphics, corners, 1.8, GRID_CONFIG.hexScale)
                    graphics.fill({ color: fillColor, alpha: 0.85 })
                    graphics.stroke({
                      width: space.type === 'start' ? 1.6 : 1.1,
                      color: strokeColor,
                      alignment: 0.5,
                      alpha: 0.85,
                      join: 'round',
                    })
                  }}
                />

                <pixiText
                  text={style.icon}
                  x={center.x}
                  y={center.y + fontSize * 0.15 - 3}
                  anchor={{ x: 0.5, y: 0.5 }}
                  resolution={textResolution}
                  style={{
                    fontSize,
                    fill: style.textColor,
                    fontFamily: "'Noto Emoji', 'Segoe UI Emoji', sans-serif",
                  }}
                />

                {space.type === 'event' && space.label ? (
                  <pixiText
                    text={space.label}
                    x={center.x}
                    y={center.y + fontSize * 0.65}
                    anchor={{ x: 0.5, y: 0.5 }}
                    resolution={textResolution}
                    style={{
                      fontSize: labelFontSize,
                      fill: style.textColor,
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  />
                ) : null}

                {space.type === 'start' ? (
                  <pixiText
                    text="START"
                    x={center.x}
                    y={center.y + fontSize * 0.75}
                    anchor={{ x: 0.5, y: 0.5 }}
                    resolution={textResolution}
                    style={{
                      fontSize: labelFontSize,
                      fill: style.textColor,
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  />
                ) : null}
              </pixiContainer>
            )
          })}

          {tokens.map(({ player, center, index }) => {
            const crowd = occupancy.get(index) ?? []
            const crowdIndex = Math.max(0, crowd.indexOf(player.sessionId))
            const angle = (crowdIndex / Math.max(1, crowd.length)) * Math.PI * 2
            const offsetRadius = tokenRadius * 1.35
            const offset =
              crowd.length > 1
                ? {
                    x: Math.cos(angle) * offsetRadius,
                    y: Math.sin(angle) * offsetRadius,
                  }
                : { x: 0, y: 0 }

            const fillColor = colorToNumber(playerColors[player.sessionId] ?? '#f97316')
            const orderIndex = playerOrder.indexOf(player.sessionId)
            const fallbackIndex = players.findIndex((entry) => entry.sessionId === player.sessionId)
            const numericLabel = (orderIndex >= 0 ? orderIndex : fallbackIndex >= 0 ? fallbackIndex : 0) + 1
            const label =
              Number.isFinite(numericLabel) && numericLabel > 0
                ? numericLabel.toString()
                : player.sessionId.slice(0, 2).toUpperCase()

            return (
              <pixiContainer
                key={player.sessionId}
                label={`token-${player.sessionId}`}
                position={{ x: center.x + offset.x, y: center.y + offset.y }}
                eventMode="none"
                sortableChildren
              >
                <pixiGraphics
                  draw={(graphics: Graphics) => {
                    graphics.clear()
                    graphics
                      .circle(0, 0, tokenRadius)
                      .fill({ color: fillColor })
                      .stroke({ width: 1.2, color: 0x0f172a, alignment: 0.5 })
                  }}
                />
                <pixiText
                  text={label}
                  anchor={{ x: 0.5, y: 0.5 }}
                  y={tokenRadius * 0.35}
                  resolution={textResolution}
                  style={{
                    fontSize: tokenRadius * 1.1,
                    fill: '#0f172a',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: '600',
                  }}
                />
              </pixiContainer>
            )
          })}
        </pixiContainer>
      </pixiContainer>
    )
  },
)

DiceTrackLayer.displayName = 'DiceTrackLayer'

export default DiceTrackLayer
