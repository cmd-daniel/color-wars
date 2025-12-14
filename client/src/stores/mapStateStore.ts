import { create } from "zustand";
import type { GameMap } from "@/types/map-types";
import { subscribeWithSelector } from "zustand/middleware";
import { devtools, combine } from "zustand/middleware";
import { immer} from "zustand/middleware/immer";

interface MapState {
  currentMap: GameMap | null;
  isLoading: boolean;
  error: string | null;
  hoveredTerritoryId: string | null;
  selectedTerritoryId: string | null;
  colorMap: Map<string, string>;

  // Actions
  fetchMap: (url: string) => Promise<void>;
  setHoveredTerritory: (id: string | null) => void;
  setSelectedTerritory: (id: string | null) => void;
  setTerritoryColor: (id: string, color: string) => void;
}


export const useMapStore = create<MapState>()(
  subscribeWithSelector(
    devtools(
      immer(
        combine(
          {
            currentMap: null as GameMap | null,
            isLoading: false,
            error: null as string | null,
            hoveredTerritoryId: null as string | null,
            selectedTerritoryId: null as string | null,
            colorMap: new Map<string,string>(),
          },
          (set) => ({
            fetchMap: async (url: string) => {
              set((state) => {
                state.isLoading = true;
                state.error = null;
              });
              try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Failed to fetch map");
                const data: GameMap = await response.json();

                // Basic validation could go here
                if (!data.hexes || !data.territories) throw new Error("Invalid map format");

                set((state) => {
                  state.currentMap = data;
                  state.isLoading = false;
                });
              } catch (err) {
                console.error(err);
                set((state) => {
                  state.error = (err as Error).message;
                  state.isLoading = false;
                });
              }
            },
            setHoveredTerritory: (id: string | null) => {
              set((state) => {
                state.hoveredTerritoryId = id;
              });
            },
            setSelectedTerritory: (id: string | null) => {
              set((state) => {
                state.selectedTerritoryId = id;
              });
            },
            setTerritoryColor: (territoryID: string, color: string) => {
              set((s) => {
                s.colorMap = new Map(s.colorMap)
                s.colorMap.set(territoryID, color)
              });
            },
          }),
        ),
      ),
      { name: "mapStateStore" },
    ),
  )
);
