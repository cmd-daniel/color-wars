// Game Configuration - Easily adjustable game rules and constants

export const GAME_CONFIG = {
  // Player Settings
  STARTING_MONEY: 2000,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 6,
  
  // Hex Grid Settings
  HEX_RINGS: {
    LEVEL_1: {
      cost: 500,
      incomeRate: 0.10, // 10% per round trip
      name: 'Outer Ring'
    },
    LEVEL_2: {
      cost: 1000,
      incomeRate: 0.15, // 15% per round trip
      name: 'Middle Ring'
    },
    LEVEL_3: {
      cost: 2500,
      incomeRate: 0.20, // 20% per round trip
      name: 'Inner Ring'
    },
    CENTER: {
      cost: 5000,
      incomeRate: 0.25, // 25% per round trip
      name: 'Center Hex'
    }
  },
  
  // Dice Track Settings
  DICE_TRACK: {
    TOTAL_TILES: 20,
    PROPERTY_INCOME_MULTIPLIER: 1.0, // Multiplier for property tile values
  },
  
  // Victory Conditions
  VICTORY: {
    CLUSTER_SIZE: 7, // 1 center hex + 6 neighbors
    REQUIRED_ADJACENT: 6 // All 6 neighbors must be owned
  },
  
  // Turn Settings
  TURN: {
    ALLOW_DEBT: true, // Players can buy hexes they can't afford
    AUTO_MOVE_ON_ROLL: true, // Automatically move player after dice roll
    REQUIRE_END_TURN: true // Players must explicitly end their turn
  },
  
  // Player Colors (for token display)
  PLAYER_COLORS: [
    '#ef4444', // Red
    '#3b82f6', // Blue
    '#22c55e', // Green
    '#eab308', // Yellow
    '#a855f7', // Purple
    '#f97316'  // Orange
  ],
  
  // Player Names (fallback if not provided)
  DEFAULT_PLAYER_NAMES: [
    'Player 1',
    'Player 2', 
    'Player 3',
    'Player 4',
    'Player 5',
    'Player 6'
  ]
} as const

// Helper function to get hex cost by ring level
export function getHexCostByRing(ring: number): number {
  switch (ring) {
    case 0: return GAME_CONFIG.HEX_RINGS.CENTER.cost
    case 1: return GAME_CONFIG.HEX_RINGS.LEVEL_3.cost
    case 2: return GAME_CONFIG.HEX_RINGS.LEVEL_2.cost
    case 3: return GAME_CONFIG.HEX_RINGS.LEVEL_1.cost
    default: return GAME_CONFIG.HEX_RINGS.LEVEL_1.cost
  }
}

// Helper function to get hex income rate by ring level
export function getHexIncomeRateByRing(ring: number): number {
  switch (ring) {
    case 0: return GAME_CONFIG.HEX_RINGS.CENTER.incomeRate
    case 1: return GAME_CONFIG.HEX_RINGS.LEVEL_3.incomeRate
    case 2: return GAME_CONFIG.HEX_RINGS.LEVEL_2.incomeRate
    case 3: return GAME_CONFIG.HEX_RINGS.LEVEL_1.incomeRate
    default: return GAME_CONFIG.HEX_RINGS.LEVEL_1.incomeRate
  }
}

// Helper function to get hex ring name
export function getHexRingName(ring: number): string {
  switch (ring) {
    case 0: return GAME_CONFIG.HEX_RINGS.CENTER.name
    case 1: return GAME_CONFIG.HEX_RINGS.LEVEL_3.name
    case 2: return GAME_CONFIG.HEX_RINGS.LEVEL_2.name
    case 3: return GAME_CONFIG.HEX_RINGS.LEVEL_1.name
    default: return 'Unknown Ring'
  }
}






