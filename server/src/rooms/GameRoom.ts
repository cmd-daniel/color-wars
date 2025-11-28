import { Client, Delayed, Room } from "colyseus";
import { GameState, PlayerState, RoomVisibility } from "../state/GameState";
import { RoomManager } from "../matchmaking/RoomManager";
import { BROADCAST_EVENT, DEFAULT } from "../constants";
import { logAnalyticsEvent } from "../utils/logger";
import { GameEngine } from "../game/GameEngine";

interface UpdateRoomSettingsPayload {
  maxPlayers?: number;
  startingCash?: number;
  room_visibility?: boolean;
}

export class GameRoom extends Room<GameState> {
  private emptyRoomTimer?: Delayed;
  private gameEngine!: GameEngine;

  async onCreate() {
    this.maxClients = DEFAULT.MAX_PLAYERS;
    this.autoDispose = true;
    
    this.state = new GameState(this.roomId);
    
    this.gameEngine = new GameEngine(this.state);
    this.gameEngine.setRoomClock(this.clock);
    
    this.registerMessageHandlers();

    RoomManager.registerRoom(this);
    RoomManager.updateRoomPhase(this);
  }

  async onJoin(client: Client, options: { playerName: string }) {
    // Guard: Check if this sessionId already exists as a player (shouldn't happen in guest mode)
    if (this.state.players.has(client.sessionId)) return;

    // Set as leader if first player
    if (this.state.players.size == 0) {
      this.state.room.leaderId = client.sessionId;
    }

    // Guest-only mode: Each connection is a new player
    const player = new PlayerState(client.sessionId, options.playerName);
    this.state.players.set(client.sessionId, player);
    
    // Initialize Player with default values
    this.gameEngine.handlePlayerJoined(player);
    
    await this.updateMetadata();
  }

  async onLeave(client: Client) {
    //this check is very important apparently
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.warn(`[GameRoom] onLeave called for unknown sessionId: ${client.sessionId}`)
      return;
    }

    this.gameEngine.handlePlayerLeft(client.sessionId);
    
    this.state.players.delete(client.sessionId);
    
    // Handle leader handoff if leader left
    if (this.state.room.leaderId === client.sessionId) this.assignNewLeader();
    
    await this.updateMetadata();

