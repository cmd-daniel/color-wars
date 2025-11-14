import { matchMaker } from "colyseus";
import { nanoid } from "nanoid";
import type { GameRoom } from "../rooms/GameRoom";
import { DEFAULT_MAX_PLAYERS, DEFAULT_MIN_PLAYERS, ROOM_TYPE } from "../constants";
import { logger } from "../utils/logger";

export interface QuickMatchOptions {
  playerName?: string;
}

export interface RoomPreferences {
  maxPlayers?: number;
  minPlayers?: number;
}

export interface PrivateRoomCreation {
  playerName?: string;
  maxPlayers?: number;
  minPlayers?: number;
}

export interface PrivateRoomJoin {
  playerName?: string;
}

interface RoomRecord {
  room: GameRoom;
  isPrivate: boolean;
  isPublic: boolean;
  joinCode: string | null;
  phase: string;
}

const JOIN_CODE_LENGTH = 6;

type SeatReservationResult = Awaited<ReturnType<typeof matchMaker.joinOrCreate>>;

export class RoomManager {
  private static rooms: Map<string, RoomRecord> = new Map();
  private static joinCodes: Map<string, string> = new Map();

  static registerRoom(room: GameRoom) {
    const isPrivate = room.getIsPrivate();
    const isPublic = room.getIsPublic();
    const joinCode = room.getJoinCode() || null;
    this.rooms.set(room.roomId, {
      room,
      isPrivate,
      isPublic,
      joinCode,
      phase: room.getPhase()
    });

    if (joinCode) {
      this.joinCodes.set(joinCode, room.roomId);
    }
  }

  static unregisterRoom(room: GameRoom) {
    this.rooms.delete(room.roomId);

    const joinCode = room.getJoinCode();
    if (joinCode) {
      this.joinCodes.delete(joinCode);
    }
  }

  static updateRoomPhase(room: GameRoom) {
    const record = this.rooms.get(room.roomId);
    if (record) {
      record.phase = room.getPhase();
      record.isPublic = room.getIsPublic();
    }
  }

  static async quickMatch(options: QuickMatchOptions = {}, preferences: RoomPreferences = {}): Promise<SeatReservationResult> {
    const availableRoom = this.findJoinablePublicRoom();

    if (availableRoom) {
      return matchMaker.joinById(availableRoom.roomId, { ...options, joinIntent: "quick" });
    }

    const listings = await matchMaker.query({
      name: ROOM_TYPE,
      metadata: { isPublic: true, phase: "lobby" }
    });

    if (listings.length > 0) {
      return matchMaker.joinById(listings[0].roomId, { ...options, joinIntent: "quick" });
    }

    const maxPlayers = preferences.maxPlayers ?? DEFAULT_MAX_PLAYERS;
    const minPlayers = preferences.minPlayers ?? DEFAULT_MIN_PLAYERS;

    const createdRoom = await matchMaker.createRoom(ROOM_TYPE, {
      isPrivate: false,
      maxPlayers,
      minPlayers,
      joinCode: null
    });

    return matchMaker.joinById(createdRoom.roomId, { ...options, joinIntent: "quick" });
  }

  static async createPrivateRoom(options: PrivateRoomCreation = {}): Promise<{ joinCode: string; reservation: SeatReservationResult }> {
    const joinCode = this.generateJoinCode();
    const maxPlayers = options.maxPlayers ?? DEFAULT_MAX_PLAYERS;
    const minPlayers = options.minPlayers ?? DEFAULT_MIN_PLAYERS;

    const createdRoom = await matchMaker.createRoom(ROOM_TYPE, {
      isPrivate: true,
      joinCode,
      maxPlayers,
      minPlayers
    });

    this.joinCodes.set(joinCode, createdRoom.roomId);

    const reservation = await matchMaker.joinById(createdRoom.roomId, {
      playerName: options.playerName,
      joinIntent: "private-create"
    });

    return { joinCode, reservation };
  }

  static async joinPrivateRoom(joinCode: string, options: PrivateRoomJoin = {}): Promise<SeatReservationResult> {
    const roomId = this.joinCodes.get(joinCode);

    if (!roomId) {
      const listings = await matchMaker.query({ name: ROOM_TYPE, metadata: { joinCode } });
      if (listings.length === 0) {
        throw new Error("Room not found or already closed");
      }
      logger.debug("Refreshing joinCode cache", { joinCode });
      this.joinCodes.set(joinCode, listings[0].roomId);
      return matchMaker.joinById(listings[0].roomId, {
        playerName: options.playerName,
        joinIntent: "private-join"
      });
    }

    return matchMaker.joinById(roomId, {
      playerName: options.playerName,
      joinIntent: "private-join"
    });
  }

