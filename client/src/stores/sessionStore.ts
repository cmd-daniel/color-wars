import { create } from 'zustand'
import type { StoreApi } from 'zustand'
import type { Room } from 'colyseus.js'
import { getColyseusClient } from '@/lib/colyseusClient'
import { quickMatch as quickMatchApi, createPrivateRoom as createPrivateRoomApi, joinPrivateRoom as joinPrivateRoomApi } from '@/lib/matchmakingApi'
import { getHttpEndpoint } from '@/lib/serverConfig'
import type {
  GameLogEntry,
  GameLogEntryType,
  TrackEventDefinition,
  TrackEventKind,
  TrackEventResult,
  TrackSpace,
  TurnPhase,
  TerritoryInfo,
} from '@/types/game'
import type { TerritoryId } from '@/types/map'

type PurchaseFailureReason = 'invalid-territory' | 'not-active' | 'not-your-turn' | 'already-owned' | 'insufficient-funds'

type PurchaseResultMessage =
  | {
    success: true
    territoryId?: TerritoryId
    territoryName?: string
    cost?: number
    balance?: number
  }
  | {
    success: false
    reason?: PurchaseFailureReason
    cost?: number
    balance?: number
  }

export type GameNotice = {
  kind: 'success' | 'error'
  message: string
}

export type SessionStatus = 'idle' | 'matchmaking' | 'connecting' | 'connected' | 'error'

export interface GamePlayer {
  sessionId: string
  name: string
  icon: string
  connected: boolean
  joinedAt: number
  color: string
  money: number
  position: number
  ownedTerritories: TerritoryId[]
  ready: boolean
}

export type RoomPhase = 'waiting' | 'lobby' | 'active' | 'finished'

export type LobbyPlayer = GamePlayer

export interface ChatEntry {
  senderId: string
  message: string
  timestamp: number
}

export interface GameRoomView {
  roomId: string
  isPrivate: boolean
  isPublic: boolean
  joinCode?: string
  phase: RoomPhase
  leaderId: string
  maxPlayers: number
  minPlayers: number
  startingCash: number
  players: LobbyPlayer[]
  chat: ChatEntry[]
  connectedPlayers: number
  turnPhase: TurnPhase
  currentTurn?: string
  lastRoll?: [number, number]
  round: number
  lastEvent?: TrackEventResult
  trackSpaces: TrackSpace[]
  logs: GameLogEntry[]
  territoryInfo: Record<TerritoryId, TerritoryInfo>
  territoryOwnership: Record<TerritoryId, string | null>
  playerColors: Record<string, string>
  playerOrder: string[]
  mapId?: string
  lobbyEndsAt: number
  waitTimeoutAt: number
}

interface SessionState {
  status: SessionStatus
  error?: string
  playerName: string
  requestedJoinCode: string
  hostedJoinCode?: string
  room?: Room
  roomView?: GameRoomView
  sessionId?: string
  gameNotice?: GameNotice
  isSpectator: boolean
  setPlayerName: (name: string) => void
  setRequestedJoinCode: (code: string) => void
  clearError: () => void
  setGameNotice: (notice?: GameNotice) => void
  clearGameNotice: () => void
  quickMatch: () => Promise<string | null>
  createPrivateRoom: () => Promise<string | null>
  joinPrivateRoom: () => Promise<string | null>
  joinRoomById: (roomId: string, joinCode?: string) => Promise<void>
  leaveRoom: () => Promise<void>
  sendChat: (message: string) => void
  setIcon: (icon: string) => void
  setColor: (color:string) => void
  updateRoomSettings: (settings: { maxPlayers?: number; startingCash?: number; isPublic?: boolean }) => void
  kickPlayer: (sessionId: string) => void
  startGame: () => void
  rollDice: () => void
  endTurn: () => void
  purchaseTerritory: (territoryId: TerritoryId) => void
  toggleReady: () => void
}

const DEFAULT_PLAYER_NAME = 'Commander'
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const PURCHASE_FAILURE_MESSAGES: Record<PurchaseFailureReason, string> = {
  'invalid-territory': 'Unable to identify that territory.',
  'not-active': 'You can only buy territories during an active match.',
  'not-your-turn': 'Wait for your turn before buying a territory.',
  'already-owned': 'That territory is already owned.',
  'insufficient-funds': 'You do not have enough funds for that purchase.',
}

