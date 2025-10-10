import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import cors from "cors";
import express from "express";
import path from "path";
import { existsSync } from "fs";

import { GameRoom } from "./rooms/GameRoom";
import { createMatchmakingRouter } from "./routes/matchmakingRoutes";
import { logger } from "./utils/logger";
import { ROOM_TYPE } from "./constants";
import { env } from "./config/env";

const registerClientBuild = (app: express.Express) => {
  const buildDir = env.clientBuildPath;
  const indexFile = path.join(buildDir, "index.html");

  if (!existsSync(buildDir) || !existsSync(indexFile)) {
    logger.warn("client_build_unavailable", { buildDir, indexFile });
    return;
  }

  app.use(express.static(buildDir, { index: false }));

  app.get("*", (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    const disallowedPrefixes = ["/matchmaking", "/monitor", "/health"];
    if (disallowedPrefixes.some((prefix) => req.path.startsWith(prefix))) {
      return next();
    }

    res.sendFile(indexFile, (error) => {
      if (error) {
        next(error);
      }
    });
  });

  logger.info("serving_client_build", { buildDir });
};

export default config({
  initializeGameServer: (gameServer) => {
    gameServer.define(ROOM_TYPE, GameRoom);
  },

  initializeExpress: (app) => {
    app.use(cors());
    app.use(express.json());

    app.use("/matchmaking", createMatchmakingRouter());

    if (env.nodeEnv !== "production") {
      app.use("/playground", playground());
    }

    app.use("/monitor", monitor());

    app.get("/health", (_req, res) => {
      res.json({ status: "ok" });
    });

    if (env.nodeEnv === "production") {
      registerClientBuild(app);
    }
  },

  beforeListen: () => {
    logger.info("color-wars server listening", { port: env.port });
  }
});
