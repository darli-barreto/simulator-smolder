import type { DamageBreakdown, DummyTarget } from "./engine";
import type { ItemId, ItemStats } from "./items";
import type { SmolderCombatStats, SmolderSimulationConfig } from "./smolder";

export type OptimizationMetric = "BURST_Q" | "DPS";

/** A stationary benchmark, independent of current health and executions. */
export interface BenchmarkTarget extends DummyTarget {
  readonly bonusHealth?: number;
}

export interface DpsOptions {
  /** Fraction of available attack time spent attacking; defaults to 1. */
  readonly autoAttackUptime?: number;
  /** Defaults to true; initial Spellblade cooldown only affects burst. */
  readonly spellbladeEnabled?: boolean;
  /** Measured/configured recharge cadence. Omitted: no repeated Energized proc. */
  readonly energizedProcIntervalSeconds?: number;
}

export interface BuildEvaluationConfig {
  readonly level: number;
  readonly stacks: number;
  readonly items: readonly ItemId[];
  readonly targetDummy: BenchmarkTarget;
  readonly qRank?: number;
  readonly bonusStats?: ItemStats;
  readonly mitigation?: SmolderSimulationConfig["mitigation"];
  readonly itemState?: SmolderSimulationConfig["itemState"];
  readonly dpsOptions?: DpsOptions;
}

/** Each damage breakdown is expressed in health points per second. */
export interface DpsBreakdown {
  readonly q: DamageBreakdown;
  readonly burn: DamageBreakdown;
  readonly autoAttacks: DamageBreakdown;
  readonly itemProcs: DamageBreakdown;
  readonly total: DamageBreakdown;
}

export interface BuildEvaluation {
  readonly items: readonly ItemId[];
  readonly goldCost: number;
  readonly stats: SmolderCombatStats;
  readonly burstDamage: DamageBreakdown;
  readonly burstQ: number;
  readonly estimatedDps: number;
  readonly dps: DpsBreakdown;
  readonly qCooldownSeconds: number;
  readonly qCastTimeSeconds: number;
  readonly qCastsPerSecond: number;
  readonly autoAttacksPerSecond: number;
  readonly autoAttackDamage: DamageBreakdown;
  readonly spellbladeProcsPerSecond: number;
  readonly energizedProcsPerSecond: number;
}

export interface BuildCombinationConfig {
  readonly itemCount: number;
  readonly itemPool?: readonly ItemId[];
  readonly requiredItems?: readonly ItemId[];
  readonly maxGold?: number;
  readonly bonusCriticalStrikeChance?: number;
}

export interface OptimizeBuildConfig extends Omit<BuildEvaluationConfig, "items"> {
  readonly champion: "smolder";
  readonly metric: OptimizationMetric;
  /** Defaults to six total inventory slots, including boots. */
  readonly itemCount?: number;
  readonly itemPool?: readonly ItemId[];
  readonly requiredItems?: readonly ItemId[];
  readonly maxGold?: number;
}

export interface RankedBuild extends BuildEvaluation {
  readonly rank: number;
  readonly score: number;
}

export interface OptimizationResult {
  readonly champion: "smolder";
  readonly patch: "26.20";
  readonly metric: OptimizationMetric;
  readonly itemCount: number;
  readonly evaluatedCount: number;
  readonly topBuilds: readonly RankedBuild[];
}