const transformRoomState = (state: any): GameRoomView | undefined => {
  if (!state) {
    return undefined
  }

  const players: GamePlayer[] = []
  if (state.players?.forEach) {
    state.players.forEach((player: any, sessionId: string) => {
      if (!player) {
        return
      }
      const ownedTerritories: TerritoryId[] = []
      if (player.ownedTerritories?.forEach) {
        player.ownedTerritories.forEach((territoryId: string) => {
          if (typeof territoryId === 'string' && territoryId.length > 0) {
            ownedTerritories.push(territoryId)
          }
        })
      }
      players.push({
        sessionId,
        name: player.name ?? 'Player',
        icon: player.icon ?? '',
        connected: Boolean(player.connected),
        joinedAt: Number(player.joinedAt ?? 0),
        color: typeof player.color === 'string' && player.color ? player.color : '#38bdf8',
        money: Number.isFinite(player.money) ? Number(player.money) : 0,
        position: Number.isFinite(player.position) ? Number(player.position) : 0,
        ownedTerritories,
        ready: Boolean(player.ready),
      })
    })
  }

  players.sort((a, b) => a.joinedAt - b.joinedAt)

  const chat: ChatEntry[] = []
  if (state.chatLog?.forEach) {
    state.chatLog.forEach((entry: any) => {
      chat.push({
        senderId: entry.senderId ?? 'unknown',
        message: entry.message ?? '',
        timestamp: Number(entry.timestamp ?? Date.now()),
      })
    })
  }

  const trackSpaces: TrackSpace[] = []
  if (state.trackSpaces?.forEach) {
    state.trackSpaces.forEach((space: any) => {
      if (!space) {
        return
      }
      const trackSpace: TrackSpace = {
        index: Number(space.index ?? 0),
        type: (space.type ?? 'event') as TrackSpace['type'],
        territoryId: space.territoryId ?? undefined,
        label: space.label ?? '',
      }
      if (space.event) {
        const event: TrackEventDefinition = {
          kind: (space.event.kind ?? 'bonus') as TrackEventKind,
          amount: Number(space.event.amount ?? 0),
          description: space.event.description ?? '',
          label: space.event.label ?? '',
        }
        if (Number.isFinite(space.event.min)) {
          event.min = Number(space.event.min)
        }
        if (Number.isFinite(space.event.max)) {
          event.max = Number(space.event.max)
        }
        trackSpace.event = event
      }
      trackSpaces.push(trackSpace)
    })
  }

  const logs: GameLogEntry[] = []
  if (state.logs?.forEach) {
    state.logs.forEach((entry: any) => {
      logs.push({
        id: entry.id ?? `log-${Math.random().toString(36).slice(2)}`,
        timestamp: Number(entry.timestamp ?? Date.now()),
        type: (entry.type ?? 'info') as GameLogEntryType,
        message: entry.message ?? '',
        detail: entry.detail ?? undefined,
      })
    })
  }

  const territoryInfo: Record<TerritoryId, TerritoryInfo> = {}
  if (state.territoryInfo?.forEach) {
    state.territoryInfo.forEach((info: any, territoryId: TerritoryId) => {
      if (!info || typeof territoryId !== 'string') {
        return
      }
      territoryInfo[territoryId] = {
        id: territoryId,
        name: info.name ?? territoryId,
        hexCount: Number(info.hexCount ?? 0),
        cost: Number(info.cost ?? 0),
      }
    })
  }

  const territoryOwnership: Record<TerritoryId, string | null> = {}
  if (state.territoryOwnership?.forEach) {
    state.territoryOwnership.forEach((owner: string, territoryId: TerritoryId) => {
      territoryOwnership[territoryId] = typeof owner === 'string' && owner.length > 0 ? owner : null
    })
  }

  const playerColors: Record<string, string> = {}
  players.forEach((player) => {
    playerColors[player.sessionId] = player.color
  })

  let lastEvent: TrackEventResult | undefined
  if (state.lastEvent && typeof state.lastEvent === 'object' && state.lastEvent.targetPlayerId) {
    lastEvent = {
      kind: (state.lastEvent.kind ?? 'bonus') as TrackEventKind,
      amount: Number(state.lastEvent.amount ?? 0),
      description: state.lastEvent.description ?? '',
      label: state.lastEvent.label ?? '',
      min: Number.isFinite(state.lastEvent.min) ? Number(state.lastEvent.min) : undefined,
      max: Number.isFinite(state.lastEvent.max) ? Number(state.lastEvent.max) : undefined,
      targetPlayerId: state.lastEvent.targetPlayerId ?? '',
    }
  }

  const playerOrder: string[] = []
  if (state.playerOrder?.forEach) {
    state.playerOrder.forEach((sessionId: string) => {
      if (typeof sessionId === 'string') {
        playerOrder.push(sessionId)
      }
    })
  }

  return {
    roomId: state.roomId ?? '',
    isPrivate: Boolean(state.isPrivate),
    isPublic: Boolean(state.isPublic),
    joinCode: state.joinCode ?? undefined,
    phase: (state.phase ?? 'lobby') as RoomPhase,
    leaderId: state.leaderId ?? '',
    maxPlayers: Number(state.maxPlayers ?? players.length),
    minPlayers: Number(state.minPlayers ?? 0),
    startingCash: Number(state.startingCash ?? 1500),
    players,
    chat,
    connectedPlayers: Number(state.connectedPlayers ?? players.length),
    turnPhase: (state.turnPhase ?? 'awaiting-roll') as TurnPhase,
    currentTurn: state.currentTurn ?? undefined,
    lastRoll: (() => {
      // Handle Colyseus ArraySchema - it has forEach method
      if (state.lastRoll?.forEach) {
        const values: number[] = []
        state.lastRoll.forEach((value: any) => {
          const num = Number(value)
          if (Number.isFinite(num) && num >= 1 && num <= 6) {
            values.push(num)
          }
        })
        return values.length === 2 ? [values[0], values[1]] : undefined
      }
      // Fallback for regular arrays
      if (Array.isArray(state.lastRoll) && state.lastRoll.length === 2) {
        const die1 = Number(state.lastRoll[0])
        const die2 = Number(state.lastRoll[1])
        if (Number.isFinite(die1) && Number.isFinite(die2) && die1 >= 1 && die1 <= 6 && die2 >= 1 && die2 <= 6) {
          return [die1, die2]
        }
      }
      return undefined
    })(),
    round: Number.isFinite(state.round) ? Number(state.round) : 1,
    lastEvent,
    trackSpaces,
    logs,
    territoryInfo,
    territoryOwnership,
    playerColors,
    playerOrder,
    mapId: state.mapId ?? undefined,
    lobbyEndsAt: Number(state.lobbyEndsAt ?? 0),
    waitTimeoutAt: Number(state.waitTimeoutAt ?? 0),
  }
}

