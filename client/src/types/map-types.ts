// src/types/map-types.ts

export interface MapGridConfig {
    orientation: "pointy" | "flat";
    hexSize: number;
    origin: { q: number; r: number };
    bounds: { minQ: number; maxQ: number; minR: number; maxR: number };
    resolutionTag?: string;
  }
  
  export interface MapHex {
    q: number;
    r: number;
    s: number;
    stateId: string | null; // null means water/void
  }
  
  export interface MapStateData {
    id: string;
    name: string;
    displayColor: string; // "hsl(205 65% 55%)"
    hexIds: string[]; // "q,r" strings
  }
  
  export interface GameMap {
    id: string;
    name: string;
    version: string;
    metadata?: any;
    grid: MapGridConfig;
    hexes: MapHex[];
    states: MapStateData[];
    adjacencies: Record<string, string[]>;
  }