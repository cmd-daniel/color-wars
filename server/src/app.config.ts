import config from "@colyseus/tools";
import { monitor } from "@colyseus/monitor";
import cors from "cors";
import express from "express";
import path from "path";
import { existsSync } from "fs";

import { GameRoom } from "./rooms/GameRoom";
import { createMatchmakingRouter } from "./routes/matchmakingRoutes";
import { logger } from "./utils/logger";
import { DEFAULT } from "./constants";
import { env } from "./config/env";

const registerClientBuild = (app: express.Express) => {
  const buildDir = env.clientBuildPath;
  const indexFile = path.join(buildDir, "index.html");

  if (!existsSync(buildDir) || !existsSync(indexFile)) {
    logger.warn("client_build_unavailable", { buildDir, indexFile });
    return;
  }

  app.use(express.static(buildDir, { index: false }));

  // Handle client-side routing - serve index.html for all non-API routes
  app.get("*", (req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    // Don't intercept API routes
    const disallowedPrefixes = ["/matchmaking", "/monitor", "/health", "/api"];
    if (disallowedPrefixes.some((prefix) => req.path.startsWith(prefix))) {
      return next();
    }

    // Serve index.html for all client routes (including /room/:roomId)
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
    gameServer
      .define(DEFAULT.ROOM_TYPE, GameRoom)
      .enableRealtimeListing()
  },

  initializeExpress: (app) => {
    // Handle OPTIONS requests globally - must be before CORS middleware
    app.options("*", (req, res) => {
      const origin = req.headers.origin;
      logger.info("global_options_request", { 
        path: req.path, 
        origin: origin,
        method: req.method,
        accessControlRequestMethod: req.headers['access-control-request-method'],
        accessControlRequestHeaders: req.headers['access-control-request-headers']
      });
      
      // Set CORS headers
      if (origin) {
        res.header("Access-Control-Allow-Origin", origin);
      } else {
        res.header("Access-Control-Allow-Origin", "*");
      }
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.header("Access-Control-Allow-Headers", req.headers['access-control-request-headers'] || "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Max-Age", "86400"); // 24 hours
      
      res.status(204).end();
      logger.info("global_options_response_sent", { path: req.path });
    });

    // Configure CORS with explicit options
    app.use(cors({
      origin: true, // Allow all origins
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      preflightContinue: false, // Don't continue to next middleware after handling preflight
    }));
    app.use(express.json());

    app.use("/matchmaking", createMatchmakingRouter());

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