const resetState = {
  status: 'idle' as SessionStatus,
  error: undefined,
  playerName: DEFAULT_PLAYER_NAME,
  requestedJoinCode: '',
  hostedJoinCode: undefined,
  room: undefined,
  roomView: undefined,
  sessionId: undefined,
  gameNotice: undefined,
  isSpectator: false,
}

// Guest-only mode: Only persist player name for UX convenience
const PLAYER_NAME_KEY = 'color-wars-player-name'

const savePlayerName = (name: string) => {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name)
  } catch (error) {
    console.warn('Failed to save player name to localStorage:', error)
  }
}

const loadPlayerName = (): string => {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) || DEFAULT_PLAYER_NAME
  } catch (error) {
    console.warn('Failed to load player name from localStorage:', error)
    return DEFAULT_PLAYER_NAME
  }
}

export const useSessionStore = create<SessionState>((set, get) => ({
  ...resetState,
  playerName: loadPlayerName(), // Load saved name on initialization
  setPlayerName: (name: string) => {
    savePlayerName(name)
    set({ playerName: name })
  },
  setRequestedJoinCode: (code: string) => set({ requestedJoinCode: code.toUpperCase() }),
  clearError: () => set({ error: undefined }),
  setGameNotice: (notice) => set({ gameNotice: notice }),
  clearGameNotice: () => set({ gameNotice: undefined }),
  quickMatch: async () => {
    console.log('[sessionStore] quickMatch started')
    const { playerName } = get()
    set({ status: 'matchmaking', error: undefined, hostedJoinCode: undefined, roomView: undefined })

    try {
      const payloadName = playerName.trim().length > 0 ? playerName.trim() : DEFAULT_PLAYER_NAME
      console.log('[sessionStore] Calling API with playerName:', payloadName)
      const reservation = await quickMatchApi({ playerName: payloadName })
      console.log('[sessionStore] Got reservation:', reservation)
      const roomId = await attachToRoom(reservation, set, get, undefined)
      console.log('[sessionStore] attachToRoom returned roomId:', roomId)
      return roomId
    } catch (error) {
      console.error('Failed to quick match:', error)
      set({ status: 'error', error: (error as Error).message })
      return null
    }
  },
  createPrivateRoom: async () => {
    const { playerName } = get()
    set({ status: 'matchmaking', error: undefined, hostedJoinCode: undefined, roomView: undefined })
    try {
      const payloadName = playerName.trim().length > 0 ? playerName.trim() : DEFAULT_PLAYER_NAME
      const { joinCode, reservation } = await createPrivateRoomApi({ playerName: payloadName })
      set({ hostedJoinCode: joinCode })
      const roomId = await attachToRoom(reservation, set, get, joinCode)
      return roomId
    } catch (error) {
      console.error(error)
      set({ status: 'error', error: (error as Error).message })
      return null
    }
  },
  joinPrivateRoom: async () => {
    const { playerName, requestedJoinCode } = get()
    if (!requestedJoinCode.trim()) {
      set({ error: 'Enter a join code to continue.' })
      return null
    }

    set({ status: 'matchmaking', error: undefined, roomView: undefined })
    try {
      const payloadName = playerName.trim().length > 0 ? playerName.trim() : DEFAULT_PLAYER_NAME
      const trimmedCode = requestedJoinCode.trim()
      const reservation = await joinPrivateRoomApi({ joinCode: trimmedCode, playerName: payloadName })
      const roomId = await attachToRoom(reservation, set, get, trimmedCode)
      return roomId
    } catch (error) {
      console.error(error)
      set({ status: 'error', error: (error as Error).message })
      return null
    }
  },
  joinRoomById: async (roomId: string, joinCode?: string) => {
    const { playerName, status, room: existingRoom } = get()

    // Guard: Prevent duplicate join attempts
    if (status === 'connecting' || status === 'matchmaking') {
      console.log('[joinRoomById] Already connecting, skipping duplicate join')
      return
    }

    // Guard: If already connected to this exact room, don't rejoin
    if (existingRoom && existingRoom.roomId === roomId && status === 'connected') {
      console.log('[joinRoomById] Already connected to this room')
      return
    }

    // If connected to a different room, leave first
    if (existingRoom && status === 'connected') {
      console.log('[joinRoomById] Leaving current room before joining new one')
      try {
        await existingRoom.leave(true)
      } catch (error) {
        console.warn('Error leaving current room:', error)
      }
    }

    set({ status: 'connecting', error: undefined, roomView: undefined, room: undefined })

    try {
      // Guest-only mode: Always join fresh, no reconnection attempts
      const response = await fetch(`${getHttpEndpoint()}/matchmaking/room/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: playerName.trim() || DEFAULT_PLAYER_NAME,
          joinCode: joinCode,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to join room (${response.status})`)
      }

      const data = await response.json()

      if (data.isSpectator) {
        // Join as spectator if room is full or game is active/finished
        const client = getColyseusClient()
        const room = await client.joinById(roomId, { spectator: true })

        const updateFromState = (state: any) => {
          const roomView = transformRoomState(state)
          set({ status: 'connected', room, roomView, sessionId: room.sessionId, isSpectator: true })
        }

        setupRoomHandlers(room, set, get, updateFromState)
        updateFromState(room.state)
      } else {
        // Join as player
        await attachToRoom(data.reservation, set, get, joinCode)
      }
    } catch (error) {
      console.error('Failed to join room by ID:', error)
      set({ status: 'error', error: (error as Error).message })
      throw error
    }
  },
  leaveRoom: async () => {
    const { room } = get()
    if (room) {
      try {
        await room.leave(true)
      } catch (error) {
        console.warn('Error leaving room:', error)
      }
    }
    // Guest-only mode: No session to clear, just reset state
    set((state) => ({ ...resetState, playerName: state.playerName }))
  },
  sendChat: (message: string) => {
    const trimmed = message.trim()
    if (!trimmed) {
      return
    }

    const { room } = get()
    try {
      room?.send('chat', { message: trimmed })
    } catch (error) {
      console.warn('Unable to send chat message', error)
    }
  },
  setIcon: (icon: string) => {
    const { room } = get()
    try {
      room?.send('setIcon', { icon })
    } catch (error) {
      console.warn('Unable to set icon', error)
    }
  },
  setColor: (color: string) => {
    const { room } = get()
    try {
      room?.send('setColor', { color })
    } catch (error) {
      console.warn('Unable to set color', error)
    }
  },
  updateRoomSettings: (settings: { maxPlayers?: number; startingCash?: number; isPublic?: boolean }) => {
    const { room } = get()
    try {
      room?.send('updateRoomSettings', settings)
    } catch (error) {
      console.warn('Unable to update room settings', error)
    }
  },
  kickPlayer: (sessionId: string) => {
    const { room } = get()
    try {
      room?.send('kickPlayer', { sessionId })
    } catch (error) {
      console.warn('Unable to kick player', error)
    }
  },
  startGame: () => {
    const { room } = get()
    try {
      room?.send('startGame')
    } catch (error) {
      console.warn('Unable to start game', error)
    }
  },
  rollDice: () => {
    const { room } = get()
    if (!room) {
      console.warn('[rollDice] No room connection available')
      return
    }
    try {
      console.log('[rollDice] Sending rollDice message to server')
      room.send('rollDice')
    } catch (error) {
      console.error('[rollDice] Error sending rollDice message:', error)
    }
  },
  endTurn: () => {
    const { room } = get()
    try {
      room?.send('endTurn')
    } catch (error) {
      console.warn('Unable to end turn', error)
    }
  },
  purchaseTerritory: (territoryId: TerritoryId) => {
    if (!territoryId) {
      return
    }
    const { room } = get()
    try {
      set({ gameNotice: undefined })
      room?.send('purchaseTerritory', { territoryId })
    } catch (error) {
      console.warn('Unable to purchase territory', error)
    }
  },
  toggleReady: () => {
    const { room } = get()
    try {
      room?.send('toggleReady')
    } catch (error) {
      console.warn('Unable to toggle ready', error)
    }
  },
}))

