export type TerritoryId = string

export interface MapDefinition {
  id: string
  name: string
  version: string
  grid: HexGridConfig
  hexes: HexCellDefinition[]
  territories: TerritoryDefinition[]
  adjacencies: Record<TerritoryId, TerritoryId[]>
  metadata?: Record<string, unknown>
}

export interface HexGridConfig {
  orientation: 'pointy' | 'flat'
  hexSize: number
  origin: AxialCoord
  bounds: HexBounds
  resolutionTag?: string
}

export interface AxialCoord {
  q: number
  r: number
}

export interface HexBounds {
  minQ: number
  maxQ: number
  minR: number
  maxR: number
}

export interface HexCellDefinition {
  q: number
  r: number
  s: number
  stateId: TerritoryId | null
}

export interface TerritoryDefinition {
  id: TerritoryId
  name: string
  displayColor: string
  hexIds: string[]
}

export interface PositionedHex {
  id: string
  q: number
  r: number
  s: number
  territoryId: TerritoryId | null
  center: { x: number; y: number }
  corners: { x: number; y: number }[]
  chunkKey: string
}

export interface Chunk {
  id: string
  hexIds: string[]
}
