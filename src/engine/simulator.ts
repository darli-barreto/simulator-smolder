import { SMOLDER_KIT } from "../data/champions/smolder-kit";
import { ITEM_DATA_VERSION } from "../data/items";
import type { DamageBreakdown } from "../types/engine";
import type { ItemProcDamage, SimulatedDamageInstance, SmolderCast, SmolderSimulationConfig, SmolderSimulationResult } from "../types/smolder";
import { resolveSmolderBuild } from "./build";
import { calculateSmolderAbility } from "./champions/smolder";
import { damageBreakdown, sumDamage } from "./damage";
import { calculateDamageMultiplier, calculateEffectiveResistance } from "./mitigation";
import { assertFraction, assertIntegerInRange, assertNonNegativeNumber } from "./validation";

/** Deterministic full-cast damage; regeneration, shields and travel time are external. */
export function simulateSmolderDamage(config: SmolderSimulationConfig): SmolderSimulationResult {
  const { level, stacks, target } = config;
  const { items, stats } = resolveSmolderBuild(level, config.items, config.bonusStats);
  const cast: SmolderCast = config.cast ?? { ability: "Q", rank: Math.min(5, Math.ceil(level / 2)) };
  const maxRank = cast.ability === "R" ? (level >= 16 ? 3 : level >= 11 ? 2 : level >= 6 ? 1 : 0) : Math.min(5, Math.ceil(level / 2));
  assertIntegerInRange(cast.rank, "ability rank at this level", 1, maxRank);

  assertNonNegativeNumber(target.maxHealth, "target.maxHealth");
  if (target.maxHealth === 0) throw new RangeError("target.maxHealth must be positive.");
  const initialHealth = target.currentHealth ?? target.maxHealth;
  const bonusHealth = target.bonusHealth ?? 0;
  assertNonNegativeNumber(initialHealth, "target.currentHealth");
  assertNonNegativeNumber(bonusHealth, "target.bonusHealth");
  if (initialHealth > target.maxHealth || bonusHealth > target.maxHealth) {
    throw new RangeError("Current and bonus health cannot exceed maximum health.");
  }

  const armorProfile = config.mitigation?.armor ?? {};
  // Validate each supplied source before combining it with item penetration.
  assertFraction(armorProfile.percentPenetration ?? 0, "armor.percentPenetration");
  assertNonNegativeNumber(armorProfile.flatPenetration ?? 0, "armor.flatPenetration");
  const effectiveArmor = calculateEffectiveResistance(target.armor, {
    ...armorProfile,
    percentPenetration: 1 - (1 - (armorProfile.percentPenetration ?? 0)) * (1 - stats.armorPenetration),
    flatPenetration: (armorProfile.flatPenetration ?? 0) + stats.lethality,
  });
  const effectiveMagicResistance = calculateEffectiveResistance(target.magicResistance, config.mitigation?.magicResistance);
  const physicalMultiplier = calculateDamageMultiplier(effectiveArmor);
  const magicMultiplier = calculateDamageMultiplier(effectiveMagicResistance);
  const ability = calculateSmolderAbility(stats, stacks, cast, target.maxHealth);

  let giantSlayerMultiplier = 1;
  let collectorThreshold = 0;
  for (const item of items) {
    for (const effect of item.effects ?? []) {
      if (effect.kind === "giant-slayer") giantSlayerMultiplier *= 1 + effect.maxBonusDamage * Math.min(1, bonusHealth / effect.maxBonusHealth);
      if (effect.kind === "execute") collectorThreshold = Math.max(collectorThreshold, effect.threshold);
    }
  }
  const mitigate = (raw: DamageBreakdown): DamageBreakdown => damageBreakdown(
    raw.physicalDamage * giantSlayerMultiplier * physicalMultiplier,
    raw.magicDamage * giantSlayerMultiplier * magicMultiplier,
    raw.trueDamage,
  );

  const instances: SimulatedDamageInstance[] = [];
  let health = initialHealth;
  let burning = target.smolderBurnActive ?? false;
  let executed = false;
  let executionThreshold = collectorThreshold * target.maxHealth;

  for (const hit of ability.instances) {
    if (health === 0) break;
    const procRaw: { itemId: ItemProcDamage["itemId"]; damage: DamageBreakdown }[] = [];
    if (hit.appliesOnHit) {
      for (const item of items) {
        for (const effect of item.effects ?? []) {
          if (effect.kind === "spellblade" && (config.itemState?.spellbladeReady ?? true)) {
            procRaw.push({ itemId: item.id, damage: damageBreakdown(effect.baseADRatio * stats.baseAttackDamage + effect.critChanceDamage * stats.criticalStrikeChance) });
          }
          if (effect.kind === "energized" && (config.itemState?.energized ?? false)) {
            procRaw.push({ itemId: item.id, damage: damageBreakdown(0, effect.magicDamage) });
          }
        }
      }
    }
    // On-hit procs form part of this impact and do not inherit Q's crit multiplier.
    const rawDamage = sumDamage([hit.rawDamage, ...procRaw.map((proc) => proc.damage)]);
    const damage = mitigate(rawDamage);
    const healthBefore = health;
    health = Math.max(0, health - damage.totalDamage);
    burning ||= hit.appliesBurn;
    const smolderThreshold = burning && stacks >= SMOLDER_KIT.q.thresholds[2] ? SMOLDER_KIT.q.executeThreshold : 0;
    const thresholdFraction = Math.max(smolderThreshold, collectorThreshold);
    executionThreshold = thresholdFraction * target.maxHealth;
    instances.push({ source: hit.source, rawDamage, damage,
      itemProcs: procRaw.map((proc) => ({ itemId: proc.itemId, damage: mitigate(proc.damage) })),
      healthBefore, healthAfter: health, damageAppliedToHealth: healthBefore - health });

    if ((target.canBeExecuted ?? true) && damage.totalDamage > 0 && health > 0 && health < executionThreshold) {
      const executionDamage = damageBreakdown(0, 0, health);
      instances.push({ source: smolderThreshold >= collectorThreshold ? "SMOLDER_EXECUTE" : "COLLECTOR_EXECUTE",
        rawDamage: executionDamage, damage: executionDamage, itemProcs: [],
        healthBefore: health, healthAfter: 0, damageAppliedToHealth: health });
      health = 0;
      executed = true;
      break;
    }
  }

  return {
    ...sumDamage(instances.map((hit) => hit.damage)),
    patch: ITEM_DATA_VERSION.patch, stats, ability, instances, effectiveArmor, effectiveMagicResistance,
    remainingHealth: health, damageAppliedToHealth: initialHealth - health, executed, executionThreshold,
  };
}
