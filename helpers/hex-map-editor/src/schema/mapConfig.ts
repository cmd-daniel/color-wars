export type TerritoryId = string;

export interface MapConfig {
  id: string;
  name: string;
  version: string;
  grid: HexGridConfig;
  hexes: HexCell[];
  territories: Territory[];
  adjacencies: Record<TerritoryId, TerritoryId[]>;
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
  stateId: TerritoryId | null;
}

export interface Territory {
  id: TerritoryId;
  name: string;
  displayColor: string;
  hexes: string[];
  tags?: string[];
}