  static async getRoomInfo(roomId: string): Promise<{
    roomId: string;
    phase: string;
    isPrivate: boolean;
    connectedPlayers: number;
    maxPlayers: number;
    isJoinable: boolean;
  }> {
    const record = this.rooms.get(roomId);

    if (!record) {
      // Try to query matchmaker for the room
      const listings = await matchMaker.query({ name: ROOM_TYPE });
      const listing = listings.find(l => l.roomId === roomId);
      
      if (!listing) {
        throw new Error("Room does not exist");
      }

      return {
        roomId: listing.roomId,
        phase: (listing.metadata as any).phase || "unknown",
        isPrivate: (listing.metadata as any).isPrivate || false,
        connectedPlayers: listing.clients,
        maxPlayers: listing.maxClients,
        isJoinable: listing.clients < listing.maxClients && !listing.locked
      };
    }

    const { room, phase, isPrivate } = record;

    return {
      roomId: room.roomId,
      phase,
      isPrivate,
      connectedPlayers: room.clients.length,
      maxPlayers: room.maxClients,
      isJoinable: room.clients.length < room.maxClients && !room.locked && phase === "waiting"
    };
  }

  static async joinRoomById(
    roomId: string,
    options: { playerName?: string; joinCode?: string } = {}
  ): Promise<{ isSpectator: boolean; reservation?: SeatReservationResult }> {
    const record = this.rooms.get(roomId);

    if (!record) {
      // Try to query matchmaker for the room
      const listings = await matchMaker.query({ name: ROOM_TYPE });
      const listing = listings.find(l => l.roomId === roomId);
      
      if (!listing) {
        throw new Error("Room does not exist");
      }

      // Room exists but not in our local registry - try to join
      const metadata = listing.metadata as any;
      
      // Check if private and requires join code
      if (metadata.isPrivate && metadata.joinCode) {
        if (!options.joinCode || options.joinCode !== metadata.joinCode) {
          throw new Error("Invalid join code for private room");
        }
      }

      // If room is full or in active/finished state, join as spectator
      if (listing.clients >= listing.maxClients || metadata.phase === "active" || metadata.phase === "finished") {
        logger.info("Joining as spectator", { roomId, phase: metadata.phase, clients: listing.clients });
        return { isSpectator: true };
      }

      // Join as player
      const reservation = await matchMaker.joinById(roomId, {
        playerName: options.playerName,
        joinIntent: "direct-join"
      });

      return { isSpectator: false, reservation };
    }

    const { room, phase, isPrivate, joinCode } = record;

    // Check if private and requires join code
    if (isPrivate && joinCode) {
      if (!options.joinCode || options.joinCode !== joinCode) {
        throw new Error("Invalid join code for private room");
      }
    }

    // If game is finished, always spectate
    if (phase === "finished") {
      logger.info("Room is finished, joining as spectator", { roomId });
      return { isSpectator: true };
    }

    // If game is active or room is full, join as spectator
    if (phase === "active" || room.clients.length >= room.maxClients) {
      logger.info("Room is active or full, joining as spectator", { roomId, phase, clients: room.clients.length });
      return { isSpectator: true };
    }

    // Join as player for waiting/lobby phases
    const reservation = await matchMaker.joinById(roomId, {
      playerName: options.playerName,
      joinIntent: "direct-join"
    });

    return { isSpectator: false, reservation };
  }

  private static findJoinablePublicRoom(): GameRoom | undefined {
    for (const record of this.rooms.values()) {
      if (!record.isPublic) {
        continue;
      }

      if (record.phase !== "lobby") {
        continue;
      }

      const { room } = record;
      if (room.clients.length < room.maxClients && !room.locked) {
        return room;
      }
    }

    return undefined;
  }

  private static generateJoinCode(): string {
    let code: string;

    do {
      code = nanoid(JOIN_CODE_LENGTH).toUpperCase();
    } while (this.joinCodes.has(code));

    return code;
  }
}
