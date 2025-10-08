import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Hex } from 'honeycomb-grid'
import MapViewport from '@components/MapViewport'
import styles from './DiceTrack.module.css'
import { GRID_CONFIG, SHOW_DEBUG_POINTS, INNER_EDGE_SPEC } from '@/utils/diceTrackConfig'
import { createHollowGrid, computeViewBox } from '@/utils/gridUtils'
import { buildInnerPathFromSpec } from '@/utils/hexEdgeUtils'
import { useSessionStore } from '@/stores/sessionStore'
import type { GamePlayer } from '@/stores/sessionStore'
import { roundedPolygonPath } from '@components/HexCell'
import type { TrackEventKind, TrackSpace } from '@/types/game'

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

const HOP_DURATION = 280
const STEP_DELAY = 120
const MIN_TRACK_LENGTH = 1
const EMPTY_PLAYERS: GamePlayer[] = []
const EMPTY_TRACK_SPACES: TrackSpace[] = []
const EMPTY_PLAYER_COLORS = Object.freeze({}) as Record<string, string>
const EMPTY_PLAYER_ORDER: string[] = []

interface TokenRenderState {
  center: { x: number; y: number }
  index: number
  hopId: number
  moving: boolean
}

interface PlayerAnimationState {
  currentIndex: number
  queue: number[]
  activeStep: {
    from: number
    to: number
    startTime: number
    endTime: number
  } | null
  pauseUntil: number
  hopId: number
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const DiceTrack = () => {
  const roomView = useSessionStore((state) => state.roomView)
  const sessionId = useSessionStore((state) => state.sessionId)

  const trackGeometry = useMemo(() => {
    const grid = createHollowGrid()
    const hexes = Array.from(grid)
    const viewBox = computeViewBox(grid)
    const innerPath = buildInnerPathFromSpec(grid, INNER_EDGE_SPEC, {
      radius: 3,
      edgeScaleForLoop: 1,
    }).d
    return { hexes, viewBox, innerPath }
  }, [])

  const maskIdRef = useRef(`gridMask-${Math.round(Math.random() * 1_000_000)}`)

  const track = useMemo(
    () => ({
      hexes: trackGeometry.hexes,
      viewBox: trackGeometry.viewBox,
      innerPath: trackGeometry.innerPath,
      maskId: maskIdRef.current,
    }),
    [trackGeometry],
  )

  const trackSpaces = roomView?.trackSpaces ?? EMPTY_TRACK_SPACES
  const players = roomView?.players ?? EMPTY_PLAYERS
  const playerColors = roomView?.playerColors ?? EMPTY_PLAYER_COLORS
  const playerOrder = roomView?.playerOrder ?? EMPTY_PLAYER_ORDER

  const tileCenters = useMemo(
    () => track.hexes.map((hex: Hex) => ({ x: hex.x, y: hex.y })),
    [track.hexes],
  )

  const [renderTokens, setRenderTokens] = useState<Record<string, TokenRenderState>>({})
  const animationStateRef = useRef<Record<string, PlayerAnimationState>>({})
  const frameRef = useRef<number | null>(null)
  const tileCentersRef = useRef(tileCenters)
  const trackLengthRef = useRef(trackSpaces.length)

  useEffect(() => {
    tileCentersRef.current = tileCenters
  }, [tileCenters])

  useEffect(() => {
    trackLengthRef.current = trackSpaces.length
  }, [trackSpaces.length])

  const ensureAnimationFrame = useCallback(
    (step: (time: number) => void) => {
      if (frameRef.current !== null) {
        return
      }
      frameRef.current = requestAnimationFrame(step)
    },
    [],
  )

  useEffect(() => {
    const state = animationStateRef.current
    let hasChanges = false
    const activeIds = new Set<string>()

    players.forEach((player) => {
      activeIds.add(player.sessionId)
      if (!state[player.sessionId]) {
        state[player.sessionId] = {
          currentIndex: player.position,
          queue: [],
          activeStep: null,
          pauseUntil: 0,
          hopId: 0,
        }
        hasChanges = true
      }
    })

    Object.keys(state).forEach((playerId) => {
      if (!activeIds.has(playerId)) {
        delete state[playerId]
        hasChanges = true
      }
    })

    if (hasChanges) {
      setRenderTokens(() => {
        const next: Record<string, TokenRenderState> = {}
        players.forEach((player) => {
          const baseState = state[player.sessionId]
          const center = tileCenters[baseState?.currentIndex ?? player.position] ?? tileCenters[player.position] ?? { x: 0, y: 0 }
          next[player.sessionId] = {
            center,
            index: baseState?.currentIndex ?? player.position,
            hopId: baseState?.hopId ?? 0,
            moving: Boolean(baseState?.activeStep),
          }
        })
        return next
      })
    }
  }, [players, tileCenters])

  const tick = useCallback(
    (time: number) => {
      const state = animationStateRef.current
      const nextRender: Record<string, TokenRenderState> = {}
      let shouldContinue = false

      const tileCentersLocal = tileCentersRef.current
      const trackLength = trackLengthRef.current
      const hopHeight = GRID_CONFIG.hexDimensions * 0.42
      const defaultPoint = { x: 0, y: 0 }

      Object.entries(state).forEach(([playerId, animState]) => {
        if (
          !animState.activeStep &&
          animState.queue.length > 0 &&
          trackLength >= MIN_TRACK_LENGTH &&
          time >= animState.pauseUntil
        ) {
          const nextIndex = animState.queue.shift()
          if (typeof nextIndex === 'number') {
            animState.activeStep = {
              from: animState.currentIndex,
              to: nextIndex,
              startTime: time,
              endTime: time + HOP_DURATION,
            }
            animState.hopId += 1
          }
        }

          const currentCenter = tileCentersLocal[animState.currentIndex] ?? defaultPoint
          let center = currentCenter
          let indexForGrouping = animState.currentIndex
          let moving = false

          if (animState.activeStep) {
            const { from, to, startTime, endTime } = animState.activeStep
            const origin = tileCentersLocal[from] ?? currentCenter
            const target = tileCentersLocal[to] ?? origin
            const duration = Math.max(endTime - startTime, 1)
            const rawProgress = (time - startTime) / duration
            const progress = Math.min(Math.max(rawProgress, 0), 1)
            const eased = easeInOutCubic(progress)
            const lift = Math.sin(Math.PI * eased) * hopHeight

          center = {
            x: origin.x + (target.x - origin.x) * eased,
            y: origin.y + (target.y - origin.y) * eased - lift,
          }
          indexForGrouping = progress < 0.5 ? from : to
          moving = true
          shouldContinue = true

          if (progress >= 1) {
            animState.currentIndex = to
            animState.activeStep = null
            animState.pauseUntil = time + STEP_DELAY
            center = target
            indexForGrouping = to
            moving = false
          }
        } else if (animState.queue.length > 0 || time < animState.pauseUntil) {
          shouldContinue = true
        }

        nextRender[playerId] = {
          center,
          index: indexForGrouping,
          hopId: animState.hopId,
          moving,
        }
      })

      setRenderTokens((prev) => {
        const prevKeys = Object.keys(prev)
        const nextKeys = Object.keys(nextRender)
        if (prevKeys.length !== nextKeys.length) {
          return nextRender
        }

        for (const key of nextKeys) {
          const nextState = nextRender[key]
          const prevState = prev[key]
          if (
            !prevState ||
            prevState.center.x !== nextState.center.x ||
            prevState.center.y !== nextState.center.y ||
            prevState.index !== nextState.index ||
            prevState.hopId !== nextState.hopId ||
            prevState.moving !== nextState.moving
          ) {
            return nextRender
          }
        }
        return prev
      })

      if (shouldContinue) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        frameRef.current = null
      }
    },
    [],
  )

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const state = animationStateRef.current
    const trackLength = trackSpaces.length
    if (trackLength < MIN_TRACK_LENGTH) {
      return
    }

