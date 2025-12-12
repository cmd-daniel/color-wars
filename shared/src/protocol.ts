export interface ClientMessages {
  PURCHASE_TERRITORY: { territoryId: string; price: number };
  ROLL_DICE: {}; // Empty payload
  CHAT: { message: string };
  PONG: { serverT1: number; clientT2: number };
  START_GAME: {};
  ACCELERATE_DICE: {};
  RAGDOLL_DICE: {};
}

export interface ServerMessages {
  PING: { serverT1: number };
  PING_PONG: { serverT1: number; clientT2: number; serverT3: number };
  ACCELERATE_DICE: {};
  RAGDOLL_DICE: {};
}

// Helper Types
//export type ClientActionType = keyof ClientMessages;
export type ClientActionType = Extract<keyof ClientMessages, string>;
export type ServerActionType = Extract<keyof ServerMessages, string>;

// Context includes the payload + the player who sent it
export type ActionContext<K extends ClientActionType> = ClientMessages[K] & {
  playerId: string;
};

export type PlayerJoinPayload = { playerName: string };
