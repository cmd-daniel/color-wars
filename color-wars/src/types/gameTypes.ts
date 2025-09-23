// Game Types - Core game state interfaces and types

export interface Player {
  id: string
  name: string
  color: string
  money: number
  diceTrackPosition: number
  roundTripsCompleted: number
  canRoll: boolean
  canBuy: boolean
  canEndTurn: boolean
  isActive: boolean
}

export interface HexCell {
  q: number // Hex coordinate q
  r: number // Hex coordinate r  
  s: number // Hex coordinate s
  ring: number // Which ring (0=center, 1=inner, 2=middle, 3=outer)
  ownerId: string | null // Player ID who owns this cell
  cost: number // Cost to purchase this cell
  incomeRate: number // Income rate per round trip
}

export interface GameAction {
  type: 'ROLL_DICE' | 'BUY_HEX' | 'END_TURN'
  playerId: string
  data?: any
}

export interface DiceRollResult {
  value: number
  newPosition: number
  moneyGained: number
  roundTripCompleted: boolean
}

export interface LogEntry {
  id: string
  timestamp: Date
  type: 'dice_roll' | 'hex_purchase' | 'round_trip' | 'turn_start' | 'turn_end' | 'game_start' | 'victory'
  playerId?: string
  playerName?: string
  message: string
  details?: {
    diceValue?: number
    newPosition?: number
    moneyGained?: number
    hexCoordinates?: { q: number; r: number; s: number }
    hexCost?: number
    roundTripIncome?: number
  }
}

export interface GameState {
  // Game Status
  isGameStarted: boolean
  isGameEnded: boolean
  winnerId: string | null
  winCondition: string | null
  
  // Players
  players: Player[]
  currentPlayerIndex: number
  turnOrder: string[] // Player IDs in turn order
  
  // Hex Grid
  hexCells: Map<string, HexCell> // Key: `${q},${r},${s}`
  
  // Dice Track
  diceTrackTiles: any[] // From existing dice track implementation
  
  // Dice State
  dice: {
    currentValue: number
    isRolling: boolean
  }
  
  // Game Settings
  numberOfPlayers: number
  
  // Turn State
  currentTurn: {
    playerId: string
    actionsRemaining: Set<'roll' | 'buy' | 'end'>
    diceRolled: boolean
    purchasesMade: number
  }
  
  // Game Log
  gameLog: LogEntry[]
}

export interface GameStore {
  // State
  state: GameState
  
  // Actions
  initializeGame: (numberOfPlayers: number, playerNames?: string[]) => void
  startGame: () => void
  rollDice: () => DiceRollResult | null
  buyHexCell: (q: number, r: number, s: number) => boolean
  endTurn: () => void
  resetGame: () => void
  
  // Getters
  getCurrentPlayer: () => Player | null
  getPlayerById: (id: string) => Player | null
  getHexCell: (q: number, r: number, s: number) => HexCell | null
  getPlayerHexCells: (playerId: string) => HexCell[]
  checkVictoryCondition: (playerId: string) => boolean
  canPlayerAffordHex: (playerId: string, hexCost: number) => boolean
  getAdjacentHexCells: (q: number, r: number, s: number) => HexCell[]
}

// Utility type for hex coordinates
export type HexCoordinate = {
  q: number
  r: number  
  s: number
}

// Game events for UI updates
export type GameEvent = 
  | { type: 'PLAYER_MOVED'; playerId: string; newPosition: number; moneyGained: number }
  | { type: 'HEX_PURCHASED'; playerId: string; hexCoordinate: HexCoordinate; cost: number }
  | { type: 'ROUND_TRIP_COMPLETED'; playerId: string; income: number }
  | { type: 'TURN_ENDED'; playerId: string; nextPlayerId: string }
  | { type: 'GAME_WON'; winnerId: string; winCondition: string }
  | { type: 'DICE_ROLLED'; playerId: string; value: number }
