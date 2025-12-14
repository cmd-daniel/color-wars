/* ---------------------------------------------
 * 1. DEFINITIONS
 * --------------------------------------------- */
import type { RoomState, PlayerState, DiceStateMode } from "@color-wars/shared/src/types/RoomState";
import type { NetworkState } from "./network";

export interface LOCAL_EVENT {
  FULL_SEND: RoomState;
  UPDATE_PLAYER_PING: { id: string; ping: number };
  UPDATE_PLAYER: { id: string; player: PlayerState };
  UPDATE_CURRENT_PLAYER: { player: PlayerState };
  REMOVE_PLAYER: { id: string };
  UPDATE_ROOM_LEADER: { id: string };
  UPDATE_NETWORK_STATE: { state: NetworkState };
  UPDATE_ANIMATION_SPEED: { speedMultiplier: number };
  REQUEST_RECONNECT: undefined;
  UPDATE_DICE_STATE: { mode: DiceStateMode; rollTo: number[] };
}

export type LocalEventType = Extract<keyof LOCAL_EVENT, string>;

export type LocalEventHandler<K extends LocalEventType> = (payload: LOCAL_EVENT[K]) => void;
export type Unsubscribe = () => void;

/* ---------------------------------------------
 * 2. THE CLEAN CLASS
 * --------------------------------------------- */

class GameEventBusSingleton {
  // A simple map of Set<Function>.
  // We use 'any' here for the internal storage to avoid the "Correlated Record" headache,
  // but the public methods 'on' and 'emit' act as strict gatekeepers.
  private events = new Map<LocalEventType, Set<LocalEventHandler<LocalEventType>>>();

  /**
   * Type-safe emit.
   * Usage: bus.emit(CLIENT_EVENT.PLAYER_ADDED, { id: '1', name: 'Neo' })
   */
  public emit<K extends LocalEventType>(event: K, payload: LOCAL_EVENT[K]): void {
    console.debug('Emit Event: ', event, payload)
    const handlers = this.events.get(event) as Set<LocalEventHandler<K>> | undefined;
    if (handlers) {
      handlers.forEach((fn) => fn(payload));
    }
  }

  /**
   * Type-safe listener.
   * Usage: bus.on(CLIENT_EVENT.PLAYER_ADDED, (payload) => { ... })
   */
  public on<K extends LocalEventType>(event: K, fn: LocalEventHandler<K>): Unsubscribe {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    this.events.get(event)!.add(fn as LocalEventHandler<LocalEventType>);

    return () => {
      this.events.get(event)?.delete(fn as LocalEventHandler<LocalEventType>);
    };
  }

  public resetAllListeners(): void {
    this.events.clear();
  }
}

/* ---------------------------------------------
 * 3. EXPORT
 * --------------------------------------------- */
export const GameEventBus = new GameEventBusSingleton();
