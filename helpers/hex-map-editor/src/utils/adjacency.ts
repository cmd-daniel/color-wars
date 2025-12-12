import type { MapConfig, StateId, HexCell } from "../schema/mapConfig";

const AXIAL_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

const keyFor = (q: number, r: number) => `${q},${r}`;

export const computeStateAdjacency = (hexes: HexCell[]): Record<StateId, StateId[]> => {
  const hexLookup = new Map<string, HexCell>();
  hexes.forEach((hex) => {
    hexLookup.set(keyFor(hex.q, hex.r), hex);
  });

  const adjacency = new Map<StateId, Set<StateId>>();

  hexes.forEach((hex) => {
    if (!hex.stateId) {
      return;
    }
    const stateId = hex.stateId as StateId;
    const neighbours = adjacency.get(stateId) ?? new Set<StateId>();

    AXIAL_DIRECTIONS.forEach(({ q, r }) => {
      const neighbour = hexLookup.get(keyFor(hex.q + q, hex.r + r));
      const neighbourState = neighbour?.stateId ?? null;
      if (!neighbourState || neighbourState === hex.stateId) {
        return;
      }
      const neighbourStateId = neighbourState as StateId;
      neighbours.add(neighbourStateId);
      const reciprocal = adjacency.get(neighbourStateId) ?? new Set<StateId>();
      reciprocal.add(stateId);
      adjacency.set(neighbourStateId, reciprocal);
    });

    adjacency.set(stateId, neighbours);
  });

  const result: Record<StateId, StateId[]> = {};
  adjacency.forEach((set, stateId) => {
    result[stateId] = Array.from(set.values()).sort();
  });

  return result;
};

export const withRecomputedAdjacency = (map: MapConfig): MapConfig => ({
  ...map,
  adjacencies: computeStateAdjacency(map.hexes),
});
