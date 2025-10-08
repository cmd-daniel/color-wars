import type { TerritoryId } from './map'

export type TurnPhase = 'awaiting-roll' | 'awaiting-end-turn'

export interface PlayerState {
  id: string
  name: string
  money: number
  position: number
  ownedTerritories: TerritoryId[]
}

export type TrackEventKind =
  | 'bonus'
  | 'penalty'
  | 'chest-bonus'
  | 'chest-penalty'
  | 'roll-again'

export interface TrackEventDefinition {
  kind: TrackEventKind
  amount: number
  description: string
  label: string
  min?: number
  max?: number
}

export interface TrackSpace {
  index: number
  type: 'start' | 'territory' | 'event'
  territoryId?: TerritoryId
  label: string
  event?: TrackEventDefinition
}

export interface TrackEventResult extends TrackEventDefinition {
  targetPlayerId: string
}

export interface TerritoryInfo {
  id: TerritoryId
  name: string
  hexCount: number
  cost: number
}

export type GameLogEntryType = 'info' | 'turn' | 'roll' | 'event' | 'purchase'

export interface GameLogEntry {
  id: string
  timestamp: number
  type: GameLogEntryType
  message: string
  detail?: string
}
