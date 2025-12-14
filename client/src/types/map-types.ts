// src/types/map-types.ts

export interface MapGridConfig {
  orientation: "pointy" | "flat";
  hexSize: number;
  origin: { q: number; r: number };
  bounds: { minQ: number; maxQ: number; minR: number; maxR: number };
  resolutionTag?: string;
}

export interface Hex {
  q: number;
  r: number;
  s: number;
  territoryID: string | null; // null means water/void
}

export interface Territory {
  id: string;
  name: string;
  displayColor: string; // "hsl(205 65% 55%)"
  hexes: Hex[]; // "q,r" strings
}

export interface GameMap {
  id: string;
  name: string;
  version: string;
  grid: MapGridConfig;
  hexes: Hex[];
  territories: Territory[];
  adjacencies: Record<string, string[]>;
}
