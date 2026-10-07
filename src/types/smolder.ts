import type { ChampionStats, DamageBreakdown, DummyTarget, MitigationProfile } from "./engine";
import type { ItemId, ItemStats } from "./items";

export interface SmolderCombatStats extends ChampionStats {
  readonly baseAttackDamage: number;
  readonly bonusAttackDamage: number;
  readonly abilityPower: number;
  readonly abilityHaste: number;
  readonly criticalStrikeChance: number;
  readonly criticalStrikeMultiplier: number;
  readonly armorPenetration: number;
  readonly lethality: number;
}

export type SmolderCast =
  | { readonly ability: "Q"; readonly rank: number; readonly hit?: "primary" | "splash" | "secondary" }
  | { readonly ability: "W"; readonly rank: number; readonly globHit?: boolean; readonly explosions?: number }
  | { readonly ability: "E"; readonly rank: number; readonly boltsHit?: number }
  | { readonly ability: "R"; readonly rank: number; readonly center?: boolean };

export type SmolderDamageSource = "Q_HIT" | "Q_BURN" | "W_GLOB" | "W_EXPLOSION" | "E_BOLT" | "R_HIT";

/** One hit, or the complete three-second Q burn. These are not timeline ticks. */
export interface RawDamageInstance {
  readonly source: SmolderDamageSource;
  readonly rawDamage: DamageBreakdown;
  readonly appliesOnHit: boolean;
  readonly appliesBurn: boolean;
}

export interface SmolderAbilityResult {
  readonly ability: SmolderCast["ability"];
  readonly instances: readonly RawDamageInstance[];
  readonly cooldownSeconds: number;
  readonly selfHealing: number;
  readonly qTier: 0 | 1 | 2 | 3;
  /** Tooltip scaling expression; geometry and projectile rounding are not simulated. */
  readonly secondaryProjectileCountFormula: number;
  readonly availableEBolts: number;
}

export interface SimulationTarget extends DummyTarget {
  readonly currentHealth?: number;
  /** Needed for LDR; maximum health alone cannot determine bonus health. */
  readonly bonusHealth?: number;
  readonly canBeExecuted?: boolean;
  /** Allows W/E/R to check the execute on a target already burning from Q. */
  readonly smolderBurnActive?: boolean;
}

export interface SmolderSimulationConfig {
  readonly level: number;
  readonly stacks: number;
  /** Up to six inventory slots; null represents an empty slot. */
  readonly items: readonly (ItemId | null)[];
  readonly target: SimulationTarget;
  /** Defaults to a primary Q at its maximum legal rank for this level. */
  readonly cast?: SmolderCast;
  readonly bonusStats?: ItemStats;
  readonly mitigation?: {
    readonly armor?: MitigationProfile;
    readonly magicResistance?: MitigationProfile;
  };
  readonly itemState?: {
    /** Defaults to true: the Q cast arms an available Spellblade. */
    readonly spellbladeReady?: boolean;
    /** Defaults to false: no Energized proc unless explicitly charged. */
    readonly energized?: boolean;
  };
}

export interface ItemProcDamage {
  readonly itemId: ItemId;
  readonly damage: DamageBreakdown;
}

export interface SimulatedDamageInstance {
  readonly source: SmolderDamageSource | "SMOLDER_EXECUTE" | "COLLECTOR_EXECUTE";
  readonly rawDamage: DamageBreakdown;
  readonly damage: DamageBreakdown;
  readonly itemProcs: readonly ItemProcDamage[];
  readonly healthBefore: number;
  readonly healthAfter: number;
  readonly damageAppliedToHealth: number;
}

export interface SmolderSimulationResult extends DamageBreakdown {
  readonly patch: "26.20";
  readonly stats: SmolderCombatStats;
  readonly ability: SmolderAbilityResult;
  readonly instances: readonly SimulatedDamageInstance[];
  readonly effectiveArmor: number;
  readonly effectiveMagicResistance: number;
  readonly remainingHealth: number;
  readonly damageAppliedToHealth: number;
  readonly executed: boolean;
  /** Absolute health threshold, not a fraction of maximum health. */
  readonly executionThreshold: number;
}
