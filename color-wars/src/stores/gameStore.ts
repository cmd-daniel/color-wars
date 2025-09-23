import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { GameStore, GameState, Player, HexCell, HexCoordinate, LogEntry } from '@/types/gameTypes'
import { GAME_CONFIG, getHexCostByRing, getHexIncomeRateByRing } from '@/lib/gameConfig'
import { generateRandomDiceTrack } from '@/lib/diceTrackUtils'
import { TileType } from '@/types/diceTrack'

// Helper function to generate hex coordinate key
const getHexKey = (q: number, r: number, s: number): string => `${q},${r},${s}`


// Helper function to generate hex grid
const generateHexGrid = (): Map<string, HexCell> => {
  const hexCells = new Map<string, HexCell>()
  
  // Generate hex grid with 3 rings + center (total 4 levels: 0,1,2,3)
  for (let ring = 0; ring <= 3; ring++) {
    if (ring === 0) {
      // Center hex
      const hex: HexCell = {
        q: 0, r: 0, s: 0,
        ring: 0,
        ownerId: null,
        cost: getHexCostByRing(0),
        incomeRate: getHexIncomeRateByRing(0)
      }
      hexCells.set(getHexKey(0, 0, 0), hex)
    } else {
      // Ring hexes
      for (let q = -ring; q <= ring; q++) {
        for (let r = Math.max(-ring, -q - ring); r <= Math.min(ring, -q + ring); r++) {
          const s = -q - r
          if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) === ring) {
            const hex: HexCell = {
              q, r, s,
              ring,
              ownerId: null,
              cost: getHexCostByRing(ring),
              incomeRate: getHexIncomeRateByRing(ring)
            }
            hexCells.set(getHexKey(q, r, s), hex)
          }
        }
      }
    }
  }
  
  return hexCells
}

// Helper function to get adjacent hex coordinates
const getAdjacentCoordinates = (q: number, r: number, s: number): HexCoordinate[] => {
  return [
    { q: q + 1, r: r - 1, s: s },
    { q: q + 1, r: r, s: s - 1 },
    { q: q, r: r + 1, s: s - 1 },
    { q: q - 1, r: r + 1, s: s },
    { q: q - 1, r: r, s: s + 1 },
    { q: q, r: r - 1, s: s + 1 }
  ]
}

// Helper function to create log entries
const createLogEntry = (
  type: LogEntry['type'],
  message: string,
  playerId?: string,
  playerName?: string,
  details?: LogEntry['details']
): LogEntry => ({
  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  timestamp: new Date(),
  type,
  playerId,
  playerName,
  message,
  details
})

