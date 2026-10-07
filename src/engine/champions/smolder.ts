import { SMOLDER_KIT } from "../../data/champions/smolder-kit";
import type { RawDamageInstance, SmolderAbilityResult, SmolderCast, SmolderCombatStats } from "../../types/smolder";
import { damageBreakdown } from "../damage";
import { calculateCooldown } from "../stats";
import { assertFraction, assertIntegerInRange, assertNonNegativeNumber } from "../validation";

/** One cast against one champion-like target; all coefficients belong to 26.20. */
export function calculateSmolderAbility(
  stats: SmolderCombatStats,
  stacks: number,
  cast: SmolderCast,
  targetMaxHealth: number,
): SmolderAbilityResult {
  assertIntegerInRange(stacks, "stacks", 0, Number.MAX_SAFE_INTEGER);
  assertNonNegativeNumber(targetMaxHealth, "targetMaxHealth");
  if (targetMaxHealth === 0) throw new RangeError("targetMaxHealth must be positive.");
  for (const key of ["attackDamage", "baseAttackDamage", "bonusAttackDamage", "abilityPower", "abilityHaste"] as const) {
    assertNonNegativeNumber(stats[key], key);
  }
  assertFraction(stats.criticalStrikeChance, "criticalStrikeChance");
  assertNonNegativeNumber(stats.criticalStrikeMultiplier, "criticalStrikeMultiplier");
  if (stats.criticalStrikeMultiplier < 1) throw new RangeError("criticalStrikeMultiplier must be at least 1.");
  assertIntegerInRange(cast.rank, "ability rank", 1, cast.ability === "R" ? 3 : 5);

  const rankIndex = cast.rank - 1;
  const instances: RawDamageInstance[] = [];
  const critBonus = stats.criticalStrikeChance * (stats.criticalStrikeMultiplier - 1);
  const result = {
    ability: cast.ability, instances, cooldownSeconds: 0, selfHealing: 0,
    qTier: 0 as 0 | 1 | 2 | 3, secondaryProjectileCountFormula: 0, availableEBolts: 0,
  };

  switch (cast.ability) {
    case "Q": {
      const q = SMOLDER_KIT.q;
      result.qTier = stacks >= q.thresholds[2] ? 3 : stacks >= q.thresholds[1] ? 2 : stacks >= q.thresholds[0] ? 1 : 0;
      result.secondaryProjectileCountFormula = result.qTier >= 2 ? q.secondaryBase + q.secondaryStackRatio * stacks : 0;
      const hit = cast.hit ?? "primary";
      if (!["primary", "splash", "secondary"].includes(hit)) throw new RangeError("Unknown Q hit type.");
      if ((hit === "splash" && result.qTier < 1) || (hit === "secondary" && result.qTier < 2)) {
        throw new RangeError("The requested Q hit type has not been unlocked.");
      }
      const hitMultiplier = hit === "secondary" ? q.secondaryDamageMultiplier : 1;
      const physical = (q.baseDamage[rankIndex] + q.bonusADRatio * stats.bonusAttackDamage) * (1 + q.critRatio * critBonus);
      const magic = stacks * q.stackRatio * (1 + q.stackCritRatio * critBonus);
      instances.push({ source: "Q_HIT", rawDamage: damageBreakdown(physical * hitMultiplier, magic * hitMultiplier), appliesOnHit: hit === "primary", appliesBurn: result.qTier === 3 });
      if (result.qTier === 3) {
        const burn = (q.burnBonusADRatio * stats.bonusAttackDamage + q.burnStackRatio * stacks) * targetMaxHealth;
        instances.push({ source: "Q_BURN", rawDamage: damageBreakdown(0, 0, burn), appliesOnHit: false, appliesBurn: false });
      }
      result.cooldownSeconds = calculateCooldown(q.cooldown[rankIndex], stats.abilityHaste);
      break;
    }
    case "W": {
      const w = SMOLDER_KIT.w;
      const explosions = cast.explosions ?? 1;
      assertIntegerInRange(explosions, "W explosions", 0, 5);
      if (cast.globHit ?? true) {
        instances.push({ source: "W_GLOB", rawDamage: damageBreakdown(w.globDamage[rankIndex] + w.globBonusADRatio * stats.bonusAttackDamage), appliesOnHit: false, appliesBurn: false });
      }
      const physical = w.explosionDamage[rankIndex] + w.explosionBonusADRatio * stats.bonusAttackDamage + w.explosionAPRatio * stats.abilityPower;
      for (let hit = 0; hit < explosions; hit += 1) {
        const multiplier = w.subsequentMultiplier ** hit;
        instances.push({ source: "W_EXPLOSION", rawDamage: damageBreakdown(physical * multiplier, stacks * w.stackRatio * multiplier), appliesOnHit: false, appliesBurn: false });
      }
      result.cooldownSeconds = calculateCooldown(w.cooldown[rankIndex], stats.abilityHaste);
      break;
    }
    case "E": {
      const e = SMOLDER_KIT.e;
      result.availableEBolts = e.baseBolts + Math.floor(stacks / e.stacksPerBolt);
      const hits = cast.boltsHit ?? result.availableEBolts;
      assertIntegerInRange(hits, "E boltsHit", 0, result.availableEBolts);
      const physical = e.boltDamage[rankIndex] + e.totalADRatio * stats.attackDamage;
      const magic = stacks * e.stackRatio * (1 + e.stackCritRatio * critBonus);
      for (let hit = 0; hit < hits; hit += 1) {
        instances.push({ source: "E_BOLT", rawDamage: damageBreakdown(physical, magic), appliesOnHit: false, appliesBurn: false });
      }
      result.cooldownSeconds = calculateCooldown(e.cooldown[rankIndex], stats.abilityHaste);
      break;
    }
    case "R": {
      const r = SMOLDER_KIT.r;
      const multiplier = (cast.center ?? true) ? r.centerMultiplier : 1;
      const physical = r.baseDamage[rankIndex] + r.bonusADRatio * stats.bonusAttackDamage + r.apRatio * stats.abilityPower;
      instances.push({ source: "R_HIT", rawDamage: damageBreakdown(physical * multiplier), appliesOnHit: false, appliesBurn: false });
      result.selfHealing = r.baseHealing[rankIndex] + r.healBonusADRatio * stats.bonusAttackDamage + r.healAPRatio * stats.abilityPower;
      result.cooldownSeconds = calculateCooldown(r.cooldown[rankIndex], stats.abilityHaste);
      break;
    }
    default:
      throw new RangeError("Unknown Smolder ability.");
  }
  return result;
}
