import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// The Data definition of a Token
export interface TokenData {
  id: string;
  color: number;
  tileId: string; // The "Resting" logical position
}

interface GameState {
  // Dictionary: TokenID -> TokenData
  tokens: Record<string, TokenData>;
  activeTokenId: string | null;

  // Actions
  addToken: (id: string, color: number, tileId: string) => void;
  removeToken: (id: string) => void;
  moveToken: (id: string, tileId: string) => void;
  setActiveToken: (id:string|null)=>void;
  clear: () => void;
}

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set) => ({
    tokens: {},
    activeTokenId: null,

    clear: () => {
      set(() => ({ tokens: {} }));
    },
    addToken: (id, color, tileId) =>
      set((state) => ({
        tokens: {
          ...state.tokens,
          [id]: { id, color, tileId },
        },
      })),

    removeToken: (id) =>
      set((state) => {
        const next = { ...state.tokens };
        delete next[id];
        return { tokens: next };
      }),

    moveToken: (id, tileId) =>
      set((state) => {
        const token = state.tokens[id];
        if (!token) return {};
        return {
          tokens: {
            ...state.tokens,
            [id]: { ...token, tileId }, // Update position
          },
        };
      }),
    setActiveToken: (id) => set({activeTokenId:id})
  })),
);

// Selector to get IDs on a tile
export const getTokensOnTile = (state: GameState, tileId: string) => {
  return Object.values(state.tokens)
    .filter((t) => t.tileId === tileId)
    .map((t) => t.id);
};
