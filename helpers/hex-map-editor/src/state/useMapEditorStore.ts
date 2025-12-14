import { create } from "zustand";
import type {
  MapConfig,
  TerritoryId,
  Territory,
  HexCell,
  HexGridConfig,
  HexBounds,
} from "../schema/mapConfig";
import { SAMPLE_MAP_CONFIG } from "../sampleData/sampleMap";
import type { ParsedSvgDocument } from "../utils/svgParsing";
import { parseSvgString } from "../utils/svgParsing";
import type { GridOverlayConfig } from "../utils/svgToHex";
import { rasteriseSvgToMap } from "../utils/svgToHex";
import { withRecomputedAdjacency } from "../utils/adjacency";
import { validateMap, type ValidationIssue } from "../utils/validation";
import { pixelToAxial } from "../utils/hexGeometry";

interface EditorState {
  map: MapConfig;
  selectedStateId: TerritoryId | null;
  svgDocument: ParsedSvgDocument | null;
  gridOverlay: GridOverlayConfig;
  paintMode: "brush" | "erase" | "flood" | "delete-hex";
  interactionMode: "view" | "edit";
  validationIssues: ValidationIssue[];
  setSelectedState: (stateId: TerritoryId | null) => void;
  upsertState: (state: Territory) => void;
  removeState: (stateId: TerritoryId) => void;
  assignHexToState: (hexKey: string, stateId: TerritoryId | null) => void;
  setGridConfig: (grid: HexGridConfig) => void;
  importMap: (config: MapConfig) => void;
  loadSvgDocument: (svgText: string) => void;
  clearSvgDocument: () => void;
  setGridOverlay: (partial: Partial<GridOverlayConfig>) => void;
  generateHexesFromSvg: () => void;
  setPaintMode: (mode: EditorState["paintMode"]) => void;
  paintHex: (hexKey: string) => void;
  addHexAtWorldPoint: (point: { x: number; y: number }) => void;
  setInteractionMode: (mode: EditorState["interactionMode"]) => void;
  deleteHex: (hexKey: string) => void;
  updateMapMetadata: (
    details: Partial<Pick<MapConfig, "id" | "name" | "version" | "metadata">>,
  ) => void;
}

const keyForHex = (hex: Pick<HexCell, "q" | "r">) => `${hex.q},${hex.r}`;

const recalcBounds = (hexes: HexCell[]): HexBounds => {
  if (!hexes.length) {
    return { minQ: 0, maxQ: 0, minR: 0, maxR: 0 };
  }

  let minQ = Number.POSITIVE_INFINITY;
  let maxQ = Number.NEGATIVE_INFINITY;
  let minR = Number.POSITIVE_INFINITY;
  let maxR = Number.NEGATIVE_INFINITY;

  hexes.forEach((hex) => {
    minQ = Math.min(minQ, hex.q);
    maxQ = Math.max(maxQ, hex.q);
    minR = Math.min(minR, hex.r);
    maxR = Math.max(maxR, hex.r);
  });

  return { minQ, maxQ, minR, maxR };
};

const computeMapState = (map: MapConfig) => {
  const normalised = withRecomputedAdjacency(map);
  return {
    map: normalised,
    validationIssues: validateMap(normalised),
  };
};

const INITIAL_MAP_STATE = computeMapState(SAMPLE_MAP_CONFIG);

