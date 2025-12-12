import type { MapDefinition } from "@/types/map";

export const fetchMapDefinition = async (path: string): Promise<MapDefinition> => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load map definition: ${response.status}`);
  }
  const data = (await response.json()) as MapDefinition;

  return data;
};