type SetStateFn = StoreApi<SessionState>['setState']
type GetStateFn = StoreApi<SessionState>['getState']

const setupRoomHandlers = (
  room: Room,
  set: SetStateFn,
  _get: GetStateFn,
  updateFromState: (state: any) => void
) => {
  room.onStateChange(updateFromState)

  room.onError((code, message) => {
    console.error('Room error', { code, message })
    set({ status: 'error', error: message ? `${message} (${code})` : `Room error (${code})` })
  })

  room.onMessage('purchaseResult', (payload: PurchaseResultMessage) => {
    if (!payload) {
      return
    }

    if (payload.success) {
      const territoryLabel = payload.territoryName ?? payload.territoryId ?? 'territory'
      const costLabel = payload.cost !== undefined ? currencyFormatter.format(payload.cost) : null
      const balanceLabel = payload.balance !== undefined ? currencyFormatter.format(payload.balance) : null
      const pieces: string[] = []
      pieces.push(costLabel ? `Purchased ${territoryLabel} for ${costLabel}` : `Purchased ${territoryLabel}`)
      if (balanceLabel) {
        pieces.push(`Remaining balance: ${balanceLabel}`)
      }
      const message = `${pieces.join('. ')}.`
      set({ gameNotice: { kind: 'success', message } })
      return
    }

    const reason = payload.reason ?? 'invalid-territory'
    const baseMessage = PURCHASE_FAILURE_MESSAGES[reason] ?? 'Unable to purchase this territory.'
    const message =
      reason === 'insufficient-funds' && payload.cost !== undefined
        ? `${baseMessage} It costs ${currencyFormatter.format(payload.cost)}.`
        : baseMessage
    set({ gameNotice: { kind: 'error', message } })
  })

  room.onLeave(() => {
    // Guest-only mode: No session to clear, just reset state
    set((state) => ({ ...resetState, playerName: state.playerName }))
  })
}

