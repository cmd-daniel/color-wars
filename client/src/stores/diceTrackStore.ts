import { create } from "zustand";
import { subscribeWithSelector, combine, devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

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
  removeToken: (id: string) => void;
  moveToken: (id: string, tileId: string) => void;
  setActiveToken: (id: string | null) => void;
  upsertToken: (tokenData: { id: string; tileId: string; color?: number }) => void;
  clear: () => void;
}


const initialState: Omit<GameState, "removeToken" | "moveToken" | "setActiveToken" | "upsertToken" | "clear"> = {
  tokens: {},
  activeTokenId: null,
};


export const useDiceTrackStore = create<GameState>()(
  devtools(
    subscribeWithSelector(
      immer(
        combine(initialState, (set, get) => ({
          clear: () => {
            set(useDiceTrackStore.getInitialState());
          },
          removeToken: (id) =>
            set((state) => {
              delete state.tokens[id];
            }),
          upsertToken: (partial: { id: string; tileId: string; color?: number }) =>
            set((state) => {
              if (!state.tokens[partial.id]) {
                state.tokens[partial.id] = {
                  id: partial.id,
                  color: partial.color ?? 0xffffff,
                  tileId: partial.tileId,
                };
              } else {
                state.tokens[partial.id] = {
                  ...state.tokens[partial.id],
                  ...partial,
                };
              }
            }),
          moveToken: (id, tileId) =>
            set((state) => {
              if (state.tokens[id]) {
                state.tokens[id].tileId = tileId;
              }
            }),
          setActiveToken: (id) =>
            set((state) => {
              state.activeTokenId = id;
            }),
        }))
      )
    ),
    { name: "diceTrackStore" }
  )
);

// Selector to get IDs on a tile
export const getTokensOnTile = (state: GameState, tileId: string) => {
  return Object.values(state.tokens)
    .filter((t) => t.tileId === tileId)
    .map((t) => t.id);
};
