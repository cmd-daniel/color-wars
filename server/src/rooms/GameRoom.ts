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

export interface CreateRoomOptions {
  isPrivate?: boolean;
  joinCode?: string | null;
  maxPlayers?: number;
  minPlayers?: number;
}

interface ReadyMessagePayload {
  ready: boolean;
}

interface ChatMessagePayload {
  message: string;
}

export class GameRoom extends Room<GameState> {
  private waitingTimer?: Delayed;
  private lobbyTimer?: Delayed;
  private emptyRoomTimer?: Delayed;

  private waitingForced = false;
  private disposeReason: string | null = null;

  async onCreate(options: CreateRoomOptions = {}) {
    const isPrivate = options.isPrivate ?? false;
    const joinCode = options.joinCode ?? null;
    const maxPlayers = options.maxPlayers ?? DEFAULT_MAX_PLAYERS;
    const minPlayers = options.minPlayers ?? DEFAULT_MIN_PLAYERS;

    this.maxClients = maxPlayers;
    this.autoDispose = false;

    this.setState(new GameState(this.roomId, isPrivate, joinCode ?? "", maxPlayers, minPlayers));
    await this.updateMetadata();

    this.registerMessageHandlers();
    RoomManager.registerRoom(this);
    RoomManager.updateRoomPhase(this);
    logAnalyticsEvent("room_created", { roomId: this.roomId, isPrivate, joinCode });

    this.scheduleWaitTimeout();
  }

  async onJoin(client: Client, options?: { playerName?: string }) {
    const name = typeof options?.playerName === "string" ? options.playerName.trim() : "";
    const trimmed = name.substring(0, 24);
    const fallbackName = `Player-${this.state.players.size + 1}`;
    const finalName = trimmed.length > 0 ? trimmed : fallbackName;

    let player = this.state.players.get(client.sessionId);
    if (!player) {
      player = new PlayerState(client.sessionId, finalName);
      this.state.players.set(client.sessionId, player);
    } else {
      player.name = finalName;
      player.connected = true;
      player.ready = false;
    }

    this.state.connectedPlayers = this.clients.length;
    this.clearEmptyRoomTimeout();
    await this.updateMetadata();

    logAnalyticsEvent("player_joined", { roomId: this.roomId, playerId: client.sessionId, name: finalName });
    this.maybeEnterLobbyPhase();
  }

  async onLeave(client: Client, consented?: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }

    logAnalyticsEvent("player_left", { roomId: this.roomId, playerId: client.sessionId, consented: Boolean(consented) });

    if (!consented) {
      player.connected = false;
      this.state.connectedPlayers = this.clients.length;
      await this.updateMetadata();

      try {
        await this.allowReconnection(client, 30);
        player.connected = true;
        this.state.connectedPlayers = this.clients.length;
        await this.updateMetadata();
        return;
      } catch {
        this.state.players.delete(client.sessionId);
      }
    } else {
      this.state.players.delete(client.sessionId);
    }

    this.state.connectedPlayers = this.clients.length;
    await this.updateMetadata();

    if (this.clients.length === 0) {
      this.scheduleEmptyRoomDisposal();
    } else if (this.state.phase === "lobby" && this.state.connectedPlayers < this.state.minPlayers) {
      this.resetToWaitingPhase();
    }
  }

  async onDispose() {
    this.clearWaitTimeout();
    this.clearLobbyTimeout();
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

  getJoinCode() {
    return this.state.joinCode;
  }

  getPhase() {
    return this.state.phase;
  }

  private registerMessageHandlers() {
    this.onMessage("chat", (client, payload: ChatMessagePayload) => this.handleChat(client, payload));
    this.onMessage("ready", (client, payload: ReadyMessagePayload) => this.handleReady(client, payload));
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

  private handleReady(client: Client, payload: ReadyMessagePayload) {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }

    player.ready = Boolean(payload?.ready);

    if (this.state.phase === "lobby" && this.areAllPlayersReady()) {
      this.startGame();
    }
  }

  private maybeEnterLobbyPhase() {
    if (this.state.phase !== "waiting") {
      return;
    }

    if (this.state.connectedPlayers >= this.state.minPlayers) {
      this.enterLobbyPhase(false);
    }
  }

  private enterLobbyPhase(forced: boolean) {
    if (this.state.phase === "lobby" || this.state.phase === "active") {
      return;
    }

    this.waitingForced = forced;
    this.state.phase = "lobby";
    this.state.lobbyEndsAt = Date.now() + LOBBY_DURATION_MS;
    this.state.waitTimeoutAt = 0;
    this.clearWaitTimeout();
    this.scheduleLobbyTimeout();
    void this.updateMetadata();
  }

  private scheduleWaitTimeout() {
    this.clearWaitTimeout();
    this.state.waitTimeoutAt = Date.now() + WAITING_TIMEOUT_MS;
    this.waitingTimer = this.clock.setTimeout(() => this.handleWaitTimeout(), WAITING_TIMEOUT_MS);
  }

  private handleWaitTimeout() {
    if (this.state.phase !== "waiting") {
      return;
    }

    if (this.state.connectedPlayers === 0 && !this.state.isPrivate) {
      this.disposeReason = "no_players_joined";
      this.disconnect();
      return;
    }

    this.enterLobbyPhase(true);
  }

  private scheduleLobbyTimeout() {
    this.clearLobbyTimeout();
    this.lobbyTimer = this.clock.setTimeout(() => this.startGame(), LOBBY_DURATION_MS);
  }

  private startGame() {
    if (this.state.phase === "active") {
      return;
    }

    this.state.phase = "active";
    this.state.lobbyEndsAt = 0;
    this.state.waitTimeoutAt = 0;
    this.disposeReason = null;
    this.clearLobbyTimeout();
    void this.updateMetadata();
    logAnalyticsEvent("game_started", {
      roomId: this.roomId,
      forced: this.waitingForced,
      players: this.state.connectedPlayers
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

  private resetToWaitingPhase() {
    this.state.phase = "waiting";
    this.state.lobbyEndsAt = 0;
    this.waitingForced = false;
    this.disposeReason = null;
    void this.updateMetadata();
    this.scheduleWaitTimeout();
  }

  private areAllPlayersReady() {
    return Array.from(this.state.players.values())
      .filter((player) => player.connected)
      .every((player) => player.ready);
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
      joinCode: this.state.joinCode,
      phase: this.state.phase,
      connectedPlayers: this.state.connectedPlayers,
      maxPlayers: this.maxClients
    });

    RoomManager.updateRoomPhase(this);
  }

  private clearWaitTimeout() {
    if (this.waitingTimer) {
      this.waitingTimer.clear();
      this.waitingTimer = undefined;
    }
  }

  private clearLobbyTimeout() {
    if (this.lobbyTimer) {
      this.lobbyTimer.clear();
      this.lobbyTimer = undefined;
    }
  }

  private clearEmptyRoomTimeout() {
    if (this.emptyRoomTimer) {
      this.emptyRoomTimer.clear();
      this.emptyRoomTimer = undefined;
    }
  }
}
