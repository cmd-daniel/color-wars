export type StateId = string;

export interface MapConfig {
  id: string;
  name: string;
  version: string;
  grid: HexGridConfig;
  hexes: HexCell[];
  states: StateRegion[];
  adjacencies: Record<StateId, StateId[]>;
  metadata?: Record<string, unknown>;
}

export interface HexGridConfig {
  orientation: "pointy" | "flat";
  hexSize: number;
  origin: AxialCoord;
  bounds: HexBounds;
  resolutionTag: string;
}

export interface AxialCoord {
  q: number;
  r: number;
}

export interface HexBounds {
  minQ: number;
  maxQ: number;
  minR: number;
  maxR: number;
}

export interface HexCell {
  q: number;
  r: number;
  s: number;
  stateId: StateId | null;
  elevation?: number;
  tags?: string[];
}

export interface StateRegion {
  id: StateId;
  name: string;
  displayColor: string;
  hexIds: string[];
  tags?: string[];
}
