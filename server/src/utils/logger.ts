import winston from "winston";

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

const consoleFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const suffix = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `[${ts}] ${level}: ${message}${suffix}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
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
  | "game_started"
  | "game_finished";

export const logAnalyticsEvent = (event: AnalyticsEvent, payload: Record<string, unknown> = {}) => {
  logger.info(event, payload);
};
