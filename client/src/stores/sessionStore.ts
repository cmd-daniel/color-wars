import { create } from "zustand";
import { devtools, persist, combine } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { network } from "@/lib/managers/network";
import type {
  DiceStateMode,
  PlainStateOf,
  PlayerState,
  RoomState,
  GameState,
  RoomPhase,
} from "@color-wars/shared/src/types/RoomState";
import type { TerritoryId } from "@/types/map";
import { useNetworkStore } from "./networkStore";

const DEFAULT_PLAYER_NAME = "Commander";
type ActionState = 'resolving_action' | 'idle'

interface LocalRoom {
  playerName: string;
  roomId: string | null;
  reconnectionToken: string | null;
}

interface StoreState {
  room: Partial<LocalRoom>;
  currentPlayer: PlainStateOf<PlayerState>;
  state: PlainStateOf<RoomState>;
  isSpectator: boolean;
  actionState: ActionState
}

export const useStore = create(
  devtools(
    persist(
      immer(
        combine(
          {
            room: {
              playerName: DEFAULT_PLAYER_NAME,
              roomId: null,
              reconnectionToken: null,
            },
            currentPlayer: {},
            isSpectator: false,
            state: {
              playersPings: {},
            },
            actionState:'idle'
          } as StoreState,
          (set, get) => ({
            setPlayerName: (name: string) => {
              set((z) => {
                z.room ??= {};
                z.room.playerName = name;
              });
            },
            setActionState: (state: ActionState) => {
              set((z)=>{
                z.actionState = state
              })
            },
            setPlayerPing: (playerId: string, ping: number) => {
              set((z) => {
                z.state ??= {} as PlainStateOf<RoomState>;
                z.state.playersPings ??= {};
                z.state.playersPings[playerId] = ping;
              });
            },
            removePlayerPing: (playerId: string) => {
              set((z) => {
                delete z.state.playersPings[playerId];
              });
            },
            setPlayer: (playerId: string, player: PlainStateOf<PlayerState>) => {
              set((z) => {
                z.state ??= {} as PlainStateOf<RoomState>;
                z.state.game ??= {} as PlainStateOf<GameState>;
                z.state.game.players ??= {};
                z.state.game.players[playerId] = player;
              });
            },
            setCurrentPlayer: (player: PlainStateOf<PlayerState>) => {
              set((z) => {
                z.currentPlayer = player;
              });
            },
            removePlayer: (playerId: string) => {
              set((z) => {
                delete z.state.game.players[playerId];
              });
            },
            quickMatch: async () => {
              console.log("[sessionStore] quickMatch started");
              const { room: localRoom } = get();
              try {
                const payloadName = localRoom.playerName?.trim() ?? DEFAULT_PLAYER_NAME;

                const room = await network.quickMatch({ playerName: payloadName });
                set((z) => {
                  z.room.roomId = room.roomId;
                  z.room.reconnectionToken = room.reconnectionToken;
                });
                return room.roomId;
              } catch (error) {
                console.log(error);
                throw error;
              }
            },
            setRoomLeader: (playerId: string)=>{
              set((z)=>{
                z.state.room.leaderId = playerId
              })
            },
            accelerateDice: ()=>{
              set((z)=>{
                z.state.game.diceState.mode = 'ACCELERATING'
              })
            },
            ragdollDice: ()=>{
              set((z)=>{
                z.state.game.diceState.mode = 'RAGDOLLING'
              })
            },
            updateRoomPhase: (phase: RoomPhase)=>{
              set((z)=>{
                z.state.room.phase = phase
              })
            },
            rollDiceTo: (die1:number, die2: number)=>{
              set((z)=>{
                console.log('called rollDiceTo from: ', z.state.game.diceState.mode)
                z.state.game.diceState.mode = 'ROLLINGTOFACE'
                z.state.game.diceState.rollTo = [die1, die2]
              })
            },
            setActivePlayer: (playerId: string)=>{
              set((z)=>{
                z.state.game.activePlayerId = playerId
              })
            },
            tryAutoReconnect: async () => {
              console.log('calling reconnect')
              const { room } = get();
              if (!room.roomId || !room.reconnectionToken) return false;

              if (
                useNetworkStore.getState().state == "connected" ||
                useNetworkStore.getState().state == "reconnecting"
              )
                return true;

              try {
                const localRoom = await network.reconnect(room.reconnectionToken);

                set((z) => {
                  z.room.roomId = localRoom.roomId;
                  z.room.reconnectionToken = localRoom.reconnectionToken;
                });
                return true;
              } catch (error) {
                if (error instanceof Error) {
                  console.error(error);
                  if (error?.message == "already connecting") return true;
                }
                set((z) => {
                  z.room.roomId = null;
                  z.room.reconnectionToken = null;
                });
                //clearSession();
                return false;
              }
            },
            updatePlayerMoney: (playerId: string, amount: number)=>{
              set((z)=>{
                z.state.game.players[playerId].money = amount
              })
            },
            updatePlayerRolledDice: (playerId: string, hasRolledDice: boolean)=>{
              
              set((z)=>{
                z.state.game.players[playerId].hasRolled = hasRolledDice
              })
            },
            startGame: () => {
              try {
                network.send("START_GAME", {});
              } catch (error) {
                console.warn("Unable to start game", error);
              }
            },
            leaveGame: async () => {
              try {
                await network.leave("manual");
              } catch (error) {
                console.warn("Unable to leave game", error);
              }
            },
            sendDiceMode: (mode: "acc" | "rag" | "roll") => {
              try {
                console.log("sending ", mode);
                if (mode == "acc") network.send("ACCELERATE_DICE", {});
                else if (mode == "rag") network.send("RAGDOLL_DICE", {});
                else if (mode == "roll") network.send("ROLL_DICE", {});
              } catch (error) {
                console.error("[rollDice] Error sending rollDice message:", error);
              }
            },
            endTurn: () => {
              try {
                network.send("END_TURN", {});
              } catch (error) {
                console.warn("Unable to end turn", error);
              }
            },
            purchaseTerritory: (territoryId: TerritoryId) => {
              if (!territoryId) {
                return;
              }
              try {
                //network.room?.send('purchaseTerritory', { territoryId })
              } catch (error) {
                console.warn("Unable to purchase territory", error);
              }
            },
            toggleReady: () => {
              try {
                //network.room?.send('toggleReady')
              } catch (error) {
                console.warn("Unable to toggle ready", error);
              }
            },
            kickPlayer: (playerId:string) => {
              try{
                network.send('KICK_PLAYER', {playerId, reason:'GTFO'})
              }catch(err){
                console.warn('unable to do action: kick player', playerId)
              }
            },
            reset: () => set(useStore.getInitialState()),
            setDiceState: (mode: DiceStateMode, rollTo: number[]) => {
              set((z) => {
                z.state.game.diceState.mode = mode;
                z.state.game.diceState.rollTo = rollTo;
              });
            },
          }),
        ),
      ),
      {
        name: "room-cache",
        partialize: (state) => ({
          room: state.room,
        }),
      },
    ),
    { name: "Store" },
  ),
);
