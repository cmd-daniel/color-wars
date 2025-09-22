import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// Types for our game state
interface HexState {
  q: number
  r: number
  color: string
  owner: string | null
  lastUpdated: number
}

interface Player {
  id: string
  name: string
  color: string
  score: number
}

interface GameState {
  // Game data
  hexes: Record<string, HexState> // key: "q,r"
  players: Record<string, Player>
  currentPlayerId: string | null
  isConnected: boolean
  gameStatus: 'waiting' | 'playing' | 'ended'
  
  // Actions
  initializeHex: (q: number, r: number) => void
  claimHex: (q: number, r: number, playerId: string) => void
  setHexColor: (q: number, r: number, color: string) => void
  addPlayer: (player: Player) => void
  setCurrentPlayer: (playerId: string) => void
  setConnectionStatus: (isConnected: boolean) => void
  
  // Game actions
  attemptClaimHex: (q: number, r: number) => boolean
  switchToNextPlayer: () => void
  
  // Utility functions
  getHexKey: (q: number, r: number) => string
  getHex: (q: number, r: number) => HexState | undefined
  getPlayerScore: (playerId: string) => number
  getNextPlayerId: () => string | null
}

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    hexes: {},
    players: {},
    currentPlayerId: null,
    isConnected: false,
    gameStatus: 'waiting',

    // Actions
    initializeHex: (q: number, r: number) => {
      const key = get().getHexKey(q, r)
      
      // Don't reinitialize if hex already exists
      if (get().hexes[key]) {
        return
      }
      
      // console.log('Initializing hex:', key)
      set(state => ({
        hexes: {
          ...state.hexes,
          [key]: {
            q,
            r,
            color: '#303030', // Default gray color
            owner: null,
            lastUpdated: Date.now()
          }
        }
      }))
    },

    claimHex: (q: number, r: number, playerId: string) => {
      const key = get().getHexKey(q, r)
      const player = get().players[playerId]
      
      if (!player) {
        return // Player doesn't exist
      }
      
      set(state => ({
        hexes: {
          ...state.hexes,
          [key]: {
            // Spread existing state if it exists, but provide defaults
            ...(state.hexes[key] || { q, r, color: '#303030', owner: null, lastUpdated: 0 }),
            // Override with new values
            color: player.color,
            owner: playerId,
            lastUpdated: Date.now()
          }
        }
      }))
    },

    setHexColor: (q: number, r: number, color: string) => {
      const key = get().getHexKey(q, r)
      set(state => ({
        hexes: {
          ...state.hexes,
          [key]: {
            ...state.hexes[key],
            color,
            lastUpdated: Date.now()
          }
        }
      }))
    },


    addPlayer: (player: Player) => {
      set(state => ({
        players: {
          ...state.players,
          [player.id]: player
        }
      }))
    },

    setCurrentPlayer: (playerId: string) => {
      set({ currentPlayerId: playerId })
    },

    setConnectionStatus: (isConnected: boolean) => {
      set({ isConnected })
    },

    // Game actions
    attemptClaimHex: (q: number, r: number) => {
      const state = get()
      
      // Check if there's a current player
      if (!state.currentPlayerId) {
        console.log('No current player set')
        return false
      }
      
      // Check if hex is already owned
      const hexKey = state.getHexKey(q, r)
      const existingHex = state.hexes[hexKey]
      if (existingHex?.owner) {
        console.log('Hex already owned by:', existingHex.owner)
        return false
      }
      
      // Claim the hex
      state.claimHex(q, r, state.currentPlayerId)
      
      // Switch to next player immediately
      state.switchToNextPlayer()
      
      return true
    },

    switchToNextPlayer: () => {
      const nextPlayerId = get().getNextPlayerId()
      if (nextPlayerId) {
        set({ currentPlayerId: nextPlayerId })
      }
    },

    // Utility functions
    getHexKey: (q: number, r: number) => `${q},${r}`,

    getHex: (q: number, r: number) => {
      const key = get().getHexKey(q, r)
      return get().hexes[key]
    },

    getPlayerScore: (playerId: string) => {
      const hexes = get().hexes
      return Object.values(hexes).filter(hex => hex.owner === playerId).length
    },

    getNextPlayerId: () => {
      const state = get()
      const players = Object.keys(state.players)
      const currentIndex = players.indexOf(state.currentPlayerId || '')
      
      if (currentIndex === -1) return players[0] || null
      
      return players[(currentIndex + 1) % players.length] || null
    }
  }))
)

// Utility functions for accessing store data
export const getHexState = (q: number, r: number) => {
  const state = useGameStore.getState()
  const key = state.getHexKey(q, r)
  return state.hexes[key]
}

export const getPlayerList = () => {
  const state = useGameStore.getState()
  return Object.values(state.players)
}

export const getCurrentPlayer = () => {
  const state = useGameStore.getState()
  if (!state.currentPlayerId) return null
  return state.players[state.currentPlayerId]
}

export const getGameStats = () => {
  const state = useGameStore.getState()
  return {
    totalHexes: Object.keys(state.hexes).length,
    claimedHexes: Object.values(state.hexes).filter(hex => hex.owner).length,
    isConnected: state.isConnected,
    gameStatus: state.gameStatus
  }
}