const attachToRoom = async (reservation: any, set: SetStateFn, get: GetStateFn, _joinCode?: string): Promise<string | null> => {
  console.log('[attachToRoom] Starting with reservation:', reservation)
  set({ status: 'connecting', error: undefined })
  const client = getColyseusClient()

  let room: Room
  try {
    // Add timeout to prevent hanging indefinitely
    const CONNECTION_TIMEOUT_MS = 10000 // 10 seconds
    const connectionPromise = client.consumeSeatReservation(reservation)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Connection timeout: Unable to connect to room after 10 seconds. Please check your connection and try again.'))
      }, CONNECTION_TIMEOUT_MS)
    })

    room = await Promise.race([connectionPromise, timeoutPromise])
    console.log('[attachToRoom] Connected to room:', room.roomId)
  } catch (error) {
    console.error('Unable to connect to room:', error)
    set({
      status: 'error',
      error: (error as Error).message || 'Unable to connect to the room. Please try again.',
    })
    return null
  }

  const updateFromState = (state: any) => {
    const roomView = transformRoomState(state)
    set({ status: 'connected', room, roomView, sessionId: room.sessionId, isSpectator: false })
  }

  setupRoomHandlers(room, set, get, updateFromState)
  updateFromState(room.state)

  // Guest-only mode: No session persistence needed
  console.log('[attachToRoom] Returning roomId:', room.roomId)
  return room.roomId
}
