import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { DEFAULT } from "../constants";

export type RoomPhase = "lobby" | "active" | "finished";
export type TurnPhase = "awaiting-roll" | "awaiting-end-turn";
export type RoomVisibility = "private" | "public";

export class PlayerState extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("string") icon: string = "";
  @type("boolean") connected: boolean = true;
  @type("string") color: string = "#38bdf8";
  @type("number") money: number = DEFAULT.PLAYER.STARTING_CASH;
  @type("number") position: number = 0;
  @type("number") round: number = 0;
  @type("boolean") ready: boolean = false;
  @type(["string"]) ownedTerritories = new ArraySchema<string>();

  constructor(id: string, name: string) {
    super();
    this.name = name;
    this.id = id;
  }
}

export class RoomState extends Schema {
  @type("string") roomId: string;
  @type("int8") maxPlayers = 4;
  @type("string") mapId: string = ""; // TODO: set default mapID
  @type("string") joinCode: string = "";
  @type("string") leaderId: string = "";
  @type("uint16") startingCash = 1500;
  @type("string") phase: RoomPhase = "lobby";
  @type("string") visibility: RoomVisibility = "private";

  constructor(roomId: string) {
    super();
    this.roomId = roomId;
  }
}

export class GameState extends Schema {
  @type(RoomState) room: RoomState;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type(["string"]) playerOrder = new ArraySchema<string>();
  @type("string") turnPhase: TurnPhase = "awaiting-roll";
  @type("string") activePlayerId: string = "";
  @type(["number"]) lastRoll = new ArraySchema<number>();
  @type({ map: "string" }) territoryOwnership = new MapSchema<string>();

  constructor(roomId: string) {
    super();
    this.room = new RoomState(roomId);
  }
}
