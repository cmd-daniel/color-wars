import { ActionContext, ClientActionType } from "../protocol";
import type { PlainStateOf, RoomState } from "../types/RoomState";
import * as rules from "./rules";

type Rule<K extends ClientActionType> = (
  state: PlainStateOf<RoomState>,
  ctx: ActionContext<K>,
) => void;

const ACTION_RULES: {
  [K in ClientActionType]: Array<Rule<K>>;
} = {
  PURCHASE_TERRITORY: [
    rules.requirePlayerExists,
    rules.requirePlayersTurn,
    rules.requireEnoughMoney,
  ],

  ROLL_DICE: [
    rules.requirePlayerExists,
    rules.requirePlayersTurn,
    rules.requireHasNotRolledDice,
  ],

  PONG: [],

  START_GAME: [rules.requireLeader],
  ACCELERATE_DICE: [],
  RAGDOLL_DICE: [],
  KICK_PLAYER: [rules.requireLeader, rules.requireLobbyPhase],
  SEND_MESSAGE: [rules.requirePlayerExists, rules.requireNonEmptyMessage],

  END_TURN: [
    rules.requirePlayerExists,
    rules.requirePlayersTurn,
    rules.requireHasRolledDice,
  ],
};

export function validateOrThrow<K extends ClientActionType>(
  action: K,
  plain: PlainStateOf<RoomState>,
  ctx: ActionContext<K>,
) {
  const rules = ACTION_RULES[action];

  rules.forEach((rule) => rule(plain, ctx));
}

export function validateSafely<K extends ClientActionType>(
  action: K,
  plain: PlainStateOf<RoomState>,
  ctx: ActionContext<K>,
) {
  try {
    validateOrThrow(action, plain, ctx);
    return { ok: true as const };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false as const, error: message };
  }
}
