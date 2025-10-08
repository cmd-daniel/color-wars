import { create } from 'zustand'
import type { TerritoryId } from '@/types/map'

interface MapInteractionsState {
  selectedTerritory: TerritoryId | null
  hoveredTerritory: TerritoryId | null
  setSelectedTerritory: (territoryId: TerritoryId | null) => void
  setHoveredTerritory: (territoryId: TerritoryId | null) => void
  highlightedTerritory: TerritoryId | null
  setHighlightedTerritory: (territoryId: TerritoryId | null) => void
}

export const useMapInteractionsStore = create<MapInteractionsState>((set) => ({
  selectedTerritory: null,
  hoveredTerritory: null,
  setSelectedTerritory: (territoryId) => set({ selectedTerritory: territoryId }),
  setHoveredTerritory: (territoryId) => set({ hoveredTerritory: territoryId }),
  highlightedTerritory: null,
  setHighlightedTerritory: (territoryId) => set({ highlightedTerritory: territoryId }),
}))