    if (this.clients.length === 0) this.disconnect();
  }
  
  private assignNewLeader() {
    // Find the next connected player to be leader
    const connectedPlayers = Array.from(this.state.players.values()).filter(p => p.connected)
    
    if (connectedPlayers.length > 0) this.state.room.leaderId = connectedPlayers[0].id;
    else this.state.room.leaderId = "";
  }

  async onDispose() {
    RoomManager.unregisterRoom(this);
  }

  private registerMessageHandlers() {
    this.onMessage("chat", (client, payload: {message:string}) => {
      this.handleChat(client, payload);
    });
    
    this.onMessage("setIcon", (client, payload: {icon: string}) => {
      this.handleSetIcon(client, payload);
    });

    this.onMessage("setColor", (client, payload: {color: string}) => {
      this.handleSetColor(client, payload);
    });
    
    this.onMessage("updateRoomSettings", (client, payload: UpdateRoomSettingsPayload) => {
      this.handleUpdateRoomSettings(client, payload);
    });
    
    this.onMessage("kickPlayer", (client, payload: {playerId: string}) => {
      this.handleKickPlayer(client, payload);
    });
    
    this.onMessage("startGame", (client) => {
      this.handleStartGame(client);
    });
    
    this.onMessage("rollDice", (client) => {
      this.gameEngine.handleRoll(client);
    });
    
    this.onMessage("purchaseTerritory", (client, payload: {territoryId: string}) => {
      const territoryId = typeof payload?.territoryId === "string" ? payload.territoryId : "";
      const result = this.gameEngine.handlePurchaseTerritory(client, territoryId);
      client.send("purchaseResult", result);
    });
    
    this.onMessage("endTurn", (client) => {
      this.gameEngine.handleEndTurn(client);
    });
  }

  private handleChat(client: Client, payload: {message:string}) {
    if (!payload || typeof payload.message !== "string") return;

    let trimmed = payload.message.trim();
    if (trimmed.length === 0) return;

    if(trimmed.length > 200){
      trimmed = trimmed.slice(0, 200) + "… [message truncated]";
    }

    const chatMessage = {
      senderId:client.sessionId,
      message: trimmed,
      timeStamp: Date.now()
    }

    this.broadcast(BROADCAST_EVENT.CHAT, chatMessage);
  }

  private handleSetIcon(client: Client, payload: {icon : string}) {
    if (this.state.room.phase !== "lobby") return;
    
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const icon = typeof payload?.icon === "string" ? payload.icon.trim() : "";
    if (!icon) return;

    // Check if icon is already taken by another player
    const iconTaken = Array.from(this.state.players.values()).some(
      p => p.id !== client.sessionId && p.icon === icon
    );

    if (iconTaken) return;

    player.icon = icon;
  }

  private handleSetColor(client: Client, payload: {color:string}) {
    if (this.state.room.phase !== "lobby") return; // Can only change icon in lobby

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const color = typeof payload?.color === "string" ? payload.color.trim() : "";
    if (!color) return;

    const iconTaken = Array.from(this.state.players.values()).some(
      p => p.id !== client.sessionId && p.color === color
    );

    if (iconTaken) return;

    player.color = color;
  }

  private handleUpdateRoomSettings(client: Client, payload: UpdateRoomSettingsPayload) {
    // Only leader can update settings
    if (client.sessionId !== this.state.room.leaderId) return;

    if (this.state.room.phase !== "lobby") return;

    if (payload.maxPlayers && typeof payload.maxPlayers === "number" && payload.maxPlayers >= 2 && payload.maxPlayers <= 6) {
      this.state.room.maxPlayers = payload.maxPlayers;
      this.maxClients = payload.maxPlayers;
    }

    if (payload.startingCash && typeof payload.startingCash === "number" && payload.startingCash >= 0) {
      this.state.room.startingCash = payload.startingCash;
    }

    if (payload.room_visibility && typeof payload.room_visibility === "string" && (payload.room_visibility === "private" || payload.room_visibility === "public")) {
      this.state.room.visibility = payload.room_visibility;
    }
  }

  private async handleKickPlayer(client: Client, payload: {playerId: string}) {
    // Only leader can kick players
    if (client.sessionId !== this.state.room.leaderId) return

    if (this.state.room.phase !== "lobby") return;

    const targetSessionId = payload?.playerId;
    if (!targetSessionId || targetSessionId === client.sessionId) return;

    const targetPlayer = this.state.players.get(targetSessionId);
    if (!targetPlayer) return

    // Find the client and disconnect them
    const targetClient = this.clients.find(c => c.sessionId === targetSessionId);
    if (targetClient) targetClient.leave()
  }

  private handleStartGame(client: Client) {
    // Only leader can start the game
    if (client.sessionId !== this.state.room.leaderId) return;

    if (this.state.room.phase !== "lobby") return;

    // Check that all players have selected an icon
    const playersWithoutIcon = Array.from(this.state.players.values()).filter(p => !p.icon);
    if (playersWithoutIcon.length > 0) {
      client.send("startGameError", { error: "All players must select an icon" });
      return;
    }

    this.startGame();
  }

  private startGame() {
    if (this.state.room.phase === "active") {
      return;
    }

    this.state.room.phase = "active";
    
    // Give each player the starting cash amount
    Array.from(this.state.players.values()).forEach(player => {
      player.money = this.state.room.startingCash;
    });
    
    this.gameEngine.startGame();
    void this.updateMetadata();
  }

  public finishGame(reason: string = "completed") {
    if (this.state.room.phase !== "active") {
      return;
    }

    this.state.room.phase = "finished";
    void this.updateMetadata();
    logAnalyticsEvent("game_finished", { roomId: this.roomId, reason });
    this.disconnect();
  }

  private async updateMetadata() {
    await this.setMetadata({
      visibility: this.state.room.visibility,
      joinCode: this.state.room.joinCode,
      phase: this.state.room.phase,
      connectedPlayers: this.state.players.size,
      maxPlayers: this.maxClients
    });

    RoomManager.updateRoomPhase(this);
  }

  private clearEmptyRoomTimeout() {
    if (this.emptyRoomTimer) {
      this.emptyRoomTimer.clear();
      this.emptyRoomTimer = undefined;
    }
  }
}
