import { create } from 'zustand'
import type { Hex } from 'honeycomb-grid'
import { createHollowGrid, computeViewBox } from '@/utils/gridUtils'
import { buildInnerPathFromSpec } from '@/utils/hexEdgeUtils'
import { INNER_EDGE_SPEC } from '@/utils/diceTrackConfig'
import type { MapDefinition, TerritoryId } from '@/types/map'
import type {
  PlayerState,
  TrackSpace,
  TurnPhase,
  TerritoryInfo,
  TrackEventResult,
  TrackEventDefinition,
  GameLogEntry,
  GameLogEntryType,
} from '@/types/game'
import { useMapInteractionsStore } from './mapInteractionsStore'

const STARTING_CASH = 600
const PASS_START_INCOME_FALLBACK = 120
const PLAYER_NAMES = ['Nova', 'Orion', 'Vega', 'Lyra']
const PLAYER_COLORS = ['#38bdf8', '#f472b6', '#facc15', '#a855f7']

const currencyFormat = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount)

interface TrackState {
  hexes: Hex[]
  viewBox: string
  innerPath: string
  maskId: string
}

interface OwnershipRecord {
  [territoryId: TerritoryId]: string | null
}

interface GameState {
  track: TrackState
  players: PlayerState[]
  playerColors: Record<string, string>
  currentPlayerIndex: number
  turnPhase: TurnPhase
  lastRoll: number | null
  trackSpaces: TrackSpace[]
  territoryInfo: Record<TerritoryId, TerritoryInfo>
  ownershipByTerritory: OwnershipRecord
  round: number
  mapId: string | null
  lastEvent: TrackEventResult | null
  logs: GameLogEntry[]
  configurePlayers: (count: number) => void
  initializeFromMap: (map: MapDefinition) => void
  rollDice: () => void
  purchaseTerritory: (territoryId: TerritoryId) => void
  endTurn: () => void
  addLog: (message: string, options?: { detail?: string; type?: GameLogEntryType }) => void
}

const trackGrid = createHollowGrid()
const trackHexes = Array.from(trackGrid)
const trackViewBox = computeViewBox(trackGrid)
const trackInnerPath = buildInnerPathFromSpec(trackGrid, INNER_EDGE_SPEC, {
  radius: 3,
  edgeScaleForLoop: 1,
}).d

type ChestConfig = {
  kind: 'chest-bonus' | 'chest-penalty'
  min: number
  max: number
  label: string
  description: string
}

type TrackEventConfig =
  | {
      kind: 'bonus' | 'penalty'
      amount: number
      label: string
      description: string
    }
  | ChestConfig
  | {
      kind: 'roll-again'
      label: string
      description: string
    }

export const TRACK_EVENT_PATTERN: TrackEventConfig[] = [
  { kind: 'bonus', amount: 500, label: '+500', description: 'Windfall supply payout' },
  { kind: 'penalty', amount: 200, label: '-200', description: 'Logistics setback' },
  { kind: 'chest-bonus', min: 150, max: 450, label: '?', description: 'Reward cache' },
  { kind: 'roll-again', label: '↺', description: 'Momentum surge' },
  { kind: 'chest-penalty', min: 120, max: 320, label: '☠', description: 'Sabotage chest' },
  { kind: 'bonus', amount: 300, label: '+300', description: 'Investor boost' },
  { kind: 'penalty', amount: 150, label: '-150', description: 'Maintenance drain' },
]

