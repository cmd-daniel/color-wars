import { create } from 'zustand'
import type { MapConfig, StateId, StateRegion, HexCell, HexGridConfig, HexBounds } from '../schema/mapConfig'
import { SAMPLE_MAP_CONFIG } from '../sampleData/sampleMap'
import type { ParsedSvgDocument } from '../utils/svgParsing'
import { parseSvgString } from '../utils/svgParsing'
import type { GridOverlayConfig } from '../utils/svgToHex'
import { rasteriseSvgToMap } from '../utils/svgToHex'
import { pixelToAxial } from '../utils/hexGeometry'

interface EditorState {
  map: MapConfig
  selectedStateId: StateId | null
  svgDocument: ParsedSvgDocument | null
  gridOverlay: GridOverlayConfig
  paintMode: 'brush' | 'erase' | 'flood' | 'delete-hex'
  interactionMode: 'view' | 'edit'
  setSelectedState: (stateId: StateId | null) => void
  upsertState: (state: StateRegion) => void
  removeState: (stateId: StateId) => void
  assignHexToState: (hexKey: string, stateId: StateId | null) => void
  setGridConfig: (grid: HexGridConfig) => void
  importMap: (config: MapConfig) => void
  loadSvgDocument: (svgText: string) => void
  clearSvgDocument: () => void
  setGridOverlay: (partial: Partial<GridOverlayConfig>) => void
  generateHexesFromSvg: () => void
  setPaintMode: (mode: EditorState['paintMode']) => void
  paintHex: (hexKey: string) => void
  addHexAtWorldPoint: (point: { x: number; y: number }) => void
  setInteractionMode: (mode: EditorState['interactionMode']) => void
  deleteHex: (hexKey: string) => void
}

const keyForHex = (hex: Pick<HexCell, 'q' | 'r'>) => `${hex.q},${hex.r}`

const recalcBounds = (hexes: HexCell[]): HexBounds => {
  if (!hexes.length) {
    return { minQ: 0, maxQ: 0, minR: 0, maxR: 0 }
  }

  let minQ = Number.POSITIVE_INFINITY
  let maxQ = Number.NEGATIVE_INFINITY
  let minR = Number.POSITIVE_INFINITY
  let maxR = Number.NEGATIVE_INFINITY

  hexes.forEach((hex) => {
    minQ = Math.min(minQ, hex.q)
    maxQ = Math.max(maxQ, hex.q)
    minR = Math.min(minR, hex.r)
    maxR = Math.max(maxR, hex.r)
  })

  return { minQ, maxQ, minR, maxR }
}

