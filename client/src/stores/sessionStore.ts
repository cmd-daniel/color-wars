import { create } from 'zustand';
import { devtools, persist, combine } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { network } from '@/lib/managers/network';
import type { DiceStateMode, PlainStateOf, PlayerState, RoomState, GameState} from '@color-wars/shared/src/types/RoomState';
import type { TerritoryId } from '@/types/map';
import { useNetworkStore } from './networkStore';

const DEFAULT_PLAYER_NAME = 'Commander';


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
					} as StoreState,
					(set, get, api) => ({
						setPlayerName: (name: string) => {
							set((z) => {
								z.room ??= {};
								z.room.playerName = name;
							});
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
								z.state.game ??= {} as PlainStateOf<GameState>
								z.state.game.players ??= {};
								z.state.game.players[playerId] = player;
							});
						},
						setCurrentPlayer: (player: PlainStateOf<PlayerState>) => {
							set((z) => {
								z.currentPlayer = player
							});
						},
						removePlayer: (playerId: string) => {
							set((z) => {
								delete z.state.game.players[playerId];
							});
						},
						quickMatch: async () => {
							console.log('[sessionStore] quickMatch started');
							const { room: localRoom } = get();
							try {
								const payloadName = localRoom.playerName?.trim() ?? DEFAULT_PLAYER_NAME;

								const room = await network.quickMatch({ playerName: payloadName });
								set((z) => {
									(z.room.roomId = room.roomId), (z.room.reconnectionToken = room.reconnectionToken);
								});
								return room.roomId;
							} catch (error) {
								throw error;
							}
						},

						tryAutoReconnect: async (reason: string) => {
							const { room } = get();
							if (!room.roomId || !room.reconnectionToken) return false;
							
							if (useNetworkStore.getState().state == 'connected' || useNetworkStore.getState().state == 'reconnecting') return true

							try {
								const localRoom = await network.reconnect(room.reconnectionToken);

								set((z)=>{
									z.room.roomId = localRoom.roomId
									z.room.reconnectionToken = localRoom.reconnectionToken
								})
								return true;
							} catch (error) {
								if (error instanceof Error){
									console.error(error);
									if(error?.message == 'already connecting') return true
								}
								set((z)=>{
									z.room.roomId = null
									z.room.reconnectionToken = null
								})
								//clearSession();
								return false;
							}
						},
						startGame: () => {
							try {
								network.send('START_GAME', {});
							} catch (error) {
								console.warn('Unable to start game', error);
							}
						},
						leaveGame: async () => {
							try {
								await network.leave('manual')
							} catch (error) {
								console.warn('Unable to leave game', error);
							}
						},
						rollDice: () => {
							try {
								network.send('ROLL_DICE', {});
							} catch (error) {
								console.error('[rollDice] Error sending rollDice message:', error);
							}
						},
						sendDiceMode: (mode: 'acc'|'rag'|'roll')=>{
							try {
								console.log('sending ', mode)
								if(mode == 'acc') network.send('ACCELERATE_DICE', {});
								else if(mode == 'rag') network.send('RAGDOLL_DICE', {});
								else if(mode == 'roll') network.send('ROLL_DICE', {});
							} catch (error) {
								console.error('[rollDice] Error sending rollDice message:', error);
							}
						},
						endTurn: () => {
							try {
								//network.room?.send('endTurn')
							} catch (error) {
								console.warn('Unable to end turn', error);
							}
						},
						purchaseTerritory: (territoryId: TerritoryId) => {
							if (!territoryId) {
								return;
							}
							try {
								//network.room?.send('purchaseTerritory', { territoryId })
							} catch (error) {
								console.warn('Unable to purchase territory', error);
							}
						},
						toggleReady: () => {
							try {
								//network.room?.send('toggleReady')
							} catch (error) {
								console.warn('Unable to toggle ready', error);
							}
						},
						reset: () => set(useStore.getInitialState()),
						setDiceState: (mode:DiceStateMode, rollTo:number[])=>{
							set((z)=>{
								z.state.game.diceState.mode = mode
								z.state.game.diceState.rollTo = rollTo
							})
						}
					})
				)
			),
			{
				name: 'room-cache',
				partialize: (state) => ({
					room: state.room,
				}),
			}
		),
		{ name: 'Store' }
	)
);