export const useMapEditorStore = create<EditorState>((set, get) => ({
  ...INITIAL_MAP_STATE,
  selectedStateId: null,
  svgDocument: null,
  gridOverlay: {
    orientation: SAMPLE_MAP_CONFIG.grid.orientation,
    hexSize: SAMPLE_MAP_CONFIG.grid.hexSize,
    offsetX: 0,
    offsetY: 0,
  },
  paintMode: "brush",
  interactionMode: "edit",
  setSelectedState: (stateId) => set({ selectedStateId: stateId }),
  upsertState: (state) =>
    set((current) => {
      const index = current.map.territories.findIndex((entry) => entry.id === state.id);
      const nextTerritories = [...current.map.territories];
      if (index >= 0) {
        nextTerritories[index] = state;
      } else {
        nextTerritories.push(state);
      }

      const nextAdjacency = { ...current.map.adjacencies };
      if (!nextAdjacency[state.id]) {
        nextAdjacency[state.id] = [];
      }

      const next = computeMapState({
        ...current.map,
        territories: nextTerritories,
      });
      return next;
    }),
  removeState: (stateId) =>
    set((current) => {
      const nextTerritories = current.map.territories.filter((entry) => entry.id !== stateId);
      const nextHexes = current.map.hexes.map((hex) =>
        hex.stateId === stateId ? { ...hex, stateId: null } : hex,
      );
      const next = computeMapState({
        ...current.map,
        territories: nextTerritories,
        hexes: nextHexes,
      });
      return {
        ...next,
        selectedStateId: current.selectedStateId === stateId ? null : current.selectedStateId,
      };
    }),
  assignHexToState: (hexKey, stateId) =>
    set((current) => {
      const nextHexes = current.map.hexes.map((hex) => {
        if (keyForHex(hex) !== hexKey) {
          return hex;
        }
        return { ...hex, stateId };
      });

      const nextTerritories = current.map.territories.map((state) => {
        const filteredHexes = state.hexes.filter((id) => id !== hexKey);
        if (state.id === stateId) {
          return {
            ...state,
            hexes: [...filteredHexes, hexKey].sort(),
          };
        }
        return {
          ...state,
          hexes: filteredHexes,
        };
      });

      const next = computeMapState({
        ...current.map,
        hexes: nextHexes,
        territories: nextTerritories,
      });
      return next;
    }),
  setGridConfig: (grid) =>
    set((current) =>
      computeMapState({
        ...current.map,
        grid,
      }),
    ),
  importMap: (config) =>
    set({
      ...computeMapState(config),
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
    const parsed = parseSvgString(svgText);
    console.info("[SVG] Loaded document", {
      width: parsed.width,
      height: parsed.height,
      viewBox: parsed.viewBox,
      paths: parsed.paths.length,
    });
    const defaultHexSize = Math.max(4, Math.round(parsed.viewBox.width / 18));
    const defaultOffsetX = parsed.viewBox.x + parsed.viewBox.width / 2;
    const defaultOffsetY = parsed.viewBox.y + parsed.viewBox.height / 2;
    set((current) => ({
      svgDocument: parsed,
      gridOverlay: {
        ...current.gridOverlay,
        hexSize: defaultHexSize,
        offsetX: defaultOffsetX,
        offsetY: defaultOffsetY,
      },
    }));
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
    const current = get();
    if (!current.svgDocument) {
      return;
    }

    const nextMap = rasteriseSvgToMap(current.svgDocument, current.gridOverlay, current.map);
    console.info(
      "[SVG→Hex] Generated",
      nextMap.hexes.length,
      "hexes across",
      nextMap.territories.length,
      "territories",
    );
    set({
      ...computeMapState(nextMap),
      selectedStateId: null,
    });
  },
  setPaintMode: (mode) => set({ paintMode: mode }),
  setInteractionMode: (mode) => set({ interactionMode: mode }),
  updateMapMetadata: (details) =>
    set((current) => ({
      ...computeMapState({
        ...current.map,
        ...details,
      }),
    })),
  paintHex: (hexKey) => {
    const current = get();
    if (current.interactionMode !== "edit") {
      return;
    }
    const targetHex = current.map.hexes.find((hex) => keyForHex(hex) === hexKey);
    if (!targetHex) {
      return;
    }

    if (current.paintMode === "erase") {
      current.assignHexToState(hexKey, null);
      return;
    }

    if (current.paintMode === "brush") {
      if (!current.selectedStateId) {
        return;
      }
      current.assignHexToState(hexKey, current.selectedStateId);
      return;
    }

    if (current.paintMode === "delete-hex") {
      current.deleteHex(hexKey);
      return;
    }

    if (current.paintMode === "flood") {
      const sourceState = current.selectedStateId;
      if (!sourceState) {
        return;
      }
      const originalState = targetHex.stateId;
      if (originalState === sourceState) {
        return;
      }

      const visited = new Set<string>();
      const queue: HexCell[] = [targetHex];
      visited.add(hexKey);

      const getNeighbours = (hex: HexCell) => [
        { q: hex.q + 1, r: hex.r - 1, s: hex.s },
        { q: hex.q + 1, r: hex.r, s: hex.s - 1 },
        { q: hex.q, r: hex.r + 1, s: hex.s - 1 },
        { q: hex.q - 1, r: hex.r + 1, s: hex.s },
        { q: hex.q - 1, r: hex.r, s: hex.s + 1 },
        { q: hex.q, r: hex.r - 1, s: hex.s + 1 },
      ];

      const allHexes = current.map.hexes;
      const targetKeys: string[] = [];

      while (queue.length) {
        const hex = queue.shift()!;
        const key = keyForHex(hex);
        targetKeys.push(key);

        getNeighbours(hex).forEach((coord) => {
          const neighbourKey = `${coord.q},${coord.r}`;
          if (visited.has(neighbourKey)) {
            return;
          }
          const candidate = allHexes.find((entry) => entry.q === coord.q && entry.r === coord.r);
          if (!candidate) {
            return;
          }
          if (candidate.stateId !== originalState) {
            return;
          }
          visited.add(neighbourKey);
          queue.push(candidate);
        });
      }

      targetKeys.forEach((key) => {
        current.assignHexToState(key, sourceState);
      });
    }
  },
  addHexAtWorldPoint: (point) => {
    const current = get();
    if (current.interactionMode !== "edit") {
      return;
    }
    const { hexSize, orientation } = current.map.grid;
    if (!hexSize) {
      return;
    }

    const { q, r, s } = pixelToAxial(point.x, point.y, { hexSize, orientation });
    const key = `${q},${r}`;
    const existingHex = current.map.hexes.find((hex) => keyForHex(hex) === key);

    if (existingHex) {
      if (current.paintMode === "erase") {
        current.assignHexToState(key, null);
      } else if (current.paintMode === "brush" && current.selectedStateId) {
        current.assignHexToState(key, current.selectedStateId);
      }
      return;
    }

    const stateId = current.paintMode === "erase" ? null : current.selectedStateId;

    const newHex: HexCell = { q, r, s, stateId: stateId ?? null };
    const nextHexes = [...current.map.hexes, newHex];
    const bounds = recalcBounds(nextHexes);

    let nextTerritories = current.map.territories;

    if (stateId) {
      const stateIndex = nextTerritories.findIndex((state) => state.id === stateId);
      const hexId = `${q},${r}`;
      if (stateIndex >= 0) {
        const state = nextTerritories[stateIndex];
        const updated = new Set(state.hexes);
        updated.add(hexId);
        nextTerritories = nextTerritories.map((entry, index) =>
          index === stateIndex
            ? {
                ...entry,
                hexes: Array.from(updated.values()).sort(),
              }
            : entry,
        );
      } else {
        const fallbackColor = "#60a5fa";
        nextTerritories = [
          ...nextTerritories,
          {
            id: stateId,
            name: stateId,
            displayColor: fallbackColor,
            hexes: [hexId],
          },
        ];
      }
    }

    set({
      ...computeMapState({
        ...current.map,
        hexes: nextHexes,
        territories: nextTerritories,
        grid: {
          ...current.map.grid,
          bounds,
          origin: { q: bounds.minQ, r: bounds.minR },
        },
      }),
    });
    console.info("[Canvas] Added hex", key, "state", stateId ?? "neutral");
  },
  deleteHex: (hexKey) => {
    const current = get();
    const target = current.map.hexes.find((hex) => keyForHex(hex) === hexKey);
    if (!target) {
      return;
    }

    const remainingHexes = current.map.hexes.filter((hex) => keyForHex(hex) !== hexKey);
    const nextTerritories = current.map.territories
      .map((state) => {
        const filtered = state.hexes.filter((id) => id !== hexKey);
        return {
          ...state,
          hexes: filtered,
        };
      })
      .filter((state) => state.hexes.length > 0 || state.id !== target.stateId);

    const bounds = recalcBounds(remainingHexes);

    set({
      ...computeMapState({
        ...current.map,
        hexes: remainingHexes,
        territories: nextTerritories,
        grid: {
          ...current.map.grid,
          bounds,
          origin: { q: bounds.minQ, r: bounds.minR },
        },
      }),
    });
    console.info("[Canvas] Removed hex", hexKey);
  },
}));
