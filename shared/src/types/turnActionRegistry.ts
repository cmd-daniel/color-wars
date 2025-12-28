// src/types/registry.ts
import { type RewardID } from "./effectId";

export const TURN_ACTION_REGISTRY = {
  MOVE_PLAYER: {} as { fromTile: number, toTile: number, tokenId: string },
  ROLL_DICE: {} as { die1: number, die2: number },
  INCR_MONEY: {} as { playerId: string, amount: number },
  DECR_MONEY: {} as { playerId: string, amount: number },
  DRAW_3_REWARD_CARDS: {} as { playerId: string, cardIds: RewardID[] },
  SELECT_CARD: {} as {selectedCardId: string}

} as const;

export type ActionType = keyof typeof TURN_ACTION_REGISTRY;

export type ActionData = {
  [K in ActionType]: {
    type: K;
    payload: (typeof TURN_ACTION_REGISTRY)[K];
  };
}[ActionType];

export const ACTION_TYPES = Object.keys(
  TURN_ACTION_REGISTRY
) as readonly ActionType[];

export function isActionType(v: string): v is ActionType {
  return ACTION_TYPES.includes(v as ActionType);
}