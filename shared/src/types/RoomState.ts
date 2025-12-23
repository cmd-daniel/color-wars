import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import type { ActionType, TurnActionRegistry } from "./turnActionRegistry";

export type RoomPhase = "lobby" | "active" | "finished";
export type RoomVisibility = "private" | "public";
export type TradeStatus = "pending" | "accepted" | "rejected";
export type BuildingType = "none" | "city" | "factory" | "silo";
export type TurnPhase = "awaiting-roll" | "resolving-draft" | "resolving-bankruptcy" | "awaiting-end-turn" | "game-over";

export class TerritoryState extends Schema {
  @type("string") ownerId: string = "";
  @type("string") buildingType: BuildingType = "none";
}

export class StatusEffect extends Schema {
  @type("string") id: string;
  @type("number") duration: number;

  constructor(id: string, duration: number) {
    super();
    this.id = id;
    this.duration = duration;
  }
}

export class PlayerState extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("number") money: number = 0;
  @type("string") icon: string = "";
  @type("number") round: number = 0;
  @type("string") color: string = "";
  @type("number") position: number = 0;
  @type("boolean") ready: boolean = false;
  @type("boolean") connected: boolean = true;
  @type("boolean") hasRolled: boolean = true;
  @type(["string"]) cards: ArraySchema<string> = new ArraySchema<string>();
  @type([StatusEffect]) statusEffects: ArraySchema<StatusEffect> = new ArraySchema<StatusEffect>();
  constructor(id: string, name: string) {
    super();
    this.name = name;
    this.id = id;
  }
}

export class Room extends Schema {
  @type("string") id: string;
  @type("int8") maxPlayers = 4;
  @type("string") mapId: string = "";
  @type("string") joinCode: string = "";
  @type("string") leaderId: string = "";
  @type("uint16") startingCash = 1500;
  @type("string") phase: RoomPhase = "lobby";
  @type("string") visibility: RoomVisibility = "private";

  constructor(id: string) {
    super();
    this.id = id;
  }
}

export class TradeOffer extends Schema {
  @type("number") playerAGivesCash: number;
  @type("number") playerBGivesCash: number;
  @type(["string"]) playerAGivesCards: ArraySchema<string>;
  @type(["string"]) playerBGivesCards: ArraySchema<string>;
  @type(["string"]) playerAGivesTerritories: ArraySchema<string>;
  @type(["string"]) playerBGivesTerritories: ArraySchema<string>;

  constructor(
    playerAGivesCash: number,
    playerBGivesCash: number,
    playerAGivesCards: ArraySchema<string>,
    playerBGivesCards: ArraySchema<string>,
    playerAGivesTerritories: ArraySchema<string>,
    playerBGivesTerritories: ArraySchema<string>,
  ) {
    super();
    this.playerAGivesCash = playerAGivesCash;
    this.playerBGivesCash = playerBGivesCash;
    this.playerAGivesCards = playerAGivesCards;
    this.playerBGivesCards = playerBGivesCards;
    this.playerAGivesTerritories = playerAGivesTerritories;
    this.playerBGivesTerritories = playerBGivesTerritories;
  }
}

export class Trade extends Schema {
  @type("string") id: string;
  @type("string") playerAId: string;
  @type("string") playerBId: string;
  @type(TradeOffer) offer: TradeOffer;
  @type("string") currentProposerId: string;
  @type("string") status: TradeStatus = "pending";

  constructor(id: string, playerAId: string, playerBId: string, offer: TradeOffer) {
    super();
    this.id = id;
    this.offer = offer;
    this.playerAId = playerAId;
    this.playerBId = playerBId;
    this.currentProposerId = playerAId;
  }
}

export type DiceStateMode = "ACCELERATING" | "RAGDOLLING" | "ROLLINGTOFACE" | "IDLE";

export class DiceState extends Schema {
  @type("string") mode: DiceStateMode;
  @type(["number"]) rollTo: ArraySchema<number> = new ArraySchema<number>();

  constructor(mode: DiceStateMode = "IDLE", rollTo?: number[]) {
    super();
    this.mode = mode;
    if (rollTo) this.rollTo = new ArraySchema<number>(...rollTo);
  }
}

export class GameAction extends Schema {
  @type("number") id: number;
  @type("string") type: string;
  @type("string") payload: string;
  @type("string") playerId: string;
  @type("number") timestamp: number;

  constructor(type: string, playerId: string, payload: string, timeStamp: number, id: number) {
    super();
    this.id = id;
    this.type = type;
    this.payload = payload;
    this.playerId = playerId;
    this.timestamp = timeStamp;
  }
}

export class GameState extends Schema {
  @type("string") activePlayerId: string = "";
  @type("string") turnPhase: TurnPhase = "awaiting-roll";

  //Map <tradeID, trade>
  @type({ map: Trade }) activeTrades = new MapSchema<Trade>();

  @type(DiceState) diceState: DiceState = new DiceState();

  //Map <playerID, playerState>
  @type({ map: PlayerState }) players: MapSchema<PlayerState> = new MapSchema<PlayerState>();

  //Map <territoryID, territoryState>
  @type({ map: TerritoryState }) territoryOwnership: MapSchema<TerritoryState> = new MapSchema<TerritoryState>();
  @type(["string"]) playerOrder: ArraySchema<string> = new ArraySchema<string>();
  @type("number") currentRound: number = 0;
  @type(["string"]) trackOrder = new ArraySchema<string>();
}

export class RoomState extends Schema {
  private _nextActionId: number = 0;
  @type(Room) room: Room;
  @type({ map: "number" }) playersPings = new MapSchema<number>();
  @type(GameState) game = new GameState();
  @type(GameState) turnCheckpoint: GameState | null = null;
  @type([GameAction]) turnActionHistory = new ArraySchema<GameAction>();

  constructor(roomId: string) {
    super();
    this.room = new Room(roomId);
  }

  createSnapshot() {
    this.turnCheckpoint = this.game.clone();
  }

  pushAction<T extends ActionType>(type: T, playerId: string, payload: TurnActionRegistry[T]) {
    const action = new GameAction(type as string, playerId, JSON.stringify(payload), Date.now(), this._nextActionId++);
    this.turnActionHistory.push(action);
  }
  
  clearTurnHistory() {
    this.turnActionHistory.clear();
    this._nextActionId = 0;
  }
}

export type Message = {
  senderId: string;
  content: string;
  timeStamp: number;
};

export type PlainStateOf<K extends Schema> = ReturnType<K["toJSON"]>;