const createInitialState = (): GameState => ({
  isGameStarted: false,
  isGameEnded: false,
  winnerId: null,
  winCondition: null,
  players: [],
  currentPlayerIndex: 0,
  turnOrder: [],
  hexCells: new Map(),
  diceTrackTiles: [],
  dice: {
    currentValue: 1,
    isRolling: false
  },
  numberOfPlayers: 0,
  currentTurn: {
    playerId: '',
    actionsRemaining: new Set(['roll', 'buy', 'end']),
    diceRolled: false,
    purchasesMade: 0
  },
  gameLog: []
})

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    state: createInitialState(),

    initializeGame: (numberOfPlayers: number, playerNames?: string[]) => {
      if (numberOfPlayers < GAME_CONFIG.MIN_PLAYERS || numberOfPlayers > GAME_CONFIG.MAX_PLAYERS) {
        throw new Error(`Number of players must be between ${GAME_CONFIG.MIN_PLAYERS} and ${GAME_CONFIG.MAX_PLAYERS}`)
      }

      // Create players
      const players: Player[] = Array.from({ length: numberOfPlayers }, (_, index) => ({
        id: `player-${index + 1}`,
        name: playerNames?.[index] || GAME_CONFIG.DEFAULT_PLAYER_NAMES[index],
        color: GAME_CONFIG.PLAYER_COLORS[index],
        money: GAME_CONFIG.STARTING_MONEY,
        diceTrackPosition: 0,
        roundTripsCompleted: 0,
        canRoll: false,
        canBuy: false,
        canEndTurn: false,
        isActive: false
      }))

      // Randomize turn order
      const turnOrder = [...players.map(p => p.id)].sort(() => Math.random() - 0.5)
      
      // Set first player as active
      players.find(p => p.id === turnOrder[0])!.isActive = true
      players.find(p => p.id === turnOrder[0])!.canRoll = true
      players.find(p => p.id === turnOrder[0])!.canBuy = true
      players.find(p => p.id === turnOrder[0])!.canEndTurn = true

      const gameLogEntry = createLogEntry(
        'game_start',
        `Game initialized with ${numberOfPlayers} players: ${players.map(p => p.name).join(', ')}`
      )

      set({
        state: {
          ...createInitialState(),
          numberOfPlayers,
          players,
          turnOrder,
          hexCells: generateHexGrid(),
          diceTrackTiles: generateRandomDiceTrack(GAME_CONFIG.DICE_TRACK.TOTAL_TILES),
          currentTurn: {
            playerId: turnOrder[0],
            actionsRemaining: new Set(['roll', 'buy', 'end']),
            diceRolled: false,
            purchasesMade: 0
          },
          gameLog: [gameLogEntry]
        }
      })
    },

    startGame: () => {
      const currentPlayer = get().getCurrentPlayer()
      const startLogEntry = createLogEntry(
        'turn_start',
        `Game started! ${currentPlayer?.name || 'Player'} begins the first turn`,
        currentPlayer?.id,
        currentPlayer?.name
      )

      set(state => ({
        state: {
          ...state.state,
          isGameStarted: true,
          gameLog: [...state.state.gameLog, startLogEntry]
        }
      }))
    },

    rollDice: () => {
      const { state } = get()
      const currentPlayer = get().getCurrentPlayer()
      
      if (!currentPlayer || !currentPlayer.canRoll || state.currentTurn.diceRolled || state.dice.isRolling) {
        return null
      }

      // Set rolling state
      set(state => ({
        state: {
          ...state.state,
          dice: {
            ...state.state.dice,
            isRolling: true
          }
        }
      }))

      // Roll dice (1-6)
      const diceValue = Math.floor(Math.random() * 6) + 1
      const oldPosition = currentPlayer.diceTrackPosition
      const trackLength = state.diceTrackTiles.length
      const newPosition = (oldPosition + diceValue) % trackLength
      
      // Check if round trip completed
      const roundTripCompleted = newPosition < oldPosition
      
      // Get money from landed tile
      const landedTile = state.diceTrackTiles[newPosition]
      let moneyGained = 0
      
      console.log(`🎯 Landed on tile: ${landedTile?.title} (${landedTile?.type}) - Value: $${landedTile?.value}`)
      
      if (landedTile && landedTile.value !== undefined) {
        switch (landedTile.type) {
          case TileType.PROPERTY:
            // Property tiles give money based on their value
            moneyGained = landedTile.value
            console.log(`🏰 Property tile: +$${landedTile.value}`)
            break
          case TileType.TREASURE_CHEST:
            // Treasure chests give money
            moneyGained = landedTile.value
            console.log(`💰 Treasure chest: +$${landedTile.value}`)
            break
          case TileType.PENALTY_CHEST:
            // Penalty chests take money (negative value)
            moneyGained = -landedTile.value
            console.log(`💸 Penalty chest: -$${landedTile.value}`)
            break
          case TileType.SURPRISE_CHEST:
            // Surprise chests have random effects (for now, give small bonus)
            moneyGained = Math.floor(Math.random() * 100) + 50
            console.log(`🎁 Surprise chest: +$${moneyGained}`)
            break
          case TileType.ROLL_AGAIN:
            // Roll again tiles don't give money, but allow another roll
            moneyGained = 0
            console.log(`🎲 Roll again: $0`)
            break
        }
      }
      
      console.log(`💰 Total money from tile: ${moneyGained > 0 ? '+' : ''}$${moneyGained}`)

      // Calculate round trip income if completed
      let roundTripIncome = 0
      if (roundTripCompleted) {
        const playerHexes = get().getPlayerHexCells(currentPlayer.id)
        roundTripIncome = playerHexes.reduce((total, hex) => {
          return total + (hex.cost * hex.incomeRate)
        }, 0)
      }

      const totalMoneyGained = moneyGained + roundTripIncome
      
      console.log(`💰 Round trip income: +$${roundTripIncome}`)
      console.log(`💰 Total money gained: ${totalMoneyGained > 0 ? '+' : ''}$${totalMoneyGained}`)
      console.log(`💰 Player money before: $${currentPlayer.money}`)
      console.log(`💰 Player money after: $${currentPlayer.money + totalMoneyGained}`)

      // Create log entry for dice roll
      const diceLogEntry = createLogEntry(
        'dice_roll',
        `${currentPlayer.name} rolled a ${diceValue} and moved to position ${newPosition + 1}${totalMoneyGained !== 0 ? `, ${totalMoneyGained > 0 ? 'gaining' : 'losing'} $${Math.abs(totalMoneyGained)}` : ''}${roundTripCompleted ? ' (Round trip completed!)' : ''}`,
        currentPlayer.id,
        currentPlayer.name,
        {
          diceValue,
          newPosition,
          moneyGained: totalMoneyGained,
          roundTripIncome: roundTripCompleted ? roundTripIncome : undefined
        }
      )

      // Update player and dice state
      set(state => ({
        state: {
          ...state.state,
          players: state.state.players.map(player => 
            player.id === currentPlayer.id
              ? {
                  ...player,
                  diceTrackPosition: newPosition,
                  money: player.money + totalMoneyGained,
                  roundTripsCompleted: player.roundTripsCompleted + (roundTripCompleted ? 1 : 0),
                  canRoll: false // Can only roll once per turn
                }
              : player
          ),
          dice: {
            currentValue: diceValue,
            isRolling: false
          },
          currentTurn: {
            ...state.state.currentTurn,
            diceRolled: true,
            actionsRemaining: new Set([...state.state.currentTurn.actionsRemaining].filter(a => a !== 'roll'))
          },
          gameLog: [...state.state.gameLog, diceLogEntry]
        }
      }))

      return {
        value: diceValue,
        newPosition,
        moneyGained: totalMoneyGained,
        roundTripCompleted
      }
    },

    buyHexCell: (q: number, r: number, s: number) => {
      const currentPlayer = get().getCurrentPlayer()
      const hexCell = get().getHexCell(q, r, s)
      
      if (!currentPlayer || !currentPlayer.canBuy || !hexCell || hexCell.ownerId) {
        return false
      }

      // Check if player can afford the hex
      if (currentPlayer.money < hexCell.cost) {
        return false
      }

      // Create log entry for hex purchase
      const purchaseLogEntry = createLogEntry(
        'hex_purchase',
        `${currentPlayer.name} purchased hex (${q},${r},${s}) for $${hexCell.cost}`,
        currentPlayer.id,
        currentPlayer.name,
        {
          hexCoordinates: { q, r, s },
          hexCost: hexCell.cost
        }
      )

      // Purchase the hex (player has already been verified to have enough money)
      set(state => ({
        state: {
          ...state.state,
          players: state.state.players.map(player =>
            player.id === currentPlayer.id
              ? { ...player, money: player.money - hexCell.cost }
              : player
          ),
          hexCells: new Map(state.state.hexCells).set(
            getHexKey(q, r, s),
            { ...hexCell, ownerId: currentPlayer.id }
          ),
          currentTurn: {
            ...state.state.currentTurn,
            purchasesMade: state.state.currentTurn.purchasesMade + 1
          },
          gameLog: [...state.state.gameLog, purchaseLogEntry]
        }
      }))

      // Check for victory condition
      if (get().checkVictoryCondition(currentPlayer.id)) {
        set(state => ({
          state: {
            ...state.state,
            isGameEnded: true,
            winnerId: currentPlayer.id,
            winCondition: '7-hex cluster completed!'
          }
        }))
      }

      return true
    },

    endTurn: () => {
      const { state } = get()
      const currentPlayerIndex = state.currentPlayerIndex
      const nextPlayerIndex = (currentPlayerIndex + 1) % state.players.length
      const nextPlayerId = state.turnOrder[nextPlayerIndex]
      const currentPlayer = state.players.find(p => p.id === state.currentTurn.playerId)
      const nextPlayer = state.players.find(p => p.id === nextPlayerId)

      // Create log entries for turn end and next turn start
      const endTurnLogEntry = createLogEntry(
        'turn_end',
        `${currentPlayer?.name || 'Player'} ended their turn`,
        currentPlayer?.id,
        currentPlayer?.name
      )

      const nextTurnLogEntry = createLogEntry(
        'turn_start',
        `${nextPlayer?.name || 'Player'}'s turn begins`,
        nextPlayer?.id,
        nextPlayer?.name
      )

      set(state => ({
        state: {
          ...state.state,
          currentPlayerIndex: nextPlayerIndex,
          players: state.state.players.map(player => ({
            ...player,
            isActive: player.id === nextPlayerId,
            canRoll: player.id === nextPlayerId,
            canBuy: player.id === nextPlayerId,
            canEndTurn: player.id === nextPlayerId
          })),
          currentTurn: {
            playerId: nextPlayerId,
            actionsRemaining: new Set(['roll', 'buy', 'end']),
            diceRolled: false,
            purchasesMade: 0
          },
          gameLog: [...state.state.gameLog, endTurnLogEntry, nextTurnLogEntry]
        }
      }))
    },

    resetGame: () => {
      set({ state: createInitialState() })
    },

    // Getters
    getCurrentPlayer: () => {
      const { state } = get()
      return state.players.find(p => p.isActive) || null
    },

    getPlayerById: (id: string) => {
      const { state } = get()
      return state.players.find(p => p.id === id) || null
    },

    getHexCell: (q: number, r: number, s: number) => {
      const { state } = get()
      return state.hexCells.get(getHexKey(q, r, s)) || null
    },

    getPlayerHexCells: (playerId: string) => {
      const { state } = get()
      return Array.from(state.hexCells.values()).filter(hex => hex.ownerId === playerId)
    },

    checkVictoryCondition: (playerId: string) => {
      const playerHexes = get().getPlayerHexCells(playerId)
      
      // Check each owned hex to see if it has all 6 neighbors owned by the same player
      for (const hex of playerHexes) {
        const adjacentCoords = getAdjacentCoordinates(hex.q, hex.r, hex.s)
        const ownedAdjacent = adjacentCoords.filter(coord => {
          const adjacentHex = get().getHexCell(coord.q, coord.r, coord.s)
          return adjacentHex && adjacentHex.ownerId === playerId
        })
        
        if (ownedAdjacent.length === GAME_CONFIG.VICTORY.REQUIRED_ADJACENT) {
          return true // Found a complete 7-hex cluster
        }
      }
      
      return false
    },

    canPlayerAffordHex: (playerId: string, hexCost: number) => {
      const player = get().getPlayerById(playerId)
      return player ? player.money >= hexCost : false
    },

    getAdjacentHexCells: (q: number, r: number, s: number) => {
      const adjacentCoords = getAdjacentCoordinates(q, r, s)
      return adjacentCoords
        .map(coord => get().getHexCell(coord.q, coord.r, coord.s))
        .filter(Boolean) as HexCell[]
    }
  }))
)