import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export type RoomPhase = "waiting" | "lobby" | "active" | "finished";

export class PlayerState extends Schema {
  @type("string")
  sessionId: string;

  @type("string")
  name: string;

  @type("boolean")
  ready: boolean;

  @type("boolean")
  connected: boolean;

  @type("number")
  joinedAt: number;

  constructor(sessionId: string, name: string) {
    super();
    this.sessionId = sessionId;
    this.name = name;
    this.ready = false;
    this.connected = true;
    this.joinedAt = Date.now();
  }
}

export class ChatMessage extends Schema {
  @type("string")
  senderId: string;

  @type("string")
  message: string;

  @type("number")
  timestamp: number;

  constructor(senderId: string, message: string) {
    super();
    this.senderId = senderId;
    this.message = message;
    this.timestamp = Date.now();
  }
}

export class GameState extends Schema {
  @type("string")
  roomId: string;

  @type("boolean")
  isPrivate: boolean;

  @type("string")
  joinCode: string;

  @type("string")
  phase: RoomPhase;

  @type("number")
  maxPlayers: number;

  @type("number")
  minPlayers: number;

  @type({ map: PlayerState })
  players = new MapSchema<PlayerState>();

  @type("number")
  connectedPlayers: number;

  @type("number")
  lobbyEndsAt: number;

  @type("number")
  waitTimeoutAt: number;

  @type([ChatMessage])
  chatLog = new ArraySchema<ChatMessage>();

  constructor(roomId: string, isPrivate: boolean, joinCode: string, maxPlayers: number, minPlayers: number) {
    super();
    this.roomId = roomId;
    this.isPrivate = isPrivate;
    this.joinCode = joinCode;
    this.maxPlayers = maxPlayers;
    this.minPlayers = minPlayers;
    this.phase = "waiting";
    this.connectedPlayers = 0;
    this.lobbyEndsAt = 0;
    this.waitTimeoutAt = 0;
  }
}
