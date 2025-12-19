import { create } from "zustand";
import { devtools, combine } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import gsap from "@/lib/gsap";
export const useAnimStore = create(
  devtools(
    immer(
      combine(
        {
          speedMultiplier: 1,
          isSkipping: false,
        },
        (set) => ({
          setSpeed: (speedMultiplier: number) => set({ speedMultiplier }),
          setSkipping: (isSkipping: boolean) => set({ isSkipping }),
          reset: ()=>{set(useAnimStore.getInitialState())}
        }),
      ),
    ),
  ),
);

useAnimStore.subscribe(({ speedMultiplier }) => {
  gsap.globalTimeline.timeScale(speedMultiplier);
});
