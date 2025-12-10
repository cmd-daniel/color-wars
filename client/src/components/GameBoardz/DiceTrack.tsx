import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Hex } from 'honeycomb-grid'
import MapViewport from '@/components/GameBoardz/MapViewport'
import styles from './DiceTrack.module.css'
import { GRID_CONFIG, INNER_EDGE_SPEC } from '@/utils/diceTrackConfig'
import { createHollowGrid, computeViewBox } from '@/utils/gridUtils'
import { buildInnerPathFromSpec } from '@/utils/hexEdgeUtils'
import { useStore } from '@/stores/sessionStore'

const HOP_DURATION = 280
const STEP_DELAY = 120
const MIN_TRACK_LENGTH = 1
const OVERLAY_RESOLUTION_MULTIPLIER = 1.2

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
  // const players = useStore((z) => z.state.game.players)
  //   const trackGeometry = useMemo(() => {
  //   const grid = createHollowGrid()
  //   const hexes = Array.from(grid)
  //   const [minX, minY, width, height] = computeViewBox(grid)
  //     .split(' ')
  //     .map((value) => Number.parseFloat(value))
  //   const inner = buildInnerPathFromSpec(grid, INNER_EDGE_SPEC, {
  //     radius: 3,
  //     edgeScaleForLoop: 1,
  //   })
  //   return {
  //     hexes,
  //     viewBox: {
  //       minX,
  //       minY,
  //       width,
  //       height,
  //     },
  //     innerLoop: inner.loop,
  //   }
  // }, [])
  // const track = trackGeometry

  //const trackSpaces = roomView?.trackSpaces ?? EMPTY_TRACK_SPACES
  // const players = roomView?.players ?? EMPTY_PLAYERS
  // const playerColors = roomView?.playerColors ?? EMPTY_PLAYER_COLORS
  // const playerOrder = roomView?.playerOrder ?? EMPTY_PLAYER_ORDER

  // const tileCenters = useMemo(
  //   () => track.hexes.map((hex: Hex) => ({ x: hex.x, y: hex.y })),
  //   [track.hexes],
  // )

  // const [renderTokens, setRenderTokens] = useState<Record<string, TokenRenderState>>({})
  // const animationStateRef = useRef<Record<string, PlayerAnimationState>>({})
  // const frameRef = useRef<number | null>(null)
  // const tileCentersRef = useRef(tileCenters)

  // useEffect(() => {
  //   tileCentersRef.current = tileCenters
  // }, [tileCenters])

  

  // const ensureAnimationFrame = useCallback(
  //   (step: (time: number) => void) => {
  //     if (frameRef.current !== null) {
  //       return
  //     }
  //     frameRef.current = requestAnimationFrame(step)
  //   },
  //   [],
  // )

  // useEffect(() => {
  //   const state = animationStateRef.current
  //   let hasChanges = false
  //   const activeIds = new Set<string>()

  //   Object.values(players).forEach((player) => {
  //     activeIds.add(player.id)
  //     if (!state[player.id]) {
  //       state[player.id] = {
  //         currentIndex: player.position,
  //         queue: [],
  //         activeStep: null,
  //         pauseUntil: 0,
  //         hopId: 0,
  //       }
  //       hasChanges = true
  //     }
  //   })

  //   Object.keys(state).forEach((playerId) => {
  //     if (!activeIds.has(playerId)) {
  //       delete state[playerId]
  //       hasChanges = true
  //     }
  //   })

  //   if (hasChanges) {
  //     setRenderTokens(() => {
  //       const next: Record<string, TokenRenderState> = {}
  //       Object.values(players).forEach((player) => {
  //         const baseState = state[player.id]
  //         const center = tileCenters[baseState?.currentIndex ?? player.position] ?? tileCenters[player.position] ?? { x: 0, y: 0 }
  //         next[player.id] = {
  //           center,
  //           index: baseState?.currentIndex ?? player.position,
  //           hopId: baseState?.hopId ?? 0,
  //           moving: Boolean(baseState?.activeStep),
  //         }
  //       })
  //       return next
  //     })
  //   }
  // }, [players, tileCenters])

  // const tick = useCallback(
  //   (time: number) => {
  //     const state = animationStateRef.current
  //     const nextRender: Record<string, TokenRenderState> = {}
  //     let shouldContinue = false

  //     const tileCentersLocal = tileCentersRef.current
  //     const trackLength = 34
  //     const hopHeight = GRID_CONFIG.hexDimensions * 0.42
  //     const defaultPoint = { x: 0, y: 0 }

  //     Object.entries(state).forEach(([playerId, animState]) => {
  //       if (
  //         !animState.activeStep &&
  //         animState.queue.length > 0 &&
  //         trackLength >= MIN_TRACK_LENGTH &&
  //         time >= animState.pauseUntil
  //       ) {
  //         const nextIndex = animState.queue.shift()
  //         if (typeof nextIndex === 'number') {
  //           animState.activeStep = {
  //             from: animState.currentIndex,
  //             to: nextIndex,
  //             startTime: time,
  //             endTime: time + HOP_DURATION,
  //           }
  //           animState.hopId += 1
  //         }
  //       }

  //         const currentCenter = tileCentersLocal[animState.currentIndex] ?? defaultPoint
  //         let center = currentCenter
  //         let indexForGrouping = animState.currentIndex
  //         let moving = false

  //         if (animState.activeStep) {
  //           const { from, to, startTime, endTime } = animState.activeStep
  //           const origin = tileCentersLocal[from] ?? currentCenter
  //           const target = tileCentersLocal[to] ?? origin
  //           const duration = Math.max(endTime - startTime, 1)
  //           const rawProgress = (time - startTime) / duration
  //           const progress = Math.min(Math.max(rawProgress, 0), 1)
  //           const eased = easeInOutCubic(progress)
  //           const lift = Math.sin(Math.PI * eased) * hopHeight

  //         center = {
  //           x: origin.x + (target.x - origin.x) * eased,
  //           y: origin.y + (target.y - origin.y) * eased - lift,
  //         }
  //         indexForGrouping = progress < 0.5 ? from : to
  //         moving = true
  //         shouldContinue = true

  //         if (progress >= 1) {
  //           animState.currentIndex = to
  //           animState.activeStep = null
  //           animState.pauseUntil = time + STEP_DELAY
  //           center = target
  //           indexForGrouping = to
  //           moving = false
  //         }
  //       } else if (animState.queue.length > 0 || time < animState.pauseUntil) {
  //         shouldContinue = true
  //       }

  //       nextRender[playerId] = {
  //         center,
  //         index: indexForGrouping,
  //         hopId: animState.hopId,
  //         moving,
  //       }
  //     })

  //     setRenderTokens((prev) => {
  //       const prevKeys = Object.keys(prev)
  //       const nextKeys = Object.keys(nextRender)
  //       if (prevKeys.length !== nextKeys.length) {
  //         return nextRender
  //       }

  //       for (const key of nextKeys) {
  //         const nextState = nextRender[key]
  //         const prevState = prev[key]
  //         if (
  //           !prevState ||
  //           prevState.center.x !== nextState.center.x ||
  //           prevState.center.y !== nextState.center.y ||
  //           prevState.index !== nextState.index ||
  //           prevState.hopId !== nextState.hopId ||
  //           prevState.moving !== nextState.moving
  //         ) {
  //           return nextRender
  //         }
  //       }
  //       return prev
  //     })

  //     if (shouldContinue) {
  //       frameRef.current = requestAnimationFrame(tick)
  //     } else {
  //       frameRef.current = null
  //     }
  //   },
  //   [],
  // )

  // useEffect(() => {
  //   return () => {
  //     if (frameRef.current !== null) {
  //       cancelAnimationFrame(frameRef.current)
  //       frameRef.current = null
  //     }
  //   }
  // }, [])

  // useEffect(() => {
  //   const state = animationStateRef.current
  //   const trackLength = 34
  //   if (trackLength < MIN_TRACK_LENGTH) {
  //     return
  //   }

  //   let hasNewSteps = false

  //   Object.values(players).forEach((player) => {
  //     const animState = state[player.id]
  //     if (!animState) {
  //       return
  //     }

  //     const finalIndex = (() => {
  //       if (animState.queue.length > 0) {
  //         return animState.queue[animState.queue.length - 1]
  //       }
  //       if (animState.activeStep) {
  //         return animState.activeStep.to
  //       }
  //       return animState.currentIndex
  //     })()

  //     const safeTarget = ((player.position % trackLength) + trackLength) % trackLength
  //     if (finalIndex === safeTarget) {
  //       return
  //     }

  //     let cursor = finalIndex
  //     const steps: number[] = []
  //     const guard = trackLength * 2

  //     for (let i = 0; i < guard; i += 1) {
  //       cursor = (cursor + 1) % trackLength
  //       steps.push(cursor)
  //       if (cursor === safeTarget) {
  //         break
  //       }
  //     }

  //     if (steps.length) {
  //       animState.queue.push(...steps)
  //       hasNewSteps = true
  //     }
  //   })

  //   if (hasNewSteps) {
  //     ensureAnimationFrame(tick)
  //   }
  // }, [players, ensureAnimationFrame, tick])

  // useEffect(() => {
  //   const anyActive = Object.values(animationStateRef.current).some(
  //     (state) => state.activeStep !== null || state.queue.length > 0,
  //   )
  //   if (anyActive) {
  //     ensureAnimationFrame(tick)
  //   }
  // }, [ensureAnimationFrame, tick])

  return (
    
    // <div className={styles.container}>
        <div className='w-full h-full relative flex items-center justify-center aspect-[1] overflow-hidden'>
            <MapViewport/>
        </div>
  )
}

export default DiceTrack
