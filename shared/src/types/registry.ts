export const ACTION_REGISTRY = {
	ANIMATE_HEX_HOP: {} as { targetId: string; q: number; r: number },
	PLAY_SOUND: {} as { soundId: string; volume?: number },
	UPDATE_UI_COUNTER: {} as { counterId: string; value: number },
  } as const;

export type ActionRegistry = typeof ACTION_REGISTRY;
export type ActionType = keyof ActionRegistry;
export type ActionData<T extends ActionType> = {
  type: T;
  payload: ActionRegistry[T];
};
