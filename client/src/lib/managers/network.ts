// network.ts
import { Client, Room, getStateCallbacks } from "colyseus.js";
import { wsEndpoint } from "../serverConfig";
import { GameAction, RoomState } from "@color-wars/shared/src/types/RoomState";
import type {
  ClientMessages,
  ServerMessages,
  ClientActionType,
  ServerActionType,
  PlayerJoinPayload,
} from "@color-wars/shared/src/protocol";
import { DEFAULT_ROOM_TYPE } from "@color-wars/shared/src/config/room";
import { GameEventBus } from "./GameEventBus";
import { ActionQueue } from "@/actions/core";
import { ActionFactory } from "@/actions/ActionFactory";
import {
  ACTION_REGISTRY,
  type ActionType,
  type ActionRegistry,
} from "@color-wars/shared/src/types/registry";

// network.types.ts
export type NetworkState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "degraded"
  | "desynced"
  | "closing"
  | "zombie";

class Network {
  private state: NetworkState = "disconnected";
  private client = new Client(wsEndpoint);
  private room: Room<RoomState> | null = null;
  private stateChangeCallbacks: (() => void)[] = [];

  public actionQueue: ActionQueue = new ActionQueue();
  private lastPlayedActionID: number = -1;

  async quickMatch(options: PlayerJoinPayload) {
    if (this.room) return this.room;
    if (this.state == "reconnecting" || this.state == "connecting")
      throw new Error("already connecting");
    this.setState("connecting");
    const room = await this.client.joinOrCreate<RoomState>(
      DEFAULT_ROOM_TYPE,
      options,
    );
    return this.registerRoom(room);
  }

  async reconnect(reconnectionToken: string) {
    if (this.room) return this.room;
    if (this.state == "reconnecting" || this.state == "connecting")
      throw new Error("already connecting");
    this.setState("reconnecting");
    try {
      const room = await this.client.reconnect(reconnectionToken);
      return this.registerRoom(room);
    } catch (error) {
      this.setState("disconnected");
      console.error(error);
      throw new Error("failed to connect");
    }
  }

  private registerRoom(room: Room<RoomState>) {
    if (this.room) this.room.removeAllListeners();
    this.room = room;
    this.attachRoomListeners();

    return this.room;
  }

  private attachRoomListeners() {
    if (!this.room) throw new Error("Not connected");

    this.onMessage("PING", ({ serverT1 }) => {
      this.send("PONG", { serverT1, clientT2: Date.now() });
    });

    this.room.onStateChange.once((state) => {
      if (!this.room?.roomId) return;
      this.setState("connected");
      GameEventBus.emit("FULL_SEND", state);
      const sessionId = this.room.sessionId;
      const currentPlayer = state.game.players.get(sessionId);
      if (currentPlayer) {
        GameEventBus.emit("UPDATE_CURRENT_PLAYER", { player: currentPlayer });
      }

      //state change listeners
      if (!this.room) return;
      const $ = getStateCallbacks(this.room);

      this.stateChangeCallbacks.push(
        $(this.room.state.game).players.onAdd((player, playerId) => {
          this.stateChangeCallbacks.push(
            $(player).onChange(() => {
              GameEventBus.emit("UPDATE_PLAYER", {
                id: playerId,
                player: player,
              });
            }),
          );
        }),
        $(this.room.state.game).players.onRemove((_, playerId) => {
          GameEventBus.emit("REMOVE_PLAYER", { id: playerId });
        }),
        $(this.room.state).playersPings.onChange((ping, playerId) => {
          GameEventBus.emit("UPDATE_PLAYER_PING", { id: playerId, ping });
        }),
        $(this.room.state.game).listen("diceState", (newDiceState) => {
          const diceState = newDiceState.toJSON();
          GameEventBus.emit("UPDATE_DICE_STATE", {
            mode: diceState.mode,
            rollTo: diceState.rollTo,
          });
        }),
        $(this.room.state).listen("turnActionHistory", (newValue) => {
          this.handleActionHistory(newValue);
        }),
      );
    });
    this.room.onError((code, message) => {
      console.log("[network] error ", { code, message });
    });
    this.room.onLeave((code, message) => {
      console.log("[network] leave", { code, message });
      this.leave();
      if (code == 1006) {
        GameEventBus.emit("REQUEST_RECONNECT", undefined);
      }
    });
  }