const pickRandom = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const buildEventDefinition = (config: TrackEventConfig, seedIndex: number): TrackEventDefinition => {
  switch (config.kind) {
    case 'bonus':
    case 'penalty':
      return {
        kind: config.kind,
        amount: config.amount,
        description: config.description,
        label: config.label,
      }
    case 'roll-again':
      return {
        kind: 'roll-again',
        amount: 0,
        description: config.description,
        label: config.label,
      }
    case 'chest-bonus':
    case 'chest-penalty': {
      const offset = seedIndex % 7
      const min = config.min + offset * 5
      const max = config.max + offset * 5
      return {
        kind: config.kind,
        amount: 0,
        description: config.description,
        label: config.label,
        min,
        max,
      }
    }
    default: {
      const exhaustive: never = config
      throw new Error(`Unsupported track event config: ${JSON.stringify(exhaustive)}`)
    }
  }
}

const createTrackSpaces = (): TrackSpace[] => {
  return trackHexes.map((_, index) => {
    if (index === 0) {
      return { index, type: 'start', label: 'Launch' }
    }
    const config = TRACK_EVENT_PATTERN[(index - 1) % TRACK_EVENT_PATTERN.length]
    const event = buildEventDefinition(config, index)
    return {
      index,
      type: 'event',
      label: event.label,
      event,
    }
  })
}

const createPlayers = (count: number): PlayerState[] =>
  Array.from({ length: count }).map((_, index) => ({
    id: `P${index + 1}`,
    name: PLAYER_NAMES[index] ?? `Player ${index + 1}`,
    money: STARTING_CASH,
    position: 0,
    ownedTerritories: [],
  }))

const assignPlayerColors = (players: PlayerState[]): Record<string, string> => {
  const palette = PLAYER_COLORS.length ? PLAYER_COLORS : ['#38bdf8']
  const lookup: Record<string, string> = {}
  players.forEach((player, index) => {
    lookup[player.id] = palette[index % palette.length]
  })
  return lookup
}

const initialPlayers = createPlayers(2)

const computeTerritoryCost = (territory: { hexIds: string[] }): number => {
  const base = 150
  const perHex = 25
  const computed = base + territory.hexIds.length * perHex
  return Math.round(computed)
}

const computePassStartIncome = (player: PlayerState, info: Record<TerritoryId, TerritoryInfo>): number => {
  const total = player.ownedTerritories.reduce((sum, territoryId) => {
    const entry = info[territoryId]
    if (!entry) {
      return sum
    }
    return sum + Math.max(40, Math.round(entry.cost * 0.25))
  }, 0)
  return total > 0 ? total : PASS_START_INCOME_FALLBACK
}

const clearHighlight = () => {
  useMapInteractionsStore.getState().setHighlightedTerritory(null)
}

const highlightTerritory = (territoryId: TerritoryId | null) => {
  useMapInteractionsStore.getState().setHighlightedTerritory(territoryId)
}

