import path from "path";

const DEFAULT_PORT = 2567;
const DEFAULT_CLIENT_BUILD_PATH = path.resolve(process.cwd(), "../client/dist");

const parsePort = (value: string | undefined) => {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PORT;
  }

  return parsed;
};

const normalizeOptional = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};

const resolveOptionalPath = (value: string | undefined) => {
  const normalized = normalizeOptional(value);
  if (!normalized) {
    return undefined;
  }

  return path.isAbsolute(normalized) ? normalized : path.resolve(process.cwd(), normalized);
};

const resolveClientBuildPath = (value: string | undefined) =>
  resolveOptionalPath(value) ?? DEFAULT_CLIENT_BUILD_PATH;

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  logLevel: process.env.LOG_LEVEL ?? "info",
  mapDefinitionPath: resolveOptionalPath(process.env.MAP_DEFINITION_PATH),
  clientBuildPath: resolveClientBuildPath(process.env.CLIENT_BUILD_PATH)
};

export type Env = typeof env;