export const useMapEditorStore = create<EditorState>((set, get) => ({
  map: SAMPLE_MAP_CONFIG,
  selectedStateId: null,
  svgDocument: null,
  gridOverlay: {
    orientation: SAMPLE_MAP_CONFIG.grid.orientation,
    hexSize: SAMPLE_MAP_CONFIG.grid.hexSize,
    offsetX: 0,
    offsetY: 0,
  },
  paintMode: 'brush',
  interactionMode: 'edit',
  setSelectedState: (stateId) => set({ selectedStateId: stateId }),
  upsertState: (state) =>
    set((current) => {
      const index = current.map.states.findIndex((entry) => entry.id === state.id)
      const nextStates = [...current.map.states]
      if (index >= 0) {
        nextStates[index] = state
      } else {
        nextStates.push(state)
      }

      const nextAdjacency = { ...current.map.adjacencies }
      if (!nextAdjacency[state.id]) {
        nextAdjacency[state.id] = []
      }

      return {
        map: {
          ...current.map,
          states: nextStates,
          adjacencies: nextAdjacency,
        },
      }
    }),
  removeState: (stateId) =>
    set((current) => {
      const nextStates = current.map.states.filter((entry) => entry.id !== stateId)
      const nextHexes = current.map.hexes.map((hex) =>
        hex.stateId === stateId ? { ...hex, stateId: null } : hex,
      )
      const { [stateId]: _removed, ...rest } = current.map.adjacencies
      const cleanedAdjacency: Record<StateId, StateId[]> = {}
      Object.entries(rest).forEach(([key, neighbours]) => {
        cleanedAdjacency[key] = neighbours.filter((entry) => entry !== stateId)
      })

      return {
        map: {
          ...current.map,
          states: nextStates,
          hexes: nextHexes,
          adjacencies: cleanedAdjacency,
        },
        selectedStateId:
          current.selectedStateId === stateId ? null : current.selectedStateId,
      }
    }),
  assignHexToState: (hexKey, stateId) =>
    set((current) => {
      const nextHexes = current.map.hexes.map((hex) => {
        if (keyForHex(hex) !== hexKey) {
          return hex
        }
        return { ...hex, stateId }
      })

      const nextStates = current.map.states.map((state) => {
        const filteredHexes = state.hexIds.filter((id) => id !== hexKey)
        if (state.id === stateId) {
          return {
            ...state,
            hexIds: [...filteredHexes, hexKey].sort(),
          }
        }
        return {
          ...state,
          hexIds: filteredHexes,
        }
      })

      return {
        map: {
          ...current.map,
          hexes: nextHexes,
          states: nextStates,
        },
      }
    }),
  setGridConfig: (grid) =>
    set((current) => ({
      map: {
        ...current.map,
        grid,
      },
    })),
  importMap: (config) =>
    set({
      map: config,
      selectedStateId: null,
      svgDocument: null,
      gridOverlay: {
        orientation: config.grid.orientation,
        hexSize: config.grid.hexSize,
        offsetX: 0,
        offsetY: 0,
      },
    }),
  loadSvgDocument: (svgText) => {
    const parsed = parseSvgString(svgText)
    console.info('[SVG] Loaded document', {
      width: parsed.width,
      height: parsed.height,
      viewBox: parsed.viewBox,
      paths: parsed.paths.length,
    })
    const defaultHexSize = Math.max(4, Math.round(parsed.viewBox.width / 18))
    const defaultOffsetX = parsed.viewBox.x + parsed.viewBox.width / 2
    const defaultOffsetY = parsed.viewBox.y + parsed.viewBox.height / 2
    set((current) => ({
      svgDocument: parsed,
      gridOverlay: {
        ...current.gridOverlay,
        hexSize: defaultHexSize,
        offsetX: defaultOffsetX,
        offsetY: defaultOffsetY,
      },
    }))
  },
  clearSvgDocument: () =>
    set({
      svgDocument: null,
    }),
  setGridOverlay: (partial) =>
    set((current) => ({
      gridOverlay: {
        ...current.gridOverlay,
        ...partial,
      },
    })),
  generateHexesFromSvg: () => {
    const current = get()
    if (!current.svgDocument) {
      return
    }

    const nextMap = rasteriseSvgToMap(current.svgDocument, current.gridOverlay, current.map)
    console.info('[SVG→Hex] Generated', nextMap.hexes.length, 'hexes across', nextMap.states.length, 'states')
    set({
      map: nextMap,
      selectedStateId: null,
    })
  },
  setPaintMode: (mode) => set({ paintMode: mode }),
  setInteractionMode: (mode) => set({ interactionMode: mode }),
  paintHex: (hexKey) => {
    const current = get()
    if (current.interactionMode !== 'edit') {
      return
    }
    const targetHex = current.map.hexes.find((hex) => keyForHex(hex) === hexKey)
    if (!targetHex) {
      return
    }

    if (current.paintMode === 'erase') {
      current.assignHexToState(hexKey, null)
      return
    }

    if (current.paintMode === 'brush') {
      if (!current.selectedStateId) {
        return
      }
      current.assignHexToState(hexKey, current.selectedStateId)
      return
    }

    if (current.paintMode === 'delete-hex') {
      current.deleteHex(hexKey)
      return
    }

    if (current.paintMode === 'flood') {
      const sourceState = current.selectedStateId
      if (!sourceState) {
        return
      }
      const originalState = targetHex.stateId
      if (originalState === sourceState) {
        return
      }

      const visited = new Set<string>()
      const queue: HexCell[] = [targetHex]
      visited.add(hexKey)

      const getNeighbours = (hex: HexCell) => [
        { q: hex.q + 1, r: hex.r - 1, s: hex.s },
        { q: hex.q + 1, r: hex.r, s: hex.s - 1 },
        { q: hex.q, r: hex.r + 1, s: hex.s - 1 },
        { q: hex.q - 1, r: hex.r + 1, s: hex.s },
        { q: hex.q - 1, r: hex.r, s: hex.s + 1 },
        { q: hex.q, r: hex.r - 1, s: hex.s + 1 },
      ]

      const allHexes = current.map.hexes
      const targetKeys: string[] = []

      while (queue.length) {
        const hex = queue.shift()!
        const key = keyForHex(hex)
        targetKeys.push(key)

        getNeighbours(hex).forEach((coord) => {
          const neighbourKey = `${coord.q},${coord.r}`
          if (visited.has(neighbourKey)) {
            return
          }
          const candidate = allHexes.find((entry) => entry.q === coord.q && entry.r === coord.r)
          if (!candidate) {
            return
          }
          if (candidate.stateId !== originalState) {
            return
          }
          visited.add(neighbourKey)
          queue.push(candidate)
        })
      }

      targetKeys.forEach((key) => {
        current.assignHexToState(key, sourceState)
      })
    }
  },
  addHexAtWorldPoint: (point) => {
    const current = get()
    if (current.interactionMode !== 'edit') {
      return
    }
    const { hexSize, orientation } = current.map.grid
    if (!hexSize) {
      return
    }

    const { q, r, s } = pixelToAxial(point.x, point.y, { hexSize, orientation })
    const key = `${q},${r}`
    const existingHex = current.map.hexes.find((hex) => keyForHex(hex) === key)

    if (existingHex) {
      if (current.paintMode === 'erase') {
        current.assignHexToState(key, null)
      } else if (current.paintMode === 'brush' && current.selectedStateId) {
        current.assignHexToState(key, current.selectedStateId)
      }
      return
    }

    const stateId = current.paintMode === 'erase' ? null : current.selectedStateId

    const newHex: HexCell = { q, r, s, stateId: stateId ?? null }
    const nextHexes = [...current.map.hexes, newHex]
    const bounds = recalcBounds(nextHexes)

    let nextStates = current.map.states

    if (stateId) {
      const stateIndex = nextStates.findIndex((state) => state.id === stateId)
      const hexId = `${q},${r}`
      if (stateIndex >= 0) {
        const state = nextStates[stateIndex]
        const updated = new Set(state.hexIds)
        updated.add(hexId)
        nextStates = nextStates.map((entry, index) =>
          index === stateIndex
            ? {
                ...entry,
                hexIds: Array.from(updated.values()).sort(),
              }
            : entry,
        )
      } else {
        const fallbackColor = '#60a5fa'
        nextStates = [
          ...nextStates,
          {
            id: stateId,
            name: stateId,
            displayColor: fallbackColor,
            hexIds: [hexId],
          },
        ]
      }
    }

    set({
      map: {
        ...current.map,
        hexes: nextHexes,
        states: nextStates,
        grid: {
          ...current.map.grid,
          bounds,
          origin: { q: bounds.minQ, r: bounds.minR },
        },
      },
    })
    console.info('[Canvas] Added hex', key, 'state', stateId ?? 'neutral')
  },
  deleteHex: (hexKey) => {
    const current = get()
    const target = current.map.hexes.find((hex) => keyForHex(hex) === hexKey)
    if (!target) {
      return
    }

    const remainingHexes = current.map.hexes.filter((hex) => keyForHex(hex) !== hexKey)
    const nextStates = current.map.states
      .map((state) => {
        const filtered = state.hexIds.filter((id) => id !== hexKey)
        return {
          ...state,
          hexIds: filtered,
        }
      })
      .filter((state) => state.hexIds.length > 0 || state.id !== target.stateId)

    const bounds = recalcBounds(remainingHexes)

    set({
      map: {
        ...current.map,
        hexes: remainingHexes,
        states: nextStates,
        grid: {
          ...current.map.grid,
          bounds,
          origin: { q: bounds.minQ, r: bounds.minR },
        },
      },
    })
    console.info('[Canvas] Removed hex', hexKey)
  },
}))
