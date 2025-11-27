import winston from "winston";
import { env } from "../config/env";

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

const consoleFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const suffix = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `[${ts}] ${level}: ${message}${suffix}`;
});

export const logger = winston.createLogger({
  level: env.logLevel,
  format: combine(timestamp(), errors({ stack: true }), json()),
  defaultMeta: { service: "color-wars-server" },
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), consoleFormat)
    })
  ]
});

export type AnalyticsEvent =
  | "room_created"
  | "room_disposed"
  | "player_joined"
  | "player_left"
  | "spectator_joined"
  | "spectator_left"
  | "leader_assigned"
  | "leader_reassigned"
  | "player_icon_set"
  | "player_color_set"
  | "room_settings_updated"
  | "player_kicked"
  | "game_started"
  | "game_finished";

export const logAnalyticsEvent = (event: AnalyticsEvent, payload: Record<string, unknown> = {}) => {
  logger.info(event, payload);
};
