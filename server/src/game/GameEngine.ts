import { readFileSync } from "fs";
import path from "path";
import { GameState, PlayerState } from "@color-wars/shared/src/types/RoomState";
import { PLAYER } from '@color-wars/shared/src/config/game'
import { env } from "../config/env";

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
    const customPath = env.mapDefinitionPath;
    const filePath = customPath ?? path.resolve(__dirname,"../../../client/public/sample-subcontinent.json");
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as MapDefinition
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

  constructor(private readonly state: GameState) {
    this.mapDefinition = loadDefaultMapDefinition();
  }

  setRoomClock(clock: {
    setTimeout: (callback: () => void, delay: number) => any;
  }) {
    this.roomClock = clock;
  }

  handlePlayerJoined(player: PlayerState) {
    this.state.playerOrder.push(player.id);

    const takenColors = new Set();
    const takenIcons = new Set();

    this.state.players.forEach((p) => {
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
    this.state.turnPhase = "awaiting-roll";
    //this.state.lastRoll.clear();
  }

  handleRoll() {

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const roll = die1 + die2;

    // Store dice values immediately for client animation
    //this.state.lastRoll.clear()
    //this.state.lastRoll.push(die1,die2);
  }
}
