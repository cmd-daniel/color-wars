import { readFileSync } from "fs";
import path from "path";
import { GameAction, PlayerState, RoomState } from "@color-wars/shared/src/types/RoomState";
import { PLAYER } from "@color-wars/shared/src/config/game";
import { env } from "../config/env";
import { DiceState } from "@color-wars/shared/src/types/RoomState";
import { Client } from "colyseus";

type MapTerritory = {
  id: string;
  name: string;
  hexIds: string[];
};

type MapDefinition = {
  id: string;
  name: string;
  territories: MapTerritory[];
};

const loadDefaultMapDefinition = (): MapDefinition | null => {
  try {
    const filePath = path.resolve(__dirname, "../../../client/public/india_5.json");
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as MapDefinition;
    return parsed;
  } catch (error) {
    return null;
  }
};

export class GameEngine {
  private mapDefinition: MapDefinition | null;
  private roomClock?: {
    setTimeout: (callback: () => void, delay: number) => any;
  };

  constructor(private readonly state: RoomState) {
    this.mapDefinition = loadDefaultMapDefinition();
  }

  setRoomClock(clock: { setTimeout: (callback: () => void, delay: number) => any }) {
    this.roomClock = clock;
  }

  handlePlayerJoined(player: PlayerState) {
    this.state.game.playerOrder.push(player.id);

    const takenColors = new Set();
    const takenIcons = new Set();

    this.state.game.players.forEach((p) => {
      takenColors.add(p.color);
      takenIcons.add(p.icon);
    });

    for (const color of PLAYER.COLORS) {
      if (!takenColors.has(color)) {
        player.color = color;
        break;
      }
    }
    for (const icon of PLAYER.ICONS) {
      if (!takenIcons.has(icon)) {
        player.icon = icon;
        break;
      }
    }
  }

  startGame() {

    for(const playerID of this.state.game.playerOrder){
      const player = this.state.game.players.get(playerID)!
      player.money = 1500
      player.position = 0
      player.hasRolled = false;
    }

    this.state.game.activePlayerId = this.state.game.playerOrder.at(0)
    this.state.game.turnPhase = "awaiting-roll";
  }

  handleRoll(client: Client) {
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const roll = die1 + die2;
    const lastActionId = this.state.turnActionHistory.length > 0 ? this.state.turnActionHistory[this.state.turnActionHistory.length -1].id : -1

    const rollAction = new GameAction(
      'ROLL_DICE',
      client.sessionId,
      JSON.stringify({die1, die2}),
      Date.now(),
      lastActionId + 1
    )

    this.state.turnActionHistory.push(rollAction)

    const player = this.state.game.players.get(client.sessionId)!;
    const fromTile = player.position;
    const toTile = (fromTile+roll) % 34
    const moveAction = new GameAction(
      'MOVE_PLAYER',
      client.sessionId,
      JSON.stringify({fromTile, toTile, tokenId: client.sessionId}),
      Date.now(),
      lastActionId + 2
    )
    player.position = toTile
    this.state.turnActionHistory.push(moveAction)

    player.hasRolled = true;
  }

  endTurn() {
    const currentIdx = this.state.game.playerOrder.indexOf(this.state.game.activePlayerId);
    
    const nextIdx = (currentIdx + 1) % this.state.game.playerOrder.length;
    if(nextIdx === 0){
      this.state.game.currentRound += 1;
      for(const [,player] of this.state.game.players){
        player.hasRolled = false;
      }
    }
    this.state.game.activePlayerId = this.state.game.playerOrder[nextIdx];
    this.state.game.turnPhase = "awaiting-roll";
  }
}