export const useGameStore = create<GameState>((set, get) => ({
  track: {
    hexes: trackHexes,
    viewBox: trackViewBox,
    innerPath: trackInnerPath,
    maskId: `gridMask-${Math.round(Math.random() * 1_000_000)}`,
  },
  players: initialPlayers,
  playerColors: assignPlayerColors(initialPlayers),
  currentPlayerIndex: 0,
  turnPhase: 'awaiting-roll',
  lastRoll: null,
  trackSpaces: createTrackSpaces(),
  territoryInfo: {},
  ownershipByTerritory: {},
  round: 1,
  mapId: null,
  lastEvent: null,
  logs: [],
  addLog: (message, options) => {
    const { detail, type = 'info' } = options ?? {}
    const entry: GameLogEntry = {
      id: `log-${Date.now().toString(36)}-${Math.round(Math.random() * 1_000_000).toString(36)}`,
      timestamp: Date.now(),
      message,
      type,
      detail,
    }
    set((state) => {
      const MAX_LOGS = 200
      const next = [...state.logs, entry]
      return { logs: next.slice(-MAX_LOGS) }
    })
  },
  configurePlayers: (count) => {
    const safeCount = Math.min(4, Math.max(2, Math.round(count)))
    const players = createPlayers(safeCount)
    const territoryInfo = get().territoryInfo
    const resetOwnership: OwnershipRecord = {}
    Object.keys(territoryInfo).forEach((territoryId) => {
      resetOwnership[territoryId as TerritoryId] = null
    })
    set({
      players,
      playerColors: assignPlayerColors(players),
      currentPlayerIndex: 0,
      turnPhase: 'awaiting-roll',
      lastRoll: null,
      ownershipByTerritory: resetOwnership,
      round: 1,
      lastEvent: null,
    })
    get().addLog(`Player count set to ${safeCount}`, { type: 'info' })
    clearHighlight()
  },
  initializeFromMap: (map) => {
    const infoEntries: Record<TerritoryId, TerritoryInfo> = {}
    map.territories.forEach((territory) => {
      infoEntries[territory.id] = {
        id: territory.id,
        name: territory.name,
        hexCount: territory.hexIds.length,
        cost: computeTerritoryCost(territory),
      }
    })

    const ownership: OwnershipRecord = {}
    map.territories.forEach((territory) => {
      ownership[territory.id] = null
    })

    set({
      mapId: map.id,
      territoryInfo: infoEntries,
      trackSpaces: createTrackSpaces(),
      ownershipByTerritory: ownership,
      players: get().players.map((player) => ({
        ...player,
        position: 0,
        money: STARTING_CASH,
        ownedTerritories: [],
      })),
      currentPlayerIndex: 0,
      turnPhase: 'awaiting-roll',
      lastRoll: null,
      round: 1,
      lastEvent: null,
    })
    get().addLog(`Loaded map ${map.name}`, { type: 'info' })
    clearHighlight()
  },
  rollDice: () => {
    const state = get()
    if (state.turnPhase !== 'awaiting-roll' || state.players.length === 0) {
      return
    }
    const trackLength = state.trackSpaces.length
    if (trackLength === 0) {
      return
    }

    clearHighlight()
    const roll = Math.floor(Math.random() * 6) + 1
    let passStartReward = 0
    let players = state.players.map((player, index) => {
      if (index !== state.currentPlayerIndex) {
        return player
      }
      const previousPosition = player.position
      const newPosition = (previousPosition + roll) % trackLength
      const passedStart = newPosition < previousPosition
      const income = passedStart ? computePassStartIncome(player, state.territoryInfo) : 0
      if (passedStart) {
        passStartReward = income
      }
      return {
        ...player,
        position: newPosition,
        money: player.money + income,
      }
    })

    const currentPlayer = players[state.currentPlayerIndex]
    const space = state.trackSpaces[currentPlayer.position]
    let lastEvent: TrackEventResult | null = null
    let logDetail = `${currentPlayer.name} rolled a ${roll}`
    if (space?.label) {
      logDetail += ` and landed on ${space.label}`
    }
    const detailParts: string[] = []
    if (passStartReward > 0) {
      detailParts.push(`Collected ${currencyFormat(passStartReward)} for passing Launch`)
    }
    get().addLog(logDetail, {
      type: 'roll',
      detail: detailParts.length ? detailParts.join(' • ') : undefined,
    })

    if (space?.type === 'territory' && space.territoryId) {
      // No automatic prompt; players may purchase manually from the HUD
    }

    let nextPhase: TurnPhase = 'awaiting-end-turn'

    if (space?.type === 'event' && space.event) {
      const baseEvent = space.event
      let amount = baseEvent.amount
      let delta = 0
      let detail = baseEvent.description

      switch (baseEvent.kind) {
        case 'bonus':
          amount = baseEvent.amount
          delta = amount
          detail = baseEvent.description || `Bonus ${currencyFormat(amount)}`
          break
        case 'penalty':
          amount = baseEvent.amount
          delta = -amount
          detail = baseEvent.description || `Penalty ${currencyFormat(amount)}`
          break
        case 'chest-bonus': {
          const min = baseEvent.min ?? 100
          const max = baseEvent.max ?? 400
          amount = pickRandom(min, max)
          delta = amount
          detail = `${baseEvent.description}: ${currencyFormat(amount)}`
          break
        }
        case 'chest-penalty': {
          const min = baseEvent.min ?? 80
          const max = baseEvent.max ?? 320
          amount = pickRandom(min, max)
          delta = -amount
          detail = `${baseEvent.description}: ${currencyFormat(amount)}`
          break
        }
        case 'roll-again': {
          nextPhase = 'awaiting-roll'
          detail = baseEvent.description || 'Roll again'
          amount = 0
          delta = 0
          break
        }
        default:
          break
      }

      if (delta !== 0) {
        players = players.map((player, index) =>
          index === state.currentPlayerIndex
            ? {
                ...player,
                money: Math.max(0, player.money + delta),
              }
            : player,
        )
      }

      const affectedPlayer = players[state.currentPlayerIndex]
      lastEvent = {
        ...baseEvent,
        amount,
        targetPlayerId: affectedPlayer.id,
      }

      const logVerb = delta >= 0 ? 'gained' : 'lost'
      const magnitude = Math.abs(delta)
      const summary =
        baseEvent.kind === 'roll-again'
          ? `${affectedPlayer.name} earned another roll`
          : `${affectedPlayer.name} ${logVerb} ${currencyFormat(magnitude)}`
      get().addLog(summary, { type: 'event', detail })
    }

    set({
      players,
      lastRoll: roll,
      turnPhase: nextPhase,
      lastEvent,
    })
  },
  purchaseTerritory: (territoryId) => {
    if (!territoryId) {
      return
    }

    const state = get()
    const territory = state.territoryInfo[territoryId]
    if (!territory) {
      return
    }

    const currentPlayer = state.players[state.currentPlayerIndex]
    if (!currentPlayer) {
      return
    }

    const owner = state.ownershipByTerritory[territoryId]
    if (owner) {
      return
    }

    const cost = territory.cost
    if (currentPlayer.money < cost) {
      highlightTerritory(territoryId)
      return
    }

    const players = state.players.map((player, index) => {
      if (index !== state.currentPlayerIndex) {
        return player
      }
      const updatedOwned = player.ownedTerritories.includes(territoryId)
        ? player.ownedTerritories
        : [...player.ownedTerritories, territoryId]
      return {
        ...player,
        money: player.money - cost,
        ownedTerritories: updatedOwned,
      }
    })

    const ownership = {
      ...state.ownershipByTerritory,
      [territoryId]: players[state.currentPlayerIndex]?.id ?? null,
    }

    const nextPhase = state.turnPhase === 'awaiting-roll' ? 'awaiting-roll' : 'awaiting-end-turn'

    set({
      players,
      ownershipByTerritory: ownership,
      turnPhase: nextPhase,
    })
    clearHighlight()

    const purchaser = players[state.currentPlayerIndex]
    get().addLog(`${purchaser.name} purchased ${territory.name} for ${currencyFormat(cost)}`, {
      type: 'purchase',
    })
  },
  endTurn: () => {
    const state = get()
    if (state.players.length === 0) {
      return
    }
    if (state.turnPhase === 'awaiting-roll') {
      return
    }

    const nextIndex = (state.currentPlayerIndex + 1) % state.players.length
    const nextRound = nextIndex === 0 ? state.round + 1 : state.round

    set({
      currentPlayerIndex: nextIndex,
      turnPhase: 'awaiting-roll',
      lastRoll: null,
      round: nextRound,
      lastEvent: null,
    })
    clearHighlight()
    const nextPlayer = state.players[nextIndex]
    const message = nextIndex === 0 ? `Round ${nextRound} begins` : `${nextPlayer?.name ?? 'Next player'} is up`
    get().addLog(message, { type: 'turn' })
  },
}))

export const selectPlayerColor = (playerId: string) => useGameStore.getState().playerColors[playerId] ?? '#38bdf8'
