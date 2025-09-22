export enum TileType {
  PROPERTY = 'property',
  TREASURE_CHEST = 'treasure_chest',
  SURPRISE_CHEST = 'surprise_chest',
  PENALTY_CHEST = 'penalty_chest',
  ROLL_AGAIN = 'roll_again'
}

export interface DiceTrackTile {
  id: string
  type: TileType
  position: number
  title: string
  description?: string
  value?: number // For property values, treasure amounts, penalty amounts
  color?: string // For property tiles
}

export interface PlayerPosition {
  playerId: string
  playerName: string
  position: number
  color: string // Player's color
}

export interface DiceTrackState {
  tiles: DiceTrackTile[]
  playerPositions: PlayerPosition[]
  totalTiles: number
}

// Predefined tile configurations
export const TILE_CONFIGS = {
  [TileType.PROPERTY]: {
    titles: ['Red Base', 'Blue Castle', 'Green Fortress', 'Yellow Tower', 'Purple Palace'],
    colors: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7']
  },
  [TileType.TREASURE_CHEST]: {
    titles: ['Gold Coins', 'Silver Treasure', 'Ancient Artifacts', 'Gem Collection', 'Royal Chest'],
    values: [100, 150, 200, 250, 300]
  },
  [TileType.SURPRISE_CHEST]: {
    titles: ['Mystery Box', 'Lucky Draw', 'Surprise Gift', 'Random Bonus', 'Wonder Chest'],
    descriptions: ['Random reward or challenge awaits!']
  },
  [TileType.PENALTY_CHEST]: {
    titles: ['Tax Collection', 'Fine Payment', 'Repair Costs', 'Tribute Due', 'Penalty Fee'],
    values: [50, 75, 100, 125, 150]
  },
  [TileType.ROLL_AGAIN]: {
    titles: ['Extra Turn', 'Bonus Roll', 'Double Move', 'Lucky Roll', 'Free Move'],
    descriptions: ['Roll the dice again!']
  }
} as const
