// ZustandSyncManager.ts
import { GameEventBus } from "@/lib/managers/GameEventBus";
import { useStore } from "@/stores/sessionStore";
import { useNetworkStore } from "@/stores/networkStore";

class ZustandSyncManager {
  private unsubs: (() => void)[] = [];

  init() {
    this.unsubs.push(
      GameEventBus.on("UPDATE_PLAYER_PING", ({id, ping}) => {
        useStore.getState().setPlayerPing(id,ping)
      }),

      GameEventBus.on('UPDATE_PLAYER', ({id, player})=>{
        useStore.getState().setPlayer(id, player.toJSON())
      }),

      GameEventBus.on('UPDATE_CURRENT_PLAYER', ({player})=>{
        useStore.getState().setCurrentPlayer(player.toJSON())
      }),

      GameEventBus.on("FULL_SEND", (state)=>{
        useStore.setState({state:state.toJSON()})
      }),

      GameEventBus.on("REMOVE_PLAYER", ({id})=>{
        useStore.getState().removePlayer(id)
      }),

      GameEventBus.on('UPDATE_NETWORK_STATE', ({state})=>{
        useNetworkStore.getState().setConnectionState(state)
      }),

      GameEventBus.on('REQUEST_RECONNECT', ()=>{
        useStore.getState().tryAutoReconnect('')
      }),

      GameEventBus.on('UPDATE_DICE_STATE', ({mode, rollTo})=>{
        useStore.getState().setDiceState(mode, rollTo)
      }),
    );
  }

  destroy() {
    this.unsubs.forEach(fn => fn());
    this.unsubs = [];
  }
}

export const zustandSyncManager = new ZustandSyncManager();
