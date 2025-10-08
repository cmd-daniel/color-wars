import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export type RoomPhase = "waiting" | "lobby" | "active" | "finished";
export type TurnPhase = "awaiting-roll" | "awaiting-end-turn";
export type TrackEventKind = "bonus" | "penalty" | "chest-bonus" | "chest-penalty" | "roll-again";
export type GameLogEntryType = "info" | "turn" | "roll" | "event" | "purchase";

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

  @type("string")
  color: string;

  @type("number")
  money: number;

  @type("number")
  position: number;

  @type(["string"])
  ownedTerritories = new ArraySchema<string>();

  constructor(sessionId: string, name: string) {
    super();
    this.sessionId = sessionId;
    this.name = name;
    this.ready = false;
    this.connected = true;
    this.joinedAt = Date.now();
    this.color = "#38bdf8";
    this.money = 0;
    this.position = 0;
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

export class TrackEventDefinitionState extends Schema {
  @type("string")
  kind: TrackEventKind;

  @type("number")
  amount: number;

  @type("string")
  description: string;

  @type("string")
  label: string;

  @type("number")
  min: number;

  @type("number")
  max: number;

  constructor() {
    super();
    this.kind = "bonus";
    this.amount = 0;
    this.description = "";
    this.label = "";
    this.min = 0;
    this.max = 0;
  }
}

export class TrackEventResultState extends TrackEventDefinitionState {
  @type("string")
  targetPlayerId: string;

  constructor() {
    super();
    this.targetPlayerId = "";
  }
}

export class TrackSpaceState extends Schema {
  @type("number")
  index: number;

  @type("string")
  type: "start" | "event" | "territory";

  @type("string")
  label: string;

  @type("string")
  territoryId: string;

  @type(TrackEventDefinitionState)
  event?: TrackEventDefinitionState;

  constructor() {
    super();
    this.index = 0;
    this.type = "start";
    this.label = "";
    this.territoryId = "";
  }
}

export class TerritoryInfoState extends Schema {
  @type("string")
  id: string;

  @type("string")
  name: string;

  @type("number")
  hexCount: number;

  @type("number")
  cost: number;

  constructor() {
    super();
    this.id = "";
    this.name = "";
    this.hexCount = 0;
    this.cost = 0;
  }
}

export class GameLogEntryState extends Schema {
  @type("string")
  id: string;

  @type("number")
  timestamp: number;

  @type("string")
  type: GameLogEntryType;

  @type("string")
  message: string;

  @type("string")
  detail: string;

  constructor() {
    super();
    this.id = "";
    this.timestamp = Date.now();
    this.type = "info";
    this.message = "";
    this.detail = "";
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

  @type("string")
  mapId: string;

  @type("string")
  turnPhase: TurnPhase;

  @type("string")
  currentTurn: string;

  @type("number")
  lastRoll: number;

  @type(TrackEventResultState)
  lastEvent?: TrackEventResultState;

  @type("number")
  round: number;

  @type({ map: TerritoryInfoState })
  territoryInfo = new MapSchema<TerritoryInfoState>();

  @type({ map: "string" })
  territoryOwnership = new MapSchema<string>();

  @type([TrackSpaceState])
  trackSpaces = new ArraySchema<TrackSpaceState>();

  @type([GameLogEntryState])
  logs = new ArraySchema<GameLogEntryState>();

  @type(["string"])
  playerOrder = new ArraySchema<string>();

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
    this.mapId = "";
    this.turnPhase = "awaiting-roll";
    this.currentTurn = "";
    this.lastRoll = 0;
    this.round = 1;
  }
}
