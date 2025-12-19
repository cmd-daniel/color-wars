import type { Message, PlainStateOf, RoomState } from "../types/RoomState";

// 1. Define the Shapes (The requirements)
// Every action context in your app seems to have a playerId
interface WithPlayer {
  senderId: string;
}
interface WithPrice extends WithPlayer {
  price: number;
}


// 2. The Rules
// notice we don't reference specific Actions here, just data shapes.

export const requirePlayerExists = (s: PlainStateOf<RoomState>, c: WithPlayer) => {
  if (!s.game.players || !s.game.players[c.senderId]) {
    throw new Error("Player does not exist");
  }
};

export const requirePlayersTurn = (s: PlainStateOf<RoomState>, c: WithPlayer) => {
  if (s.game.activePlayerId !== c.senderId) {
    throw new Error("Not your turn");
  }
};

export const requireEnoughMoney = (s: PlainStateOf<RoomState>, c: WithPrice) => {
  const player = s.game.players[c.senderId];
  if (!player || player.money < c.price) {
    throw new Error("Not Enough Money");
  }
};

export const requireNonEmptyMessage = (s: PlainStateOf<RoomState>, c: Message) => {
  if (c.content.trim().length === 0) {
    throw new Error("Message is Empty");
  }
};

export const requireLeader = (s: PlainStateOf<RoomState>, c: WithPlayer) => {
  if (s.room.leaderId != c.senderId) {
    throw new Error("You are not the leader");
  }
};

export const requireLobbyPhase = (s: PlainStateOf<RoomState>) => {
  if(s.room.phase !== 'lobby'){
    throw new Error('Room is not in Lobby Phase')
  }
}

export const requireHasRolledDice = (s: PlainStateOf<RoomState>, c: WithPlayer) => {
  const player = s.game.players[c.senderId];
  if (!player || !player.hasRolled) {
    throw new Error("Player has not rolled dice yet");
  }
};

export const requireHasNotRolledDice = (s: PlainStateOf<RoomState>, c: WithPlayer) => {
  const player = s.game.players[c.senderId];
  if (!player || player.hasRolled) {
    throw new Error("Player has already rolled dice this turn");
  }
};
