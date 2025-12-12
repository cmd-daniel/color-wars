import { PixiEngine } from "@/components/NewGameBoard/pixi/engine";
import { create } from "zustand";
import { devtools, combine } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

type contextStore = {
  pixiEngine: PixiEngine | null;
};

export const contextStore = create(
  devtools(
    immer(
      combine(
        {
          pixiEngine: null,
        } as contextStore,
        (set) => ({
          setPixiEngine: (pixiEngine: PixiEngine) => {
            set({ pixiEngine });
          },
        }),
      ),
    ),
  ),
);
