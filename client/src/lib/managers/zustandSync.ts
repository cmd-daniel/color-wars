// ZustandSyncManager.ts
import { GameEventBus } from "@/lib/managers/GameEventBus";
import { useStore } from "@/stores/sessionStore";
import { useNetworkStore } from "@/stores/networkStore";
import { useAnimStore } from "@/stores/animStore";
import { useDiceTrackStore } from "@/stores/diceTrackStore";
import { hexStringToHexNumber } from "@/utils/color-utils";
import { useMapStore } from "@/stores/mapStateStore";
import { useChatStore } from "@/stores/chatStore";

class ZustandSyncManager {
  private unsubs: (() => void)[] = [];

  init() {
    this.unsubs.push(
      GameEventBus.on("UPDATE_PLAYER_PING", ({ id, ping }) => {
        useStore.getState().setPlayerPing(id, ping);
      }),

      GameEventBus.on("UPDATE_PLAYER", ({ id, player }) => {
        const playerExists = useStore.getState().state.game.players[id];
        if (!playerExists){
          useDiceTrackStore.getState().upsertToken({ id: player.id, tileId: `track-tile-${player.position}`, color: hexStringToHexNumber(player.color) });
        }
        useStore.getState().setPlayer(id, player.toJSON());
      }),

      GameEventBus.on("UPDATE_PLAYER_ROLLED_DICE", ({ id, hasRolledDice }) => {
        useStore.getState().updatePlayerRolledDice(id, hasRolledDice);
      }),

      GameEventBus.on("UPDATE_CURRENT_PLAYER", ({ player }) => {
        useStore.getState().setCurrentPlayer(player.toJSON());
      }),

      GameEventBus.on("FULL_SEND", (state) => {
        if(state.turnCheckpoint){
          state.game = state.turnCheckpoint
          useStore.setState({ state: state.toJSON()});
        }else{
          useStore.setState({ state: state.toJSON()});
        }
        state.game.players.forEach((player) => {
          useDiceTrackStore.getState().upsertToken({ id: player.id, tileId: `track-tile-${player.position}`, color: hexStringToHexNumber(player.color) });
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
      }),

      GameEventBus.on('RELAY_MESSAGE', (message)=>{
        useChatStore.getState().addMessage(message)
      }),

      GameEventBus.on('ACCELERATE_DICE', ()=>{
        useStore.getState().accelerateDice()
      }),

      GameEventBus.on('RAGDOLL_DICE', ()=>{
        useStore.getState().ragdollDice()
      }),

      GameEventBus.on('UPDATE_ACTIVE_PLAYER', ({playerId})=>{
        useDiceTrackStore.getState().setActiveToken(playerId)
        useStore.getState().setActivePlayer(playerId)
      }),

      GameEventBus.on('UPDATE_ROOM_PHASE', ({phase})=>{
        useStore.getState().updateRoomPhase(phase)
      })
    );
  }

  destroy() {
    this.unsubs.forEach((fn) => fn());
    this.unsubs = [];
  }
}

export const zustandSyncManager = new ZustandSyncManager();
