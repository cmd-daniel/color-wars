import { create } from 'zustand'
import type { StoreApi } from 'zustand'
import type { Room } from 'colyseus.js'
import { getColyseusClient } from '@/lib/colyseusClient'
import { quickMatch, createPrivateRoom, joinPrivateRoom } from '@/lib/matchmakingApi'

export type SessionStatus = 'idle' | 'matchmaking' | 'connecting' | 'connected' | 'error'

export type RoomPhase = 'waiting' | 'lobby' | 'active' | 'finished'

export interface LobbyPlayer {
  sessionId: string
  name: string
  ready: boolean
  connected: boolean
  joinedAt: number
}

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
}

const DEFAULT_PLAYER_NAME = 'Commander'

const transformRoomState = (state: any): GameRoomView | undefined => {
  if (!state) {
    return undefined
  }

  const players: LobbyPlayer[] = []
  if (state.players?.forEach) {
    state.players.forEach((player: any, sessionId: string) => {
      if (!player) {
        return
      }
      players.push({
        sessionId,
        name: player.name ?? 'Player',
        ready: Boolean(player.ready),
        connected: Boolean(player.connected),
        joinedAt: Number(player.joinedAt ?? 0),
      })
    })
  }

  players.sort((a, b) => a.joinedAt - b.joinedAt)

  const chat: ChatEntry[] = []
  if (Array.isArray(state.chatLog)) {
    state.chatLog.forEach((entry: any) => {
      chat.push({
        senderId: entry.senderId ?? 'unknown',
        message: entry.message ?? '',
        timestamp: Number(entry.timestamp ?? Date.now()),
      })
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
