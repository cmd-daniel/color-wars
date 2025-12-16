// ZustandSyncManager.ts
import { GameEventBus } from "@/lib/managers/GameEventBus";
import { useStore } from "@/stores/sessionStore";
import { useNetworkStore } from "@/stores/networkStore";
import { useAnimStore } from "@/stores/animStore";
import { useDiceTrackStore } from "@/stores/diceTrackStore";
import { hexStringToHexNumber } from "@/utils/color-utils";
import { useMapStore } from "@/stores/mapStateStore";

class ZustandSyncManager {
  private unsubs: (() => void)[] = [];

  init() {
    this.unsubs.push(
      GameEventBus.on("UPDATE_PLAYER_PING", ({ id, ping }) => {
        useStore.getState().setPlayerPing(id, ping);
      }),

      GameEventBus.on("UPDATE_PLAYER", ({ id, player }) => {
        useStore.getState().setPlayer(id, player.toJSON());
        useDiceTrackStore.getState().upsertToken({ id: player.id, tileId: "track-tile-0-0", color: hexStringToHexNumber(player.color) });
      }),

      GameEventBus.on("UPDATE_CURRENT_PLAYER", ({ player }) => {
        useStore.getState().setCurrentPlayer(player.toJSON());
      }),

      GameEventBus.on("FULL_SEND", (state) => {
        useStore.setState({ state: state.toJSON() });
        state.game.players.forEach((player) => {
          useDiceTrackStore.getState().upsertToken({ id: player.id, tileId: "track-tile-0-0", color: hexStringToHexNumber(player.color) });
        });
      }),

      GameEventBus.on("REMOVE_PLAYER", ({ id }) => {
        useStore.getState().removePlayer(id);
        useDiceTrackStore.getState().removeToken(id);
      }),

      GameEventBus.on("UPDATE_NETWORK_STATE", ({ state }) => {
        useNetworkStore.getState().setConnectionState(state);
      }),

      GameEventBus.on("UPDATE_ANIMATION_SPEED", ({ speedMultiplier }) => {
        useAnimStore.getState().setSpeed(speedMultiplier);
      }),

      GameEventBus.on("REQUEST_RECONNECT", () => {
        useStore.getState().tryAutoReconnect();
      }),

      GameEventBus.on("UPDATE_DICE_STATE", ({ mode, rollTo }) => {
        useStore.getState().setDiceState(mode, rollTo);
      }),

      GameEventBus.on("UPDATE_ROOM_LEADER", ({ id }) => {
        useStore.getState().setRoomLeader(id);
      }),

      GameEventBus.on('RESET_STATE', ()=>{
        useStore.getState().reset()
        useNetworkStore.getState().reset()
        useMapStore.getState().reset()
        useDiceTrackStore.getState().clear()
        useAnimStore.getState().reset()
      })
    );
  }

  destroy() {
    this.unsubs.forEach((fn) => fn());
    this.unsubs = [];
  }
}

export const zustandSyncManager = new ZustandSyncManager();
