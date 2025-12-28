import { readFileSync } from "fs";
import path from "path";
import { GameAction, PlayerState, RoomState } from "@color-wars/shared/src/types/RoomState";
import { PLAYER } from "@color-wars/shared/src/config/game";
import { Client, Room } from "colyseus";
import { StatusEffect } from "@color-wars/shared/src/types/RoomState";
import { RewardID, StatusEffectID } from "@color-wars/shared/src/types/effectId";
import { cli } from "winston/lib/winston/config";

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

    this.state.pushAction('ROLL_DICE', client.sessionId, {die1, die2})

    const player = this.state.game.players.get(client.sessionId)!;
    const fromTile = player.position;
    const toTile = (fromTile+roll) % 34

    player.position = toTile
    this.state.pushAction('MOVE_PLAYER', client.sessionId, {fromTile, toTile, tokenId: client.sessionId})

    // player.money += 200
    // this.state.pushAction('INCR_MONEY', client.sessionId, {playerId: client.sessionId, amount: 200})

    // player.money -= 200
    // this.state.pushAction('DECR_MONEY', client.sessionId, {playerId: client.sessionId, amount: 200})

    this.state.pushAction('DRAW_3_REWARD_CARDS', client.sessionId, {playerId: client.sessionId, cardIds: ['GET_500_CASH','GET_2000_CASH',"GET_KILL_CARD"]})

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

// server/logic/EffectHandlers.ts
export interface EffectContext {
  state: RoomState;
  playerId: string;
}

export const RewardEffects: Record<RewardID, (ctx: EffectContext) => void> = {
  'GET_500_CASH': (ctx: EffectContext) => {},
  'GET_2000_CASH': (ctx: EffectContext) => {},
  'GET_KILL_CARD': (ctx: EffectContext) => {},
  'GET_SHIELD_CARD': (ctx: EffectContext) => {},
};


// server/logic/TurnProcessor.ts
export function processStatusEffects(state: RoomState, playerId: string) {
  const player = state.game.players.get(playerId)!;
  
  // Iterate backwards to allow safe removal
  for (let i = player.statusEffects.length - 1; i >= 0; i--) {
    const effect = player.statusEffects[i];
    
    switch (effect.id as StatusEffectID) {
      case "DEBT":
        // Example: Deduct money each turn
        player.money -= 100; // Deduct 100 as an example
        break;
      case "INCOME":
        // Example: Add money each turn
        player.money += 100; // Add 100 as an example
        break;
      default:
        break;
    }

    effect.duration -= 1;
    if (effect.duration <= 0) {
      player.statusEffects.splice(i, 1);
    }
  }
}