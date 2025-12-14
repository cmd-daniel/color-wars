// SoundManager.ts
import { GameEventBus } from "@/lib/managers/GameEventBus";
import { toast } from "sonner";
class ToastManager {
  private unsubs: (() => void)[] = [];

  init() {
    this.unsubs.push(
      GameEventBus.on("UPDATE_NETWORK_STATE", ({ state }) => {
        switch (state) {
          case "connected":
            toast.success(state, { toasterId: "center" });
            break;
          case "connecting":
          case "reconnecting":
            toast.info(state);
            break;
          default:
            toast(state);
        }
      }),
      GameEventBus.on('KICKED', ({reason})=>{
        toast.success(reason, {toasterId: 'center'})
      })
    );
  }

  destroy() {
    this.unsubs.forEach((fn) => fn());
    this.unsubs = [];
  }
}

export const toastManager = new ToastManager();
