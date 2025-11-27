import { Client, Delayed, Room } from "colyseus";
import { ChatMessage, GameState, PlayerState } from "../state/GameState";
import { RoomManager } from "../matchmaking/RoomManager";
import {
  DEFAULT_MAX_PLAYERS,
  DEFAULT_MIN_PLAYERS,
  EMPTY_ROOM_GRACE_PERIOD_MS,
  LOBBY_DURATION_MS,
  MAX_CHAT_LOG_LENGTH,
  ROOM_TYPE,
  WAITING_TIMEOUT_MS
} from "../constants";
import { logAnalyticsEvent } from "../utils/logger";
import { GameEngine } from "../game/GameEngine";

export interface CreateRoomOptions {
  isPrivate?: boolean;
  joinCode?: string | null;
  maxPlayers?: number;
  minPlayers?: number;
}

interface ChatMessagePayload {
  message: string;
}

interface PurchaseTerritoryPayload {
  territoryId?: string;
}

interface SetIconPayload {
  icon: string;
}

interface SetColorPayload {
  color: string
}

interface UpdateRoomSettingsPayload {
  maxPlayers?: number;
  startingCash?: number;
  isPublic?: boolean;
}

interface KickPlayerPayload {
  sessionId: string;
}

export class GameRoom extends Room<GameState> {
  private emptyRoomTimer?: Delayed;
  private disposeReason: string | null = null;
  private gameEngine!: GameEngine;
  private spectators: Set<string> = new Set();

  async onCreate(options: CreateRoomOptions = {}) {
    const isPrivate = options.isPrivate ?? false;
    const joinCode = options.joinCode ?? null;
    const maxPlayers = options.maxPlayers ?? DEFAULT_MAX_PLAYERS;
    const minPlayers = options.minPlayers ?? DEFAULT_MIN_PLAYERS;

    this.maxClients = maxPlayers;
    this.autoDispose = true;

    this.state = new GameState(this.roomId, isPrivate, joinCode ?? "", maxPlayers, minPlayers);
    await this.updateMetadata();

    this.gameEngine = new GameEngine(this.state);
    this.gameEngine.setRoomClock(this.clock);
    this.registerMessageHandlers();
    RoomManager.registerRoom(this);
    RoomManager.updateRoomPhase(this);
    logAnalyticsEvent("room_created", { roomId: this.roomId, isPrivate, joinCode });

    // Rooms start in lobby immediately - no countdown system
  }

  async onJoin(client: Client, options?: { playerName?: string; spectator?: boolean }) {
    console.log(`[GameRoom] onJoin - SessionId: ${client.sessionId}, RoomId: ${this.roomId}, Spectator: ${options?.spectator || false}, CurrentPlayers: ${this.state.players.size}`)
    
    // Check if joining as spectator
    if (options?.spectator === true) {
      this.spectators.add(client.sessionId);
      logAnalyticsEvent("spectator_joined", { roomId: this.roomId, spectatorId: client.sessionId });
      return;
    }

    // Guard: Check if this sessionId already exists as a player (shouldn't happen in guest mode)
    if (this.state.players.has(client.sessionId)) {
      console.warn(`[GameRoom] Duplicate sessionId attempted to join: ${client.sessionId}`)
      return;
    }

    const name = typeof options?.playerName === "string" ? options.playerName.trim() : "";
    const trimmed = name.substring(0, 24);
    const fallbackName = `Player-${this.state.players.size + 1}`;
    const finalName = trimmed.length > 0 ? trimmed : fallbackName;

    // Guest-only mode: Each connection is a new player
    const player = new PlayerState(client.sessionId, finalName);
    this.state.players.set(client.sessionId, player);
    console.log(`[GameRoom] Player created - SessionId: ${client.sessionId}, Name: ${finalName}, TotalPlayers: ${this.state.players.size}`)
    
    // Set as leader if first player
    if (!this.state.leaderId) {
      this.state.leaderId = client.sessionId;
      logAnalyticsEvent("leader_assigned", { roomId: this.roomId, leaderId: client.sessionId });
    }

    this.state.connectedPlayers = this.clients.length;
    
    // Add player to game engine's player order (needed for turn order when game starts)
    if (this.state.phase === "lobby" || this.state.phase === "active") {
      this.gameEngine.handlePlayerJoined(player);
    }
    
    this.clearEmptyRoomTimeout();
    await this.updateMetadata();

    logAnalyticsEvent("player_joined", {
      roomId: this.roomId,
      playerId: client.sessionId,
      name: finalName,
      isLeader: this.state.leaderId === client.sessionId
    });
  }

  async onLeave(client: Client, consented?: boolean) {
    console.log(`[GameRoom] onLeave - SessionId: ${client.sessionId}, RoomId: ${this.roomId}, Consented: ${consented}, RemainingPlayers: ${this.state.players.size - 1}`)
    
    // Handle spectator leave
    if (this.spectators.has(client.sessionId)) {
      this.spectators.delete(client.sessionId);
      logAnalyticsEvent("spectator_left", { roomId: this.roomId, spectatorId: client.sessionId });
      return;
    }

    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.warn(`[GameRoom] onLeave called for unknown sessionId: ${client.sessionId}`)
      return;
    }

