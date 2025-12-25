// server/services/RewardService.ts
import { RewardID } from "@color-wars/shared/src/types/effectId";
import { type Tier, TIER_WEIGHTS } from "@color-wars/shared/src/types/tier";

interface DrawOptions {
  count?: number;
  allowDuplicates?: boolean;
}
export class RewardService {
  // Grouped by tier for O(1) reward access
  private static readonly REWARD_POOL: Record<Tier, RewardID[]> = {
    common: ["GET_500_CASH"],
    uncommon: ["GET_2000_CASH"],
    rare: ["GET_KILL_CARD"],
    epic: ["GET_SHIELD_CARD"],
    legendary: [],
  };

  static generateOptions({ count = 3, allowDuplicates = false }: DrawOptions = {}): RewardID[] {
    const results: RewardID[] = [];

    // Create a local copy ONLY if we need to ensure uniqueness
    const workingPool: Record<Tier, RewardID[]> = allowDuplicates ? this.REWARD_POOL : JSON.parse(JSON.stringify(this.REWARD_POOL)); // Deep clone to avoid mutating the master pool

    for (let i = 0; i < count; i++) {
      const selectedTier = this.pickTierWeighted(workingPool);
      if (!selectedTier) break;

      const tierArray = workingPool[selectedTier];
      const randomIndex = Math.floor(Math.random() * tierArray.length);

      if (allowDuplicates) {
        // Just pick, don't remove
        results.push(tierArray[randomIndex]);
      } else {
        // Pick and remove (ensure uniqueness)
        const [rewardId] = tierArray.splice(randomIndex, 1);
        results.push(rewardId);
      }
    }

    return results;
  }

  /**
   * Selects a tier based on weights, but only considers tiers
   * that still have rewards available.
   */
  private static pickTierWeighted(currentPool: Record<Tier, RewardID[]>): Tier | null {
    // 1. Filter out tiers that are empty
    const availableTiers = (Object.keys(currentPool) as Tier[]).filter((t) => currentPool[t].length > 0);

    if (availableTiers.length === 0) return null;

    // 2. Calculate total weight of only available tiers
    const totalWeight = availableTiers.reduce((sum, t) => sum + TIER_WEIGHTS[t], 0);

    let random = Math.random() * totalWeight;

    // 3. Pick the tier
    for (const tier of availableTiers) {
      random -= TIER_WEIGHTS[tier];
      if (random <= 0) return tier;
    }

    return availableTiers[0];
  }
}
