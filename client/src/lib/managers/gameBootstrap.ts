// gameBootstrap.ts
import { soundManager } from "./sound";
import { toastManager } from "./toast";
import { zustandSyncManager } from "./zustandSync";
import { useStore } from "@/stores/sessionStore";

let bootstrapped = false;

export function bootstrapGame() {
  if (bootstrapped) return;
  bootstrapped = true;
  console.log('bootstrapping')
  toastManager.init()
  soundManager.init();
  zustandSyncManager.init();
}

export function shutdownGame() {
  if (!bootstrapped) return;
  bootstrapped = false;
  toastManager.destroy()
  soundManager.destroy();
  zustandSyncManager.destroy();
}
