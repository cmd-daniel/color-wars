export interface ClientMessages {
  PURCHASE_TERRITORY: { territoryId: string; price: number };
  ROLL_DICE: {}; // Empty payload
  PONG: { serverT1: number; clientT2: number };
  START_GAME: {};
  ACCELERATE_DICE: {};
  RAGDOLL_DICE: {};
  KICK_PLAYER: {playerId: string, reason?: string}
  SEND_MESSAGE: {senderId: string, content: string, timeStamp: number}
}

export interface ServerMessages {
  PING: { serverT1: number };
  PING_PONG: { serverT1: number; clientT2: number; serverT3: number };
  ACCELERATE_DICE: {};
  RAGDOLL_DICE: {};
  RELAY_MESSAGE: {senderId: string, content: string, timeStamp: number}
}

// Helper Types
//export type ClientActionType = keyof ClientMessages;
export type ClientActionType = Extract<keyof ClientMessages, string>;
export type ServerActionType = Extract<keyof ServerMessages, string>;

// Context includes the payload + the player who sent it
export type ActionContext<K extends ClientActionType> = ClientMessages[K] & {
  senderId: string;
};

export type PlayerJoinPayload = { playerName: string };
