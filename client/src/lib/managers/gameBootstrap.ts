// gameBootstrap.ts
import { soundManager } from "./sound";
import { toastManager } from "./toast";
import { zustandSyncManager } from "./zustandSync";
import { enableMapSet } from "immer";


let bootstrapped = false;

export function bootstrapGame() {
  if (bootstrapped) return;
  enableMapSet();
  bootstrapped = true;
  console.log("bootstrapping");
  toastManager.init();
  soundManager.init();
  zustandSyncManager.init();
}

export function shutdownGame() {
  if (!bootstrapped) return;
  bootstrapped = false;
  toastManager.destroy();
  soundManager.destroy();
  zustandSyncManager.destroy();
}
