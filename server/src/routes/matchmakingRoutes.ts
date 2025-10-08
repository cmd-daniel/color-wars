import { Router } from "express";
import { RoomManager } from "../matchmaking/RoomManager";
import { logger } from "../utils/logger";

export function createMatchmakingRouter() {
  const router = Router();

  router.post("/quick", async (req, res) => {
    try {
      const { playerName, preferences } = req.body ?? {};
      const normalizedPreferences = typeof preferences === "object" && preferences !== null ? preferences : undefined;
      const reservation = await RoomManager.quickMatch({ playerName }, normalizedPreferences);
      res.json(formatReservationResponse(reservation));
    } catch (error) {
      logger.error("quick_match_failed", { message: (error as Error).message });
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

  return router;
}

function formatReservationResponse(reservation: Awaited<ReturnType<typeof RoomManager.quickMatch>>) {
  return {
    sessionId: reservation.sessionId,
    roomId: reservation.room.roomId,
    processId: reservation.room.processId,
    roomName: reservation.room.name,
    metadata: reservation.room.metadata
  };
}
