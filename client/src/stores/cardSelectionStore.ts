import { create } from "zustand";
import { devtools, subscribeWithSelector, combine } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type AnimationPhase = "idle" | "drawing" | "interacting" | "resolving";

const initialState = {
  cardIds: [] as string[],
  selectedCardId: null as string | null,
  phase: "idle" as AnimationPhase,
};

export const useCardStore = create(
  devtools(
    subscribeWithSelector(
      immer(
        combine(initialState, (set) => ({
          // Action: Set up the board for drawing 3 cards
          setupDraw: (ids: string[]) =>
            set((state) => {
              state.cardIds = ids;
              state.selectedCardId = null;
              state.phase = "drawing";
            }),

          // Action: User clicked a card (UI only), or Backend confirmed selection
          // Depending on logic, this might be called by the Action class
          setSelectedCardId: (id: string) => {
            set((z) => {
              z.selectedCardId = id;
            });
          },
          resolveSelection: (id: string) =>
            set((z) => {
              z.selectedCardId = id;
              z.phase = "resolving";
            }),

          // Utility: Update phase (used by GSAP callbacks)
          setPhase: (phase: AnimationPhase) =>
            set((state) => {
              state.phase = phase;
            }),

          // Utility: Clean up
          reset: () =>
            set((state) => {
              state.cardIds = [];
              state.selectedCardId = null;
              state.phase = "idle";
            }),
        })),
      ),
    ),
    { name: "CardAnimationStore" },
  ),
);