    let hasNewSteps = false

    players.forEach((player) => {
      const animState = state[player.sessionId]
      if (!animState) {
        return
      }

      const finalIndex = (() => {
        if (animState.queue.length > 0) {
          return animState.queue[animState.queue.length - 1]
        }
        if (animState.activeStep) {
          return animState.activeStep.to
        }
        return animState.currentIndex
      })()

      const safeTarget = ((player.position % trackLength) + trackLength) % trackLength
      if (finalIndex === safeTarget) {
        return
      }

      let cursor = finalIndex
      const steps: number[] = []
      const guard = trackLength * 2

      for (let i = 0; i < guard; i += 1) {
        cursor = (cursor + 1) % trackLength
        steps.push(cursor)
        if (cursor === safeTarget) {
          break
        }
      }

      if (steps.length) {
        animState.queue.push(...steps)
        hasNewSteps = true
      }
    })

    if (hasNewSteps) {
      ensureAnimationFrame(tick)
    }
  }, [players, trackSpaces.length, ensureAnimationFrame, tick])

  useEffect(() => {
    const anyActive = Object.values(animationStateRef.current).some(
      (state) => state.activeStep !== null || state.queue.length > 0,
    )
    if (anyActive) {
      ensureAnimationFrame(tick)
    }
  }, [ensureAnimationFrame, tick])

  const tokens = useMemo(() => {
    return players.map((player) => {
      const token = renderTokens[player.sessionId]
      const fallbackIndex = animationStateRef.current[player.sessionId]?.currentIndex ?? player.position
      const index = token?.index ?? fallbackIndex
      const center = token?.center ?? tileCenters[index] ?? { x: 0, y: 0 }
      const hopId = token?.hopId ?? 0
      const moving = token?.moving ?? false

      return {
        player,
        center,
        index,
        hopId,
        moving,
      }
    })
  }, [players, renderTokens, tileCenters])

  const occupancy = useMemo(() => {
    const map = new Map<number, string[]>()
    tokens.forEach(({ player, index }) => {
      const group = map.get(index) ?? []
      group.push(player.sessionId)
      map.set(index, group)
    })
    return map
  }, [tokens])

  const tokenRadius = GRID_CONFIG.hexDimensions * 0.4
  
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

        {track.hexes.map((hex: Hex, index) => {
          const space = trackSpaces[index] ?? { index, type: 'event', label: 'Event' }
          const points = (hex.corners as { x: number; y: number }[]) ?? []
          const path = roundedPolygonPath(points, 1.8, GRID_CONFIG.hexScale)
          const center = tileCenters[index] ?? { x: hex.x, y: hex.y }
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

        {tokens.map(({ player, center, index, hopId }) => {
          const crowd = occupancy.get(index) ?? []
          const crowdIndex = Math.max(0, crowd.indexOf(player.sessionId))
          const angle = (crowdIndex / Math.max(1, crowd.length)) * Math.PI * 2
          const offsetRadius = tokenRadius * 1.35
          const offset = crowd.length > 1
            ? {
                x: Math.cos(angle) * offsetRadius,
                y: Math.sin(angle) * offsetRadius,
              }
            : { x: 0, y: 0 }

          const color = playerColors[player.sessionId] ?? '#f97316'
          const orderIndex = playerOrder.indexOf(player.sessionId)
          const fallbackIndex = players.findIndex((entry) => entry.sessionId === player.sessionId)
          const numericLabel =
            (orderIndex >= 0 ? orderIndex : fallbackIndex >= 0 ? fallbackIndex : 0) + 1
          const label =
            Number.isFinite(numericLabel) && numericLabel > 0
              ? numericLabel.toString()
              : player.sessionId.slice(0, 2).toUpperCase()

          return (
            <g key={player.sessionId} data-hop={hopId} data-self={player.sessionId === sessionId}>
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
                {label}
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
