import { create } from "zustand";
import type { GameMap } from "@/types/map-types";

interface MapState {
  currentMap: GameMap | null;
  isLoading: boolean;
  error: string | null;
  hoveredStateId: string | null;
  selectedStateId: string | null;

  // Actions
  fetchMap: (url: string) => Promise<void>;
  setHoveredState: (id: string | null) => void;
  setSelectedState: (id: string | null) => void;
}

export const useGameStore = create<MapState>((set) => ({
  currentMap: null,
  isLoading: false,
  error: null,
  hoveredStateId: null,
  selectedStateId: null,

  fetchMap: async (url: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch map");
      const data: GameMap = await response.json();

      // Basic validation could go here
      if (!data.hexes || !data.territories) throw new Error("Invalid map format");

      set({ currentMap: data, isLoading: false });
    } catch (err) {
      console.error(err);
      set({ error: (err as Error).message, isLoading: false });
    }
  },
  setHoveredState: (id) => set({ hoveredStateId: id }),
  setSelectedState: (id) => set({ selectedStateId: id }),
}));
