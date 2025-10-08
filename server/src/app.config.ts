import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import cors from "cors";
import express from "express";

import { GameRoom } from "./rooms/GameRoom";
import { createMatchmakingRouter } from "./routes/matchmakingRoutes";
import { logger } from "./utils/logger";
import { ROOM_TYPE } from "./constants";

export default config({
  initializeGameServer: (gameServer) => {
    gameServer.define(ROOM_TYPE, GameRoom);
  },

  initializeExpress: (app) => {
    app.use(cors());
    app.use(express.json());

    app.use("/matchmaking", createMatchmakingRouter());

    if (process.env.NODE_ENV !== "production") {
      app.use("/", playground());
    }

    app.use("/monitor", monitor());

    app.get("/health", (_req, res) => {
      res.json({ status: "ok" });
    });
  },

  beforeListen: () => {
    logger.info("color-wars server listening", { port: process.env.PORT ?? 2567 });
  }
});
