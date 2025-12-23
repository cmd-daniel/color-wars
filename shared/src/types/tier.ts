export type Tier = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const TIER_WEIGHTS: Record<Tier, number> = {
  common: 100,
  uncommon: 50,
  rare: 20,
  epic: 10,
  legendary: 2,
};