import { Client, Delayed, Room, logger } from "colyseus";

import { RoomManager } from "../matchmaking/RoomManager";
import { GameEngine } from "../game/GameEngine";
import { DEFAULT } from "@color-wars/shared/src/config/room";
import { validateOrThrow } from "@color-wars/shared/src/validator";
import { RoomState, PlayerState, DiceState } from "@color-wars/shared/src/types/RoomState";
import {
  ClientActionType,
  ServerActionType,
  ActionContext,
  ClientMessages,
  ServerMessages,
  PlayerJoinPayload,
} from "@color-wars/shared/src/protocol";

export class GameRoom extends Room<RoomState> {
  private gameEngine!: GameEngine;
  private pinger: Delayed | null = null;

  private onAction<K extends ClientActionType>(
    action: K,
    handler: (client: Client, ctx: ActionContext<K>) => void,
  ) {
    this.onMessage(action, (client: Client, payload: ClientMessages[K]) => {
      try {
        const senderId = client.sessionId;
        const ctx = { senderId, ...payload } as ActionContext<K>;

        // Validation Logic
        const plainState = this.state.toJSON();
        validateOrThrow(action, plainState, ctx);

        // Execute
        handler(client, ctx);
      } catch (err) {
        console.error(`Error handling action ${action}:`, err);
      }
    });
  }

  private dispatch<K extends ServerActionType>(
    action: K,
    payload: ServerMessages[K],
    options?: { client?: Client; except?: Client | Client[] },
  ) {
    if (options?.client) {
      options.client.send(action, payload);
    } else {
      this.broadcast(action, payload, options);
    }
  }

  async onCreate() {
    this.maxClients = DEFAULT.MAX_PLAYERS;
    this.autoDispose = true;

    this.state = new RoomState(this.roomId);
    this.gameEngine = new GameEngine(this.state.game);
    this.gameEngine.setRoomClock(this.clock);

    this.pinger = this.clock.setInterval(() => {
      const now = Date.now();
      for (const client of this.clients) {
        this.dispatch("PING", { serverT1: now }, { client });
      }
    }, 2000);

    this.registerMessageHandlers();
    logger.info("room created");
    //RoomManager.registerRoom(this);
    //RoomManager.updateRoomPhase(this);
  }

  async onJoin(client: Client, options: PlayerJoinPayload) {
    // Guard: Check if this sessionId already exists as a player (shouldn't happen in guest mode)
    if (this.state.game.players.has(client.sessionId)) return;

    // Set as leader if first player
    if (this.state.game.players.size == 0) {
      this.state.room.leaderId = client.sessionId;
    }

    // Guest-only mode: Each connection is a new player
    const player = new PlayerState(client.sessionId, options.playerName);
    this.state.game.players.set(client.sessionId, player);

    // Initialize Player with default values
    this.gameEngine.handlePlayerJoined(player);

    logger.info("playerJoined", client.sessionId);
    // this.state.room.phase = "active";
    // this.gameEngine.startGame();

    await this.updateMetadata();
  }

  async onLeave(client: Client, consented?: boolean) {
    const { game, room } = this.state;
    const { players, playerOrder } = game;
    logger.debug('player disconnected: ', client.sessionId)
    const player = players.get(client.sessionId);
    if (!player) return;
  
    player.connected = false;
  
    const playerId = player.id;
    const isLeader = room.leaderId === playerId;
    const isActive = game.activePlayerId === playerId;
  
    const removePlayer = (idx: number) => {
      playerOrder.splice(idx, 1);
  
      const next =
        playerOrder.length > 0
          ? playerOrder[idx % playerOrder.length]
          : "null";
  
      if (isActive) game.activePlayerId = next;
      if (isLeader){ 
        console.log('isLeader: true', room.leaderId, next)
        room.leaderId = next;
        logger.debug('player removed: ', client.sessionId)
      }
  
      players.delete(client.sessionId);
      this.state.playersPings.delete(client.sessionId);
    };
  
    const idx = playerOrder.indexOf(client.sessionId);
  
    try {
      if (consented) {
        if (idx !== -1) removePlayer(idx);
        return;
      }
  
      // allow reconnect
      await this.allowReconnection(client, 120);
  
      // client returned
      player.connected = true;
    } catch {
      // reconnection window expired
      if (idx !== -1) removePlayer(idx);
    }
  }
  

  async onDispose() {
    //RoomManager.unregisterRoom(this);
    this.pinger?.clear();
  }

  private registerMessageHandlers() {
    this.onAction("ROLL_DICE", () => {
      logger.info("received roll dice");
      this.state.game.diceState = new DiceState("ROLLINGTOFACE", [1, 2]);
    });

    this.onAction("ACCELERATE_DICE", (client) => {
      logger.info("received accel dice");
      this.state.game.diceState = new DiceState("ACCELERATING", [1, 2]);
    });
    this.onAction("RAGDOLL_DICE", (client) => {
      logger.info("received ragdoll dice");
      this.state.game.diceState = new DiceState("RAGDOLLING", [1, 2]);
    });

    this.onAction("PONG", (client, { serverT1, clientT2}) => {
      const serverT3 = Date.now();
      const rawRTT = serverT3 - serverT1;

      this.state.playersPings.set(client.sessionId, rawRTT);

      //this.dispatch("PING_PONG", { serverT1, clientT2, serverT3 });
    });

    this.onAction("KICK_PLAYER", (client, {playerId})=>{
      this.clients.getById(playerId)?.leave(1000,'kicked from lobby')
      logger.debug('Kicked player: ', playerId)
    })
  }

  private handleStartGame(client: Client) {
    // Only leader can start the game
    if (client.sessionId !== this.state.room.leaderId) return;

    if (this.state.room.phase !== "lobby") return;

    this.state.room.phase = "active";

    this.gameEngine.startGame();
    void this.updateMetadata();
  }

  public finishGame(reason: string = "completed") {
    if (this.state.room.phase !== "active") return;

    this.state.room.phase = "finished";
    this.updateMetadata();
    this.disconnect();
  }

  private async updateMetadata() {
    await this.setMetadata({
      visibility: this.state.room.visibility,
      joinCode: this.state.room.joinCode,
      phase: this.state.room.phase,
      connectedPlayers: this.state.game.players.size,
      maxPlayers: this.maxClients,
    });

    //RoomManager.updateRoomPhase(this);
  }
}
