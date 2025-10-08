import type { MapDefinition, TerritoryDefinition } from '@/types/map'

export const fetchMapDefinition = async (path: string): Promise<MapDefinition> => {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Failed to load map definition: ${response.status}`)
  }
  const data = (await response.json()) as MapDefinition

  if (!Array.isArray(data.territories) && Array.isArray((data as any).states)) {
    // Legacy support for "states"
    const territories = (data as any).states as TerritoryDefinition[]
    return {
      ...data,
      territories,
    }
  }

  return data
}
