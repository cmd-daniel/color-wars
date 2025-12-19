export const ACTION_REGISTRY = {
  MOVE_PLAYER: {} as { fromTile: number; toTile: number; tokenId: string },
  PLAY_SOUND: {} as { soundId: string; volume?: number },
  UPDATE_UI_COUNTER: {} as { counterId: string; value: number },
  ROLL_DICE: {} as { die1: number, die2: number },
} as const;

export type ActionRegistry = typeof ACTION_REGISTRY;
export type ActionType = keyof ActionRegistry;
export type ActionData<T extends ActionType> = {
  type: T;
  payload: ActionRegistry[T];
};
