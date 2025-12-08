import { Router } from "express";
import { RoomManager } from "../matchmaking/RoomManager";
import { logger } from "../utils/logger";

export function createMatchmakingRouter() {
  const router = Router();

  router.post("/quick", async (req, res) => {
    try {
      const { playerName, preferences } = req.body ?? {};
      const reservation = await RoomManager.quickMatch({ playerName }, preferences ?? undefined);
      res.json(formatReservationResponse(reservation));
    } catch (error) {
        res.status(500).json({ error: "Unable to find a room" });
    }
  });

  router.post("/private", async (req, res) => {
    try {
      const { playerName, maxPlayers, minPlayers } = req.body ?? {};
      const { joinCode, reservation } = await RoomManager.createPrivateRoom({ playerName, maxPlayers, minPlayers });
      res.json({ joinCode, reservation: formatReservationResponse(reservation) });
    } catch (error) {
      logger.error("private_room_create_failed", { message: (error as Error).message });
      res.status(500).json({ error: "Unable to create private room" });
    }
  });

  router.post("/private/join", async (req, res) => {
    const { joinCode, playerName } = req.body ?? {};

    if (!joinCode) {
      res.status(400).json({ error: "joinCode is required" });
      return;
    }

    try {
      const reservation = await RoomManager.joinPrivateRoom(joinCode, { playerName });
      res.json(formatReservationResponse(reservation));
    } catch (error) {
      logger.warn("private_room_join_failed", { message: (error as Error).message, joinCode });
      res.status(404).json({ error: "Room not found" });
    }
  });

  router.get("/room/:roomId/info", async (req, res) => {
    const { roomId } = req.params;

    if (!roomId) {
      res.status(400).json({ error: "roomId is required" });
      return;
    }

    try {
      const roomInfo = await RoomManager.getRoomInfo(roomId);
      res.json(roomInfo);
    } catch (error) {
      logger.warn("room_info_failed", { message: (error as Error).message, roomId });
      res.status(404).json({ error: "Room not found" });
    }
  });

  router.post("/room/:roomId/join", async (req, res) => {
    const { roomId } = req.params;
    const { playerName, joinCode } = req.body ?? {};

    if (!roomId) {
      res.status(400).json({ error: "roomId is required" });
      return;
    }

    try {
      const result = await RoomManager.joinRoomById(roomId, { playerName, joinCode });

      if (result.isSpectator) {
        res.json({ isSpectator: true, roomId });
      } else {
        if (result.reservation) {
          res.json({ isSpectator: false, reservation: formatReservationResponse(result.reservation) });
        } else {
          res.status(500).json({ error: "Reservation not found" });
        }
      }
    } catch (error) {
      logger.warn("room_join_by_id_failed", { message: (error as Error).message, roomId });
      const message = (error as Error).message;

      if (message.includes("not found") || message.includes("does not exist")) {
        res.status(404).json({ error: "Room not found" });
      } else if (message.includes("full")) {
        res.status(400).json({ error: "Room is full" });
      } else if (message.includes("private") || message.includes("join code")) {
        res.status(403).json({ error: "Invalid join code for private room" });
      } else {
        res.status(500).json({ error: "Unable to join room" });
      }
    }
  });

  return router;
}

function formatReservationResponse(reservation: Awaited<ReturnType<typeof RoomManager.quickMatch>>) {
  return {
    sessionId: reservation.sessionId,
    reservationId: (reservation as any).reservationId,
    protocol: (reservation as any).protocol,
    reconnectionToken: (reservation as any).reconnectionToken,
    devMode: reservation.devMode,
    room: {
      roomId: reservation.room.roomId,
      processId: reservation.room.processId,
      name: reservation.room.name,
      clients: reservation.room.clients,
      maxClients: reservation.room.maxClients,
      locked: reservation.room.locked,
      private: reservation.room.private,
      publicAddress: reservation.room.publicAddress,
      unlisted: reservation.room.unlisted,
      metadata: reservation.room.metadata
    }
  };
}
