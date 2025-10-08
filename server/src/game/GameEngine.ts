import { readFileSync } from "fs";
import path from "path";
import type { Client } from "colyseus";
import {
  GameLogEntryState,
  GameLogEntryType,
  GameState,
  PlayerState,
  TrackEventDefinitionState,
  TrackEventKind,
  TrackEventResultState,
  TrackSpaceState,
  TurnPhase,
  TerritoryInfoState
} from "../state/GameState";
import { logger } from "../utils/logger";

const STARTING_CASH = 600;
const PASS_START_INCOME_FALLBACK = 120;
const PLAYER_COLORS = ["#38bdf8", "#f472b6", "#facc15", "#a855f7"];
const TRACK_LENGTH = 35;
const MAX_LOGS = 200;

type GameLogOptions = {
  type?: GameLogEntryType;
  detail?: string;
};

type TrackEventConfig =
  | {
      kind: "bonus" | "penalty";
      amount: number;
      label: string;
      description: string;
    }
  | {
      kind: "roll-again";
      label: string;
      description: string;
    }
  | {
      kind: "chest-bonus" | "chest-penalty";
      min: number;
      max: number;
      label: string;
      description: string;
    };

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

const TRACK_EVENT_PATTERN: TrackEventConfig[] = [
  { kind: "bonus", amount: 500, label: "+500", description: "Windfall supply payout" },
  { kind: "penalty", amount: 200, label: "-200", description: "Logistics setback" },
  { kind: "chest-bonus", min: 150, max: 450, label: "?", description: "Reward cache" },
  { kind: "roll-again", label: "↺", description: "Momentum surge" },
  { kind: "chest-penalty", min: 120, max: 320, label: "☠", description: "Sabotage chest" },
  { kind: "bonus", amount: 300, label: "+300", description: "Investor boost" },
  { kind: "penalty", amount: 150, label: "-150", description: "Maintenance drain" }
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

const pickRandom = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const buildTrackEventDefinition = (config: TrackEventConfig, seedIndex: number) => {
  const definition = new TrackEventDefinitionState();
  definition.kind = config.kind as TrackEventKind;
  definition.description = config.description;
  definition.label = config.label;
  definition.amount = 0;
  definition.min = 0;
  definition.max = 0;

  switch (config.kind) {
    case "bonus":
    case "penalty":
      definition.amount = config.amount;
      break;
    case "chest-bonus":
    case "chest-penalty": {
      const offset = seedIndex % TRACK_EVENT_PATTERN.length;
      definition.min = config.min + offset * 5;
      definition.max = config.max + offset * 5;
      break;
    }
    case "roll-again":
      break;
    default:
      break;
  }

  return definition;
};

const buildTrackSpaces = () => {
  const spaces: TrackSpaceState[] = [];
  for (let index = 0; index < TRACK_LENGTH; index += 1) {
    const trackSpace = new TrackSpaceState();
    trackSpace.index = index;

    if (index === 0) {
      trackSpace.type = "start";
      trackSpace.label = "Launch";
      spaces.push(trackSpace);
      continue;
    }

    const config = TRACK_EVENT_PATTERN[(index - 1) % TRACK_EVENT_PATTERN.length];
    trackSpace.type = "event";
    trackSpace.label = config.label;
    trackSpace.event = buildTrackEventDefinition(config, index);

    spaces.push(trackSpace);
  }

  return spaces;
};

const loadDefaultMapDefinition = (): MapDefinition | null => {
  try {
    const customPath = process.env.MAP_DEFINITION_PATH;
    const filePath =
      customPath && customPath.trim().length > 0
        ? customPath
        : path.resolve(__dirname, "../../../client/public/sample-subcontinent.json");
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as MapDefinition;

    if (!parsed?.territories || !Array.isArray(parsed.territories)) {
      throw new Error("Map definition missing territories array");
    }

    return parsed;
  } catch (error) {
    logger.error("map_definition_load_failed", { message: (error as Error).message });
    return null;
  }
};

export class GameEngine {
  private mapDefinition: MapDefinition | null;

  constructor(private readonly state: GameState) {
    this.mapDefinition = loadDefaultMapDefinition();
    this.initializeTrack();
    this.initializeTerritories();
  }

  handlePlayerJoined(player: PlayerState) {
    if (!this.state.playerOrder.includes(player.sessionId)) {
      this.state.playerOrder.push(player.sessionId);
    }

    const playerIndex = this.state.playerOrder.indexOf(player.sessionId);
    if (playerIndex >= 0) {
      player.color = PLAYER_COLORS[playerIndex % PLAYER_COLORS.length];
    }

    if (player.money === 0 && player.position === 0 && player.ownedTerritories.length === 0) {
      player.money = STARTING_CASH;
    }
  }

  handlePlayerLeft(sessionId: string) {
    const orderIndex = this.state.playerOrder.indexOf(sessionId);
    if (orderIndex !== -1) {
      this.state.playerOrder.splice(orderIndex, 1);
    }

    this.state.territoryOwnership.forEach((ownerSessionId, territoryId) => {
      if (ownerSessionId === sessionId) {
        this.state.territoryOwnership.set(territoryId, "");
      }
    });

    if (this.state.currentTurn === sessionId) {
      this.advanceTurnAfterRemoval(orderIndex);
    }
  }

  startGame() {
    this.resetPlayersForMatch();
    this.state.turnPhase = "awaiting-roll";
    this.state.round = 1;
    this.state.lastRoll = 0;
    this.state.lastEvent = undefined;

    const firstSessionId = this.state.playerOrder[0] ?? "";
    this.state.currentTurn = firstSessionId;

    if (firstSessionId) {
      const player = this.state.players.get(firstSessionId);
      this.addLog(`${player?.name ?? "Player"} begins the match`, { type: "turn" });
    }
  }

  handleRoll(client: Client) {
    if (this.state.phase !== "active") {
      return;
    }

    if (this.state.turnPhase !== "awaiting-roll") {
      return;
    }

    if (client.sessionId !== this.state.currentTurn) {
      return;
    }

    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }

    const trackLength = this.state.trackSpaces.length || TRACK_LENGTH;
    if (trackLength === 0) {
      return;
    }

    const roll = Math.floor(Math.random() * 6) + 1;
    const previousPosition = player.position;
    const newPosition = (previousPosition + roll) % trackLength;
    const passedStart = newPosition < previousPosition;

    let passStartReward = 0;
    if (passedStart) {
      passStartReward = this.computePassStartIncome(player);
      if (passStartReward > 0) {
        player.money += passStartReward;
      }
    }

    player.position = newPosition;

    const space = this.state.trackSpaces[newPosition];
    const detailParts: string[] = [];
    if (space?.label) {
      detailParts.push(`Landed on ${space.label}`);
    }
    if (passStartReward > 0) {
      detailParts.push(`Collected ${formatCurrency(passStartReward)} for passing Launch`);
    }

    this.addLog(`${player.name} rolled a ${roll}`, {
      type: "roll",
      detail: detailParts.length > 0 ? detailParts.join(" • ") : undefined
    });

    let nextPhase: TurnPhase = "awaiting-end-turn";
    let lastEventResult: TrackEventResultState | undefined;

    if (space?.type === "event" && space.event) {
      const baseEvent = space.event;
      let amount = baseEvent.amount;
      let delta = 0;
      let detail = baseEvent.description;

      switch (baseEvent.kind) {
        case "bonus":
          delta = amount;
          detail = baseEvent.description || `Bonus ${formatCurrency(amount)}`;
          break;
        case "penalty":
          delta = -amount;
          detail = baseEvent.description || `Penalty ${formatCurrency(amount)}`;
          break;
        case "chest-bonus": {
          const min = baseEvent.min > 0 ? baseEvent.min : 150;
          const max = baseEvent.max > 0 ? baseEvent.max : 400;
          amount = pickRandom(min, max);
          delta = amount;
          detail = `${baseEvent.description}: ${formatCurrency(amount)}`;
          break;
        }
        case "chest-penalty": {
          const min = baseEvent.min > 0 ? baseEvent.min : 80;
          const max = baseEvent.max > 0 ? baseEvent.max : 320;
          amount = pickRandom(min, max);
          delta = -amount;
          detail = `${baseEvent.description}: ${formatCurrency(amount)}`;
          break;
        }
        case "roll-again":
          nextPhase = "awaiting-roll";
          detail = baseEvent.description || "Roll again";
          amount = 0;
          delta = 0;
          break;
        default:
          break;
      }

      if (delta !== 0) {
        player.money = Math.max(0, player.money + delta);
      }

      lastEventResult = new TrackEventResultState();
      lastEventResult.kind = baseEvent.kind as TrackEventKind;
      lastEventResult.label = baseEvent.label;
      lastEventResult.description = baseEvent.description;
      lastEventResult.amount = amount;
      lastEventResult.min = baseEvent.min;
      lastEventResult.max = baseEvent.max;
      lastEventResult.targetPlayerId = player.sessionId;

      const logVerb = delta >= 0 ? "gained" : "lost";
      const magnitude = Math.abs(delta);
      const summary =
        baseEvent.kind === "roll-again"
          ? `${player.name} earned another roll`
          : `${player.name} ${logVerb} ${formatCurrency(magnitude)}`;

      this.addLog(summary, { type: "event", detail });
    }

    this.state.lastRoll = roll;
    this.state.turnPhase = nextPhase;
    this.state.lastEvent = lastEventResult;
  }

  handlePurchaseTerritory(client: Client, territoryId: string) {
    if (!territoryId || this.state.phase !== "active") {
      return;
    }

    if (client.sessionId !== this.state.currentTurn) {
      return;
    }

    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }

    const territory = this.state.territoryInfo.get(territoryId);
    if (!territory) {
      return;
    }

    const owner = this.state.territoryOwnership.get(territoryId);
    if (owner && owner.length > 0) {
      return;
    }

    if (player.money < territory.cost) {
      return;
    }

    player.money -= territory.cost;
    if (!player.ownedTerritories.includes(territoryId)) {
      player.ownedTerritories.push(territoryId);
    }
    this.state.territoryOwnership.set(territoryId, player.sessionId);

    this.addLog(`${player.name} purchased ${territory.name} for ${formatCurrency(territory.cost)}`, {
      type: "purchase"
    });
  }

  handleEndTurn(client: Client) {
    if (this.state.phase !== "active") {
      return;
    }

    if (this.state.turnPhase === "awaiting-roll") {
      return;
    }

    if (client.sessionId !== this.state.currentTurn) {
      return;
    }

    const order = this.state.playerOrder;
    if (order.length === 0) {
      return;
    }

    const currentIndex = order.indexOf(client.sessionId);
    if (currentIndex === -1) {
      return;
    }

    const nextIndex = (currentIndex + 1) % order.length;
    const nextSessionId = order[nextIndex];
    this.state.currentTurn = nextSessionId ?? "";
    this.state.turnPhase = "awaiting-roll";
    this.state.lastRoll = 0;
    this.state.lastEvent = undefined;

    if (nextIndex === 0) {
      this.state.round += 1;
      this.addLog(`Round ${this.state.round} begins`, { type: "turn" });
    } else {
      const nextPlayer = nextSessionId ? this.state.players.get(nextSessionId) : undefined;
      this.addLog(`${nextPlayer?.name ?? "Next player"} is up`, { type: "turn" });
    }
  }

  private initializeTrack() {
    this.state.trackSpaces.splice(0, this.state.trackSpaces.length);
    const spaces = buildTrackSpaces();
    spaces.forEach((space) => {
      this.state.trackSpaces.push(space);
    });
  }

  private initializeTerritories() {
    this.state.territoryInfo.clear();
    this.state.territoryOwnership.clear();

    const definition = this.mapDefinition;
    if (!definition) {
      return;
    }

    this.state.mapId = definition.id ?? "default-map";

    definition.territories.forEach((territory) => {
      const info = new TerritoryInfoState();
      info.id = territory.id;
      info.name = territory.name;
      info.hexCount = territory.hexIds.length;
      info.cost = this.computeTerritoryCost(territory);
      this.state.territoryInfo.set(territory.id, info);
      this.state.territoryOwnership.set(territory.id, "");
    });
  }

  private resetPlayersForMatch() {
    this.state.playerOrder.forEach((sessionId, index) => {
      const player = this.state.players.get(sessionId);
      if (!player) {
        return;
      }

      player.position = 0;
      player.money = STARTING_CASH;
      player.ownedTerritories.splice(0, player.ownedTerritories.length);
      player.color = PLAYER_COLORS[index % PLAYER_COLORS.length];
    });

    this.state.territoryOwnership.forEach((_owner, territoryId) => {
      this.state.territoryOwnership.set(territoryId, "");
    });

    this.state.logs.splice(0, this.state.logs.length);
  }

  private advanceTurnAfterRemoval(previousIndex: number) {
    if (this.state.playerOrder.length === 0) {
      this.state.currentTurn = "";
      this.state.turnPhase = "awaiting-roll";
      this.state.lastRoll = 0;
      this.state.lastEvent = undefined;
      return;
    }

    const nextIndex = previousIndex >= 0 ? previousIndex % this.state.playerOrder.length : 0;
    this.state.currentTurn = this.state.playerOrder[nextIndex] ?? "";
    this.state.turnPhase = "awaiting-roll";
    this.state.lastRoll = 0;
    this.state.lastEvent = undefined;
  }

  private computeTerritoryCost(territory: MapTerritory) {
    const base = 150;
    const perHex = 1;
    const computed = base + territory.hexIds.length * perHex;
    return Math.round(computed);
  }

  private computePassStartIncome(player: PlayerState) {
    let total = 0;
    player.ownedTerritories.forEach((territoryId) => {
      const info = this.state.territoryInfo.get(territoryId);
      if (!info) {
        return;
      }
      total += Math.max(40, Math.round(info.cost * 0.25));
    });

    return total > 0 ? total : PASS_START_INCOME_FALLBACK;
  }

  private addLog(message: string, options: GameLogOptions = {}) {
    const entry = new GameLogEntryState();
    entry.id = `log-${Date.now().toString(36)}-${Math.round(Math.random() * 1_000_000).toString(36)}`;
    entry.timestamp = Date.now();
    entry.message = message;
    entry.type = options.type ?? "info";
    entry.detail = options.detail ?? "";

    this.state.logs.push(entry);

    if (this.state.logs.length > MAX_LOGS) {
      this.state.logs.shift();
    }
  }
}