  send<K extends ClientActionType>(type: K, payload: ClientMessages[K]) {
    if (!this.room) {
      throw new Error("Network not connected: send() unavailable");
    }
    this.room.send(type, payload);
  }

  onMessage<K extends ServerActionType>(
    type: K,
    handler: (payload: ServerMessages[K]) => void,
  ) {
    if (!this.room) {
      throw new Error("Network not connected: handle() unavailable");
    }
    const off = this.room.onMessage(type, handler);
    return off; // Return the cleanup function
  }

  private removeAllStateChangeCallbacks() {
    this.stateChangeCallbacks.forEach((fn) => fn());
    this.stateChangeCallbacks = [];
  }
  async leave(reason: "auto" | "manual" | "refresh" | "disconnect" = "auto") {
    if (!this.room) return;
    this.setState("closing");
    const room = this.room;

    console.log("[network] leaving room:", room.roomId, "reason:", reason);

    try {
      // 1. Stop all incoming events immediately
      room.removeAllListeners();
      this.removeAllStateChangeCallbacks();

      // 2. Inform server (if still connected)
      if (room.connection.isOpen) {
        await room.leave();
      }
    } catch (err) {
      console.warn("[network] leave failed:", err);
    }

    // 3. Hard reset local networking
    this.room = null;
    this.setState("disconnected");

    // 4. Reset all client-side domain state
    // TODO
    // useNetworkStore.getState().setRoom(null);
    // useGameStore.getState().reset();
    // usePlayerStore.getState().reset();
    // useNetStatsStore?.getState().reset?.();

    console.log("[network] leave cleanup complete");
  }
  private setState(state: NetworkState) {
    if (this.state === state) return;
    this.state = state;
    GameEventBus.emit("UPDATE_NETWORK_STATE", { state });
  }

  private handleActionHistory(actions: GameAction[]) {
    // Grab only actions we have NOT played yet
    const pending = actions
      .filter((a) => a.id > this.lastPlayedActionID)
      .sort((a, b) => a.id - b.id); // safety

    if (pending.length === 0) return;

    for (const action of pending) {
      const mode = this.getPlaybackMode(action.timestamp);

      if (mode === "skip") {
        // Hard-sync: kill queue, apply state instantly
        console.warn("Skipping animations due to heavy desync");

        this.actionQueue.clear("complete"); // complete everything instantly
        this.restoreSpeed(); // make sure we don’t stay in fast mode

        // Manually apply this action’s final state
        this.playActionInstantly(action);

        continue;
      } else if (mode == 'fast') this.setSpeed(2)

      // Create action executor
      const parsed = this.parseServerAction(action.type, action.payload);
      const executable = ActionFactory.create(parsed);

      // Wrap in a speed-aware action
      this.actionQueue.enqueue(executable);
    }

    // Update pointer
    this.lastPlayedActionID = pending[pending.length - 1].id;
  }

  private playActionInstantly(action: GameAction) {
    const parsed = this.parseServerAction(action.type, action.payload);
    const executable = ActionFactory.create(parsed);

    const handle = executable.execute();
    handle.complete(); // jump animation to end immediately
  }

  private parseServerAction(type: string, payload: string) {
    if (!isActionType(type)) throw new Error("Invalid action");
    return {
      type,
      payload: JSON.parse(payload) as ActionRegistry[typeof type],
    };
  }

  private getPlaybackMode(actionTimestamp: number): "normal" | "fast" | "skip" {
    const delay = Date.now() - actionTimestamp;
    if (delay < 2000) return "normal";
    if (delay < 10000) return "fast";
    return "skip";
  }

  private setSpeed(multiplier: number) {
    GameEventBus.emit("UPDATE_ANIMATION_SPEED", {
      speedMultiplier: multiplier,
    });
  }

  private restoreSpeed() {
    GameEventBus.emit("UPDATE_ANIMATION_SPEED", { speedMultiplier: 1 });
  }

  getRoom() {
    if (!this.room) throw new Error("Not connected");
    return this.room;
  }
}

export function isActionType(v: string): v is ActionType {
  return v in ACTION_REGISTRY;
}

export const network = new Network();
