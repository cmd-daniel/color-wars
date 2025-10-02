import { useMemo } from 'react'
import MapViewport from '@components/MapViewport'
import styles from './DiceTrack.module.css'
import { GRID_CONFIG, SHOW_DEBUG_POINTS } from '@/utils/diceTrackConfig'
import { useGameStore } from '@/stores/gameStore'
import { roundedPolygonPath } from '@components/HexCell'
import type { TrackEventKind } from '@/types/game'

const START_TILE_STYLE = {
  fill: '#0ea5e9',
  stroke: '#e0f2fe',
  icon: '🚀',
  textColor: '#e0f2fe',
}

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

const DiceTrack = () => {
  const track = useGameStore((state) => state.track)
  const trackSpaces = useGameStore((state) => state.trackSpaces)
  const players = useGameStore((state) => state.players)
  const playerColors = useGameStore((state) => state.playerColors)

  const occupancy = useMemo(() => {
    const map = new Map<number, string[]>()
    players.forEach((player) => {
      const group = map.get(player.position) ?? []
      group.push(player.id)
      map.set(player.position, group)
    })
    return map
  }, [players])

  const tokenRadius = GRID_CONFIG.hexDimensions * 0.18

  return (
    <div className={styles.container}>
      <div className={styles.mapViewport}>
        <MapViewport className={styles.overlayViewport} background={0x000000} transparent />
      </div>
      <svg
        className={styles.gridSvg}
        viewBox={track.viewBox}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
      >
        <defs>
          <mask id={track.maskId} maskUnits="userSpaceOnUse">
            <rect x={-9999} y={-9999} width={20000} height={20000} fill="white" />
            <path d={track.innerPath} fill="black" />
          </mask>
        </defs>

        <rect
          x={-9999}
          y={-9999}
          width={20000}
          height={20000}
          fill="var(--background)"
          mask={`url(#${track.maskId})`}
          pointerEvents="none"
        />

        {track.hexes.map((hex, index) => {
          const space = trackSpaces[index] ?? { index, type: 'event', label: 'Event' }
          const points = (hex.corners as { x: number; y: number }[]) ?? []
          const path = roundedPolygonPath(points, 1.8, GRID_CONFIG.hexScale)
          const toPoint = (hex as any).toPoint as (() => { x: number; y: number }) | undefined
          const center = toPoint ? toPoint.call(hex) : { x: (hex as any).x ?? 0, y: (hex as any).y ?? 0 }
          const style = getTileStyle(space.type as 'start' | 'event', space.event?.kind)
          const fontSize = GRID_CONFIG.hexDimensions * 0.55
          const labelFontSize = GRID_CONFIG.hexDimensions * 0.32

          return (
            <g key={`${hex.q},${hex.r}`}>
              <path
                d={path}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={space.type === 'start' ? 1.6 : 1.1}
                opacity={0.85}
              />
              <text
                x={center.x}
                y={center.y + fontSize * 0.15 - 3}
                textAnchor="middle"
                fontSize={fontSize}
                fill={style.textColor}
                fontFamily="'Noto Emoji', 'Segoe UI Emoji', sans-serif"
                pointerEvents="none"
              >
                {space.type === 'start' ? style.icon : style.icon}
              </text>
              {space.type === 'event' && space.label && (
                <text
                  x={center.x}
                  y={center.y + fontSize * 0.65}
                  textAnchor="middle"
                  fontSize={labelFontSize}
                  fill={style.textColor}
                  fontFamily="Inter, system-ui, sans-serif"
                  pointerEvents="none"
                >
                  {space.label}
                </text>
              )}
              {space.type === 'start' && (
                <text
                  x={center.x}
                  y={center.y + fontSize * 0.75}
                  textAnchor="middle"
                  fontSize={labelFontSize}
                  fill={style.textColor}
                  fontFamily="Inter, system-ui, sans-serif"
                  pointerEvents="none"
                >
                  START
                </text>
              )}
            </g>
          )
        })}

        {players.map((player) => {
          const hex = track.hexes[player.position]
          if (!hex) {
            return null
          }
          const toPoint = (hex as any).toPoint as (() => { x: number; y: number }) | undefined
          const center = toPoint ? toPoint.call(hex) : { x: (hex as any).x ?? 0, y: (hex as any).y ?? 0 }
          const crowd = occupancy.get(player.position) ?? []
          const index = crowd.indexOf(player.id)
          const angle = (index / Math.max(1, crowd.length)) * Math.PI * 2
          const offsetRadius = tokenRadius * 1.35
          const offset = crowd.length > 1
            ? {
                x: Math.cos(angle) * offsetRadius,
                y: Math.sin(angle) * offsetRadius,
              }
            : { x: 0, y: 0 }

          const color = playerColors[player.id] ?? '#f97316'

          return (
            <g key={player.id}>
              <circle
                cx={center.x + offset.x}
                cy={center.y + offset.y}
                r={tokenRadius}
                fill={color}
                stroke="#0f172a"
                strokeWidth={1.2}
              />
              <text
                x={center.x + offset.x}
                y={center.y + offset.y + tokenRadius * 0.35}
                textAnchor="middle"
                fontSize={tokenRadius * 1.1}
                fill="#0f172a"
                fontFamily="Inter, system-ui, sans-serif"
                pointerEvents="none"
              >
                {player.id.replace('P', '')}
              </text>
            </g>
          )
        })}

        {SHOW_DEBUG_POINTS && track.innerPath && (
          <path d={track.innerPath} fill="transparent" stroke="#0ff" strokeWidth={0.5} />
        )}
      </svg>
    </div>
  )
}

export default DiceTrack
