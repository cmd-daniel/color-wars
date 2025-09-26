import type { DiceTrackTile } from '@/types/diceTrack'
import { TileType, TILE_CONFIGS } from '@/types/diceTrack'

/**
 * Generates a random arrangement of dice track tiles
 * @param totalTiles - Total number of tiles to generate (default: 20)
 * @returns Array of DiceTrackTile objects
 */
export function generateRandomDiceTrack(totalTiles: number = 20): DiceTrackTile[] {
  const tiles: DiceTrackTile[] = []
  
  // Define the distribution of tile types
  const tileDistribution = {
    [TileType.PROPERTY]: Math.floor(totalTiles * 0.3), // 30%
    [TileType.TREASURE_CHEST]: Math.floor(totalTiles * 0.25), // 25%
    [TileType.SURPRISE_CHEST]: Math.floor(totalTiles * 0.2), // 20%
    [TileType.PENALTY_CHEST]: Math.floor(totalTiles * 0.15), // 15%
    [TileType.ROLL_AGAIN]: Math.floor(totalTiles * 0.1) // 10%
  }
  
  // Adjust for any rounding differences
  const distributedTiles = Object.values(tileDistribution).reduce((sum, count) => sum + count, 0)
  if (distributedTiles < totalTiles) {
    tileDistribution[TileType.PROPERTY] += totalTiles - distributedTiles
  }
  
  // Create tiles for each type
  Object.entries(tileDistribution).forEach(([type, count]) => {
    const tileType = type as TileType
    for (let i = 0; i < count; i++) {
      tiles.push(createTile(tileType, tiles.length))
    }
  })
  
  // Shuffle the tiles randomly
  return shuffleArray(tiles).map((tile, index) => ({
    ...tile,
    position: index
  }))
}

/**
 * Creates a single tile of the specified type
 */
function createTile(type: TileType, id: number): DiceTrackTile {
  const baseId = `tile-${id}-${type}`
  
  switch (type) {
    case TileType.PROPERTY: {
      const config = TILE_CONFIGS[TileType.PROPERTY]
      const randomIndex = Math.floor(Math.random() * config.titles.length)
      return {
        id: baseId,
        type,
        position: 0, // Will be set later
        title: config.titles[randomIndex],
        color: config.colors[randomIndex],
        value: config.values[randomIndex] // Use predefined property values
      }
    }
    
    case TileType.TREASURE_CHEST: {
      const config = TILE_CONFIGS[TileType.TREASURE_CHEST]
      const randomIndex = Math.floor(Math.random() * config.titles.length)
      return {
        id: baseId,
        type,
        position: 0,
        title: config.titles[randomIndex],
        value: config.values[randomIndex]
      }
    }
    
    case TileType.SURPRISE_CHEST: {
      const config = TILE_CONFIGS[TileType.SURPRISE_CHEST]
      const randomIndex = Math.floor(Math.random() * config.titles.length)
      return {
        id: baseId,
        type,
        position: 0,
        title: config.titles[randomIndex],
        description: config.descriptions[0]
      }
    }
    
    case TileType.PENALTY_CHEST: {
      const config = TILE_CONFIGS[TileType.PENALTY_CHEST]
      const randomIndex = Math.floor(Math.random() * config.titles.length)
      return {
        id: baseId,
        type,
        position: 0,
        title: config.titles[randomIndex],
        value: config.values[randomIndex]
      }
    }
    
    case TileType.ROLL_AGAIN: {
      const config = TILE_CONFIGS[TileType.ROLL_AGAIN]
      const randomIndex = Math.floor(Math.random() * config.titles.length)
      return {
        id: baseId,
        type,
        position: 0,
        title: config.titles[randomIndex],
        description: config.descriptions[0]
      }
    }
    
    case TileType.GO:
      return {
        id: baseId,
        type,
        position: 0,
        title: 'GO',
        description: 'Collect $200',
        value: 200
      }
    
    case TileType.JAIL:
      return {
        id: baseId,
        type,
        position: 0,
        title: 'JAIL',
        description: 'Just Visiting'
      }
    
    case TileType.FREE_PARKING:
      return {
        id: baseId,
        type,
        position: 0,
        title: 'FREE PARKING',
        description: 'Free Parking'
      }
    
    case TileType.GO_TO_JAIL:
      return {
        id: baseId,
        type,
        position: 0,
        title: 'GO TO JAIL',
        description: 'Go directly to Jail'
      }
    
    case TileType.CHANCE:
      return {
        id: baseId,
        type,
        position: 0,
        title: 'CHANCE',
        description: 'Draw a chance card'
      }
    
    case TileType.CORNER:
      return {
        id: baseId,
        type,
        position: 0,
        title: 'CORNER',
        description: 'Special corner'
      }
    
    default:
      throw new Error(`Unknown tile type: ${type}`)
  }
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Get the icon/emoji for each tile type
 */
export function getTileIcon(type: TileType): string {
  switch (type) {
    case TileType.PROPERTY:
      return '🏰'
    case TileType.TREASURE_CHEST:
      return '💰'
    case TileType.SURPRISE_CHEST:
      return '🎁'
    case TileType.PENALTY_CHEST:
      return '💸'
    case TileType.ROLL_AGAIN:
      return '🎲'
    case TileType.GO:
      return '🚀'
    case TileType.JAIL:
      return '🔒'
    case TileType.FREE_PARKING:
      return '🅿️'
    case TileType.GO_TO_JAIL:
      return '🚨'
    case TileType.CHANCE:
      return '❓'
    case TileType.CORNER:
      return '📍'
    default:
      return '❓'
  }
}

/**
 * Get the background color for each tile type
 */
export function getTileBackgroundColor(type: TileType): string {
  switch (type) {
    case TileType.PROPERTY:
      return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    case TileType.TREASURE_CHEST:
      return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    case TileType.SURPRISE_CHEST:
      return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    case TileType.PENALTY_CHEST:
      return 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
    case TileType.ROLL_AGAIN:
      return 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    case TileType.GO:
      return 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'
    case TileType.JAIL:
      return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    case TileType.FREE_PARKING:
      return 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
    case TileType.GO_TO_JAIL:
      return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    case TileType.CHANCE:
      return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
    case TileType.CORNER:
      return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
    default:
      return 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)'
  }
}
