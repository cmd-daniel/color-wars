import { create } from 'zustand'
import type { StoreApi } from 'zustand'
import type { Room } from 'colyseus.js'
import { getColyseusClient } from '@/lib/colyseusClient'
import { quickMatch, createPrivateRoom, joinPrivateRoom } from '@/lib/matchmakingApi'
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

export type SessionStatus = 'idle' | 'matchmaking' | 'connecting' | 'connected' | 'error'

export interface GamePlayer {
  sessionId: string
  name: string
  ready: boolean
  connected: boolean
  joinedAt: number
  color: string
  money: number
  position: number
  ownedTerritories: TerritoryId[]
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
  joinCode?: string
  phase: RoomPhase
  lobbyEndsAt: number
  waitTimeoutAt: number
  players: LobbyPlayer[]
  chat: ChatEntry[]
  connectedPlayers: number
  maxPlayers: number
  minPlayers: number
  turnPhase: TurnPhase
  currentTurn?: string
  lastRoll?: number
  round: number
  lastEvent?: TrackEventResult
  trackSpaces: TrackSpace[]
  logs: GameLogEntry[]
  territoryInfo: Record<TerritoryId, TerritoryInfo>
  territoryOwnership: Record<TerritoryId, string | null>
  playerColors: Record<string, string>
  playerOrder: string[]
  mapId?: string
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
  setPlayerName: (name: string) => void
  setRequestedJoinCode: (code: string) => void
  clearError: () => void
  quickMatch: () => Promise<void>
  createPrivateRoom: () => Promise<void>
  joinPrivateRoom: () => Promise<void>
  leaveRoom: () => Promise<void>
  sendChat: (message: string) => void
  setReady: (ready: boolean) => void
  toggleReady: () => void
  rollDice: () => void
  endTurn: () => void
  purchaseTerritory: (territoryId: TerritoryId) => void
}

const DEFAULT_PLAYER_NAME = 'Commander'

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
        ready: Boolean(player.ready),
        connected: Boolean(player.connected),
        joinedAt: Number(player.joinedAt ?? 0),
        color: typeof player.color === 'string' && player.color ? player.color : '#38bdf8',
        money: Number.isFinite(player.money) ? Number(player.money) : 0,
        position: Number.isFinite(player.position) ? Number(player.position) : 0,
        ownedTerritories,
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
    joinCode: state.joinCode ?? undefined,
    phase: (state.phase ?? 'waiting') as RoomPhase,
    lobbyEndsAt: Number(state.lobbyEndsAt ?? 0),
    waitTimeoutAt: Number(state.waitTimeoutAt ?? 0),
    players,
    chat,
    connectedPlayers: Number(state.connectedPlayers ?? players.length),
    maxPlayers: Number(state.maxPlayers ?? players.length),
    minPlayers: Number(state.minPlayers ?? 0),
    turnPhase: (state.turnPhase ?? 'awaiting-roll') as TurnPhase,
    currentTurn: state.currentTurn ?? undefined,
    lastRoll: Number.isFinite(state.lastRoll) ? Number(state.lastRoll) : undefined,
    round: Number.isFinite(state.round) ? Number(state.round) : 1,
    lastEvent,
    trackSpaces,
    logs,
    territoryInfo,
    territoryOwnership,
    playerColors,
    playerOrder,
    mapId: state.mapId ?? undefined,
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
}

export const useSessionStore = create<SessionState>((set, get) => ({
  ...resetState,
  setPlayerName: (name: string) => set({ playerName: name }),
  setRequestedJoinCode: (code: string) => set({ requestedJoinCode: code.toUpperCase() }),
  clearError: () => set({ error: undefined }),
  quickMatch: async () => {
    const { playerName } = get()
    set({ status: 'matchmaking', error: undefined, hostedJoinCode: undefined, roomView: undefined })

    try {
      const payloadName = playerName.trim().length > 0 ? playerName.trim() : DEFAULT_PLAYER_NAME
      const reservation = await quickMatch({ playerName: payloadName })
      await attachToRoom(reservation, set)
    } catch (error) {
      console.error(error)
      set({ status: 'error', error: (error as Error).message })
    }
  },
  createPrivateRoom: async () => {
    const { playerName } = get()
    set({ status: 'matchmaking', error: undefined, hostedJoinCode: undefined, roomView: undefined })
    try {
      const payloadName = playerName.trim().length > 0 ? playerName.trim() : DEFAULT_PLAYER_NAME
      const { joinCode, reservation } = await createPrivateRoom({ playerName: payloadName })
      set({ hostedJoinCode: joinCode })
      await attachToRoom(reservation, set)
    } catch (error) {
      console.error(error)
      set({ status: 'error', error: (error as Error).message })
    }
  },
  joinPrivateRoom: async () => {
    const { playerName, requestedJoinCode } = get()
    if (!requestedJoinCode.trim()) {
      set({ error: 'Enter a join code to continue.' })
      return
    }

    set({ status: 'matchmaking', error: undefined, roomView: undefined })
    try {
      const payloadName = playerName.trim().length > 0 ? playerName.trim() : DEFAULT_PLAYER_NAME
      const reservation = await joinPrivateRoom({ joinCode: requestedJoinCode.trim(), playerName: payloadName })
      await attachToRoom(reservation, set)
    } catch (error) {
      console.error(error)
      set({ status: 'error', error: (error as Error).message })
    }
  },
  leaveRoom: async () => {
    const { room } = get()
    if (room) {
      try {
        await room.leave(true)
      } catch (error) {
        console.warn('Error leaving room', error)
      }
    }
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
  setReady: (ready: boolean) => {
    const { room } = get()
    room?.send('ready', { ready })
  },
  toggleReady: () => {
    const { room, roomView, sessionId } = get()
    if (!room || !roomView || !sessionId) {
      return
    }
    const self = roomView.players.find((player) => player.sessionId === sessionId)
    room.send('ready', { ready: !self?.ready })
  },
  rollDice: () => {
    const { room } = get()
    try {
      room?.send('rollDice')
    } catch (error) {
      console.warn('Unable to roll dice', error)
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
      room?.send('purchaseTerritory', { territoryId })
    } catch (error) {
      console.warn('Unable to purchase territory', error)
    }
  },
}))

type SetStateFn = StoreApi<SessionState>['setState']

const attachToRoom = async (reservation: any, set: SetStateFn) => {
  set({ status: 'connecting', error: undefined })
  const client = getColyseusClient()

  let room: Room
  try {
    room = await client.consumeSeatReservation(reservation)
  } catch (error) {
    console.error('Unable to connect to room', error)
    set({
      status: 'error',
      error: (error as Error).message || 'Unable to connect to the room. Please try again.',
    })
    return
  }

  const updateFromState = (state: any) => {
    const roomView = transformRoomState(state)
    set({ status: 'connected', room, roomView, sessionId: room.sessionId })
  }

  room.onStateChange(updateFromState)

  room.onError((code, message) => {
    console.error('Room error', { code, message })
    set({ status: 'error', error: message ? `${message} (${code})` : `Room error (${code})` })
  })

  room.onLeave(() => {
    set((state) => ({ ...resetState, playerName: state.playerName }))
  })

  updateFromState(room.state)
}
