// SoundManager.ts
import { GameEventBus } from "@/lib/managers/GameEventBus";

class SoundManager {
  private unsubs: (() => void)[] = [];

  init() {
    this.unsubs.push(
      GameEventBus.on("UPDATE_PLAYER", () => {
        // play sound
      }),
    );
  }

  destroy() {
    this.unsubs.forEach(fn => fn());
    this.unsubs = [];
  }
}

export const soundManager = new SoundManager();