    logAnalyticsEvent("player_left", { roomId: this.roomId, playerId: client.sessionId, consented: Boolean(consented) });

    // Guest-only mode: Always remove player immediately on disconnect
    // No reconnection logic - each connection is treated as a new session
    this.gameEngine.handlePlayerLeft(client.sessionId);
    this.state.players.delete(client.sessionId);
    console.log(`[GameRoom] Player removed - SessionId: ${client.sessionId}, RemainingPlayers: ${this.state.players.size}`)

    this.state.connectedPlayers = this.clients.length;
    
    // Handle leader handoff if leader left
    if (this.state.leaderId === client.sessionId) {
      this.assignNewLeader();
    }
    
    await this.updateMetadata();

    if (this.clients.length === 0) {
      this.scheduleEmptyRoomDisposal();
    }
  }
  
  private assignNewLeader() {
    // Find the next connected player to be leader
    const connectedPlayers = Array.from(this.state.players.values())
      .filter(p => p.connected)
      .sort((a, b) => a.joinedAt - b.joinedAt);
    
    if (connectedPlayers.length > 0) {
      this.state.leaderId = connectedPlayers[0].sessionId;
      logAnalyticsEvent("leader_reassigned", {
        roomId: this.roomId,
        newLeaderId: this.state.leaderId
      });
    } else {
      this.state.leaderId = "";
    }
  }

  async onDispose() {
    this.clearEmptyRoomTimeout();
    RoomManager.unregisterRoom(this);
    logAnalyticsEvent("room_disposed", {
      roomId: this.roomId,
      phase: this.state.phase,
      reason: this.disposeReason ?? "normal"
    });

    if (this.state.phase === "active") {
      logAnalyticsEvent("game_finished", { roomId: this.roomId, reason: "room_disposed" });
    }
  }

  getIsPrivate() {
    return this.state.isPrivate;
  }

  getIsPublic() {
    return this.state.isPublic;
  }

  getJoinCode() {
    return this.state.joinCode;
  }

  getPhase() {
    return this.state.phase;
  }

  private registerMessageHandlers() {
    this.onMessage("chat", (client, payload: ChatMessagePayload) => {
      if (this.spectators.has(client.sessionId)) {
        return; // Spectators cannot send chat messages
      }
      this.handleChat(client, payload);
    });
    
    this.onMessage("setIcon", (client, payload: SetIconPayload) => {
      if (this.spectators.has(client.sessionId)) {
        return;
      }
      this.handleSetIcon(client, payload);
    });

    this.onMessage("setColor", (client, payload: SetColorPayload) => {
      if (this.spectators.has(client.sessionId)) {
        return;
      }
      this.handleSetColor(client, payload);
    });
    
    this.onMessage("updateRoomSettings", (client, payload: UpdateRoomSettingsPayload) => {
      if (this.spectators.has(client.sessionId)) {
        return;
      }
      this.handleUpdateRoomSettings(client, payload);
    });
    
    this.onMessage("kickPlayer", (client, payload: KickPlayerPayload) => {
      if (this.spectators.has(client.sessionId)) {
        return;
      }
      this.handleKickPlayer(client, payload);
    });
    
    this.onMessage("startGame", (client) => {
      if (this.spectators.has(client.sessionId)) {
        return;
      }
      this.handleStartGame(client);
    });
    
    this.onMessage("rollDice", (client) => {
      if (this.spectators.has(client.sessionId)) {
        return; // Spectators cannot roll dice
      }
      this.gameEngine.handleRoll(client);
    });
    
    this.onMessage("purchaseTerritory", (client, payload: PurchaseTerritoryPayload) => {
      if (this.spectators.has(client.sessionId)) {
        return; // Spectators cannot purchase territories
      }
      const territoryId = typeof payload?.territoryId === "string" ? payload.territoryId : "";
      const result = this.gameEngine.handlePurchaseTerritory(client, territoryId);
      client.send("purchaseResult", result);
    });
    
    this.onMessage("endTurn", (client) => {
      if (this.spectators.has(client.sessionId)) {
        return; // Spectators cannot end turn
      }
      this.gameEngine.handleEndTurn(client);
    });
  }

  private handleChat(client: Client, payload: ChatMessagePayload) {
    if (!payload || typeof payload.message !== "string") {
      return;
    }

    const trimmed = payload.message.trim();
    if (trimmed.length === 0) {
      return;
    }

    const chatMessage = new ChatMessage(client.sessionId, trimmed.substring(0, 256));
    this.state.chatLog.push(chatMessage);

    if (this.state.chatLog.length > MAX_CHAT_LOG_LENGTH) {
      this.state.chatLog.shift();
    }
  }

  private handleSetIcon(client: Client, payload: SetIconPayload) {
    if (this.state.phase !== "lobby") {
      return; // Can only change icon in lobby
    }
    
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }

    const icon = typeof payload?.icon === "string" ? payload.icon.trim() : "";
    if (!icon) {
      return;
    }

    // Check if icon is already taken by another player
    const iconTaken = Array.from(this.state.players.values()).some(
      p => p.sessionId !== client.sessionId && p.icon === icon
    );

    if (iconTaken) {
      client.send("iconError", { error: "Icon already taken" });
      return;
    }

    player.icon = icon;
    logAnalyticsEvent("player_icon_set", { roomId: this.roomId, playerId: client.sessionId, icon });
  }

  private handleSetColor(client: Client, payload: SetColorPayload) {
    if (this.state.phase !== "lobby") {
      return; // Can only change icon in lobby
    }
    
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }

    const color = typeof payload?.color === "string" ? payload.color.trim() : "";
    if (!color) {
      return;
    }
    // Check if color is already taken by another player
    const iconTaken = Array.from(this.state.players.values()).some(
      p => p.sessionId !== client.sessionId && p.color === color
    );

    if (iconTaken) {
      client.send("iconError", { error: "color already taken" });
      return;
    }

    player.color = color;
    logAnalyticsEvent("player_color_set", { roomId: this.roomId, playerId: client.sessionId, color });
  }

  private handleUpdateRoomSettings(client: Client, payload: UpdateRoomSettingsPayload) {
    // Only leader can update settings
    if (client.sessionId !== this.state.leaderId) {
      return;
    }

    if (this.state.phase !== "lobby") {
      return; // Can only change settings in lobby
    }

    if (typeof payload.maxPlayers === "number" && payload.maxPlayers >= 1 && payload.maxPlayers <= 12) {
      this.state.maxPlayers = payload.maxPlayers;
      this.maxClients = payload.maxPlayers;
    }

    if (typeof payload.startingCash === "number" && payload.startingCash >= 0) {
      this.state.startingCash = payload.startingCash;
    }

    if (typeof payload.isPublic === "boolean") {
      // Can toggle isPublic for any room during lobby
      this.state.isPublic = payload.isPublic;
    }

    logAnalyticsEvent("room_settings_updated", {
      roomId: this.roomId,
      leaderId: client.sessionId,
      maxPlayers: this.state.maxPlayers,
      startingCash: this.state.startingCash,
      isPublic: this.state.isPublic
    });
  }

  private async handleKickPlayer(client: Client, payload: KickPlayerPayload) {
    // Only leader can kick players
    if (client.sessionId !== this.state.leaderId) {
      return;
    }

    if (this.state.phase !== "lobby") {
      return; // Can only kick during lobby
    }

    const targetSessionId = payload?.sessionId;
    if (!targetSessionId || targetSessionId === client.sessionId) {
      return; // Can't kick yourself
    }

    const targetPlayer = this.state.players.get(targetSessionId);
    if (!targetPlayer) {
      return;
    }

    // Find the client and disconnect them
    const targetClient = this.clients.find(c => c.sessionId === targetSessionId);
    if (targetClient) {
      logAnalyticsEvent("player_kicked", {
        roomId: this.roomId,
        leaderId: client.sessionId,
        kickedPlayerId: targetSessionId
      });
      await targetClient.leave(1000); // Close code 1000 = normal closure
    }
  }

  private handleStartGame(client: Client) {
    // Only leader can start the game
    if (client.sessionId !== this.state.leaderId) {
      return;
    }

    if (this.state.phase !== "lobby") {
      return; // Can only start from lobby
    }

    // Check that all players have selected an icon
    const playersWithoutIcon = Array.from(this.state.players.values()).filter(p => !p.icon);
    if (playersWithoutIcon.length > 0) {
      client.send("startGameError", { error: "All players must select an icon" });
      return;
    }

    this.startGame();
  }

  private startGame() {
    if (this.state.phase === "active") {
      return;
    }

    this.state.phase = "active";
    this.disposeReason = null;
    
    // Give each player the starting cash amount
    Array.from(this.state.players.values()).forEach(player => {
      player.money = this.state.startingCash;
    });
    
    this.gameEngine.startGame();
    void this.updateMetadata();
    logAnalyticsEvent("game_started", {
      roomId: this.roomId,
      players: this.state.connectedPlayers,
      leaderId: this.state.leaderId,
      startingCash: this.state.startingCash
    });
  }

  public finishGame(reason: string = "completed") {
    if (this.state.phase !== "active") {
      return;
    }

    this.state.phase = "finished";
    this.disposeReason = reason;
    void this.updateMetadata();
    logAnalyticsEvent("game_finished", { roomId: this.roomId, reason });
    this.disconnect();
  }

  private scheduleEmptyRoomDisposal() {
    this.clearEmptyRoomTimeout();
    this.emptyRoomTimer = this.clock.setTimeout(() => {
      this.disposeReason = "empty_timeout";
      this.disconnect();
    }, EMPTY_ROOM_GRACE_PERIOD_MS);
  }

  private async updateMetadata() {
    await this.setMetadata({
      isPrivate: this.state.isPrivate,
      isPublic: this.state.isPublic,
      joinCode: this.state.joinCode,
      phase: this.state.phase,
      connectedPlayers: this.state.connectedPlayers,
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
