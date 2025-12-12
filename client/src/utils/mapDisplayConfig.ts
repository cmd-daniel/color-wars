export interface MapDisplayConfig {
  showTerritoryLabels: boolean;
}

export const DEFAULT_MAP_DISPLAY_CONFIG: MapDisplayConfig = {
  showTerritoryLabels: true,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const resolveMapDisplayConfig = (
  metadata: Record<string, unknown> | undefined | null,
): MapDisplayConfig => {
  const resolved: MapDisplayConfig = { ...DEFAULT_MAP_DISPLAY_CONFIG };
  if (!isRecord(metadata)) {
    return resolved;
  }

  const displayConfig = metadata["display"];
  if (isRecord(displayConfig)) {
    const showTerritoryLabels = displayConfig["showTerritoryLabels"];
    if (typeof showTerritoryLabels === "boolean") {
      resolved.showTerritoryLabels = showTerritoryLabels;
      return resolved;
    }
  }

  const showTerritoryLabels = metadata["showTerritoryLabels"];
  if (typeof showTerritoryLabels === "boolean") {
    resolved.showTerritoryLabels = showTerritoryLabels;
  }

  return resolved;
};
