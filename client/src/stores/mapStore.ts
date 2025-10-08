import { create } from 'zustand'
import type { MapDefinition, PositionedHex, TerritoryId, TerritoryDefinition } from '@/types/map'
import { fetchMapDefinition } from '@/utils/mapLoader'
import { buildPositionedHex } from '@/utils/hexGeometry'
import type { MapDisplayConfig } from '@/utils/mapDisplayConfig'
import { DEFAULT_MAP_DISPLAY_CONFIG, resolveMapDisplayConfig } from '@/utils/mapDisplayConfig'
import { useMapInteractionsStore } from './mapInteractionsStore'
import { useGameStore } from './gameStore'

const CHUNK_WORLD_SIZE = 300

interface MapState {
  map: MapDefinition | null
  positionedHexes: PositionedHex[]
  chunks: Record<string, string[]>
  territoriesById: Record<TerritoryId, TerritoryDefinition>
  loading: boolean
  error: string | null
  displayConfig: MapDisplayConfig
  loadMap: (path?: string) => Promise<void>
}

export const useMapStore = create<MapState>((set) => ({
  map: null,
  positionedHexes: [],
  chunks: {},
  territoriesById: {},
  loading: false,
  error: null,
  displayConfig: { ...DEFAULT_MAP_DISPLAY_CONFIG },
  loadMap: async (path = '/sample-subcontinent.json') => {
    try {
      set({ loading: true, error: null })
      const definition = await fetchMapDefinition(path)

      const territoriesById: Record<TerritoryId, TerritoryDefinition> = {}
      definition.territories.forEach((territory) => {
        territoriesById[territory.id] = territory
      })

      const positionedHexes: PositionedHex[] = definition.hexes.map((hex) =>
        buildPositionedHex(hex.q, hex.r, hex.s, hex.stateId ?? null, definition.grid, CHUNK_WORLD_SIZE),
      )

      const chunks: Record<string, string[]> = {}
      positionedHexes.forEach((hex) => {
        if (!chunks[hex.chunkKey]) {
          chunks[hex.chunkKey] = []
        }
        chunks[hex.chunkKey].push(hex.id)
      })

      set({
        map: definition,
        territoriesById,
        positionedHexes,
        chunks,
        loading: false,
        error: null,
        displayConfig: resolveMapDisplayConfig(definition.metadata ?? null),
      })

      const setSelected = useMapInteractionsStore.getState().setSelectedTerritory
      setSelected(definition.territories[0]?.id ?? null)

      useGameStore.getState().initializeFromMap(definition)
    } catch (error) {
      console.error(error)
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false })
    }
  },
}))
