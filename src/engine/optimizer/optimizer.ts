import { ITEM_DATA_VERSION } from "../../data/items";
import type { BuildEvaluation, OptimizationResult, OptimizeBuildConfig, RankedBuild } from "../../types/optimizer";
import { generateItemCombinations } from "./combinatorics";
import { evaluateSmolderBuild } from "./evaluator";

type ScoredBuild = BuildEvaluation & { readonly score: number };

function compareBuilds(first: ScoredBuild, second: ScoredBuild): number {
  const difference = second.score - first.score || first.goldCost - second.goldCost;
  if (difference !== 0) return difference;
  const firstKey = first.items.join(",");
  const secondKey = second.items.join(",");
  return firstKey < secondKey ? -1 : firstKey > secondKey ? 1 : 0;
}

/** Exhaustive optimum over the supported catalog, with only five results kept. */
export function optimizeBuild(config: OptimizeBuildConfig): OptimizationResult {
  if (config.champion !== "smolder") throw new RangeError("Only Smolder is supported.");
  if (config.metric !== "BURST_Q" && config.metric !== "DPS") throw new RangeError("Unknown optimization metric.");
  // Validate combat inputs even when constraints leave no feasible build.
  evaluateSmolderBuild({ ...config, items: [] });
  const itemCount = config.itemCount ?? 6;
  const combinations = generateItemCombinations({
    itemCount, itemPool: config.itemPool, requiredItems: config.requiredItems,
    maxGold: config.maxGold, bonusCriticalStrikeChance: config.bonusStats?.criticalStrikeChance,
  });
  const best: ScoredBuild[] = [];
  let evaluatedCount = 0;
  for (const items of combinations) {
    const evaluation = evaluateSmolderBuild({ ...config, items });
    const score = config.metric === "BURST_Q" ? evaluation.burstQ : evaluation.estimatedDps;
    best.push({ ...evaluation, score });
    best.sort(compareBuilds);
    if (best.length > 5) best.pop();
    evaluatedCount += 1;
  }
  const topBuilds: RankedBuild[] = best.map((build, index) => ({ ...build, rank: index + 1 }));
  return { champion: "smolder", patch: ITEM_DATA_VERSION.patch, metric: config.metric, itemCount, evaluatedCount, topBuilds };
}
