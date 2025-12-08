/* ---------------------------------------------
 * 1. DEFINITIONS
 * --------------------------------------------- */
import type { RoomState, PlayerState, DiceStateMode} from "@color-wars/shared/src/types/RoomState"
import type { NetworkState } from "./network"


  interface CLIENT_EVENT {
    FULL_SEND: RoomState
    UPDATE_PLAYER_PING: { id:string, ping:number }
    UPDATE_PLAYER: { id: string, player: PlayerState}
    UPDATE_CURRENT_PLAYER: { player: PlayerState }
    REMOVE_PLAYER: { id:string }
    UPDATE_NETWORK_STATE:{state:NetworkState}
    REQUEST_RECONNECT: undefined
    UPDATE_DICE_STATE: {mode:DiceStateMode, rollTo: number[]}
  }

  type ClientEventType = Extract<keyof CLIENT_EVENT, string>
  
  type Handler<K extends ClientEventType> = (payload: CLIENT_EVENT[K]) => void;
  type Unsubscribe = () => void;
  
  /* ---------------------------------------------
   * 2. THE CLEAN CLASS
   * --------------------------------------------- */
  
  class GameEventBusSingleton {
    // A simple map of Set<Function>. 
    // We use 'any' here for the internal storage to avoid the "Correlated Record" headache, 
    // but the public methods 'on' and 'emit' act as strict gatekeepers.
    private events = new Map<ClientEventType, Set<any>>();
  
    /**
     * Type-safe emit. 
     * Usage: bus.emit(CLIENT_EVENT.PLAYER_ADDED, { id: '1', name: 'Neo' })
     */
    public emit<K extends ClientEventType>(event: K, payload: CLIENT_EVENT[K]): void {
      const handlers = this.events.get(event);
      if (handlers) {
        handlers.forEach((fn) => fn(payload));
      }
    }
  
    /**
     * Type-safe listener.
     * Usage: bus.on(CLIENT_EVENT.PLAYER_ADDED, (payload) => { ... })
     */
    public on<K extends ClientEventType>(event: K, fn: Handler<K>): Unsubscribe {
      if (!this.events.has(event)) {
        this.events.set(event, new Set());
      }
  
      this.events.get(event)!.add(fn);
  
      return () => {
        this.events.get(event)?.delete(fn);
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
