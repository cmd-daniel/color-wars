// src/types/registry.ts

export interface TurnActionRegistry {
  MOVE_PLAYER: { fromTile: number; toTile: number; tokenId: string };
  ROLL_DICE: { die1: number; die2: number };
  INCR_MONEY: { playerId: string; amount: number };
  DECR_MONEY: { playerId: string; amount: number };
}

// ActionType is now strictly constrained to the keys of the interface
export type ActionType = keyof TurnActionRegistry;

export type ActionData = {
  [K in ActionType]: {
    type: K;
    payload: TurnActionRegistry[K];
  };
}[ActionType];

export const ACTION_TYPES = Object.keys(
  {} as TurnActionRegistry
) as readonly ActionType[];

export function isActionType(v: string): v is ActionType {
  return ACTION_TYPES.includes(v as ActionType);
}