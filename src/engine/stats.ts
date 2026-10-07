import type { ChampionBaseStats, ChampionStats } from "../types/engine";
import { assertFiniteNumber, assertNonNegativeNumber } from "./validation";

/** Riot's polynomial growth curve for champion levels 1 through 18. */
export function calculateStatAtLevel(base: number, growth: number, level: number): number {
  assertFiniteNumber(base, "base");
  assertFiniteNumber(growth, "growth");
  if (!Number.isInteger(level) || level < 1 || level > 18) {
    throw new RangeError("level must be an integer between 1 and 18.");
  }

  const levelsGained = level - 1;
  return base + growth * levelsGained * (0.7025 + 0.0175 * levelsGained);
}

/**
 * Attack speed before caps, slows, or special champion overrides.
 * bonusAttackSpeed is a fraction; Smolder's ratio equals his base speed.
 */
export function calculateAttackSpeed(
  baseAttackSpeed: number,
  bonusAttackSpeed: number,
  attackSpeedRatio: number = baseAttackSpeed,
): number {
  assertNonNegativeNumber(baseAttackSpeed, "baseAttackSpeed");
  assertNonNegativeNumber(bonusAttackSpeed, "bonusAttackSpeed");
  assertNonNegativeNumber(attackSpeedRatio, "attackSpeedRatio");
  return baseAttackSpeed + attackSpeedRatio * bonusAttackSpeed;
}

export function calculateCooldown(baseCooldown: number, abilityHaste: number): number {
  assertNonNegativeNumber(baseCooldown, "baseCooldown");
  assertNonNegativeNumber(abilityHaste, "abilityHaste");
  return baseCooldown * 100 / (100 + abilityHaste);
}

export function calculateChampionStats(baseStats: ChampionBaseStats, level: number): ChampionStats {
  const bonusAttackSpeed = calculateStatAtLevel(0, baseStats.attackSpeed.growth, level);

  return {
    health: calculateStatAtLevel(baseStats.health.base, baseStats.health.growth, level),
    armor: calculateStatAtLevel(baseStats.armor.base, baseStats.armor.growth, level),
    magicResistance: calculateStatAtLevel(
      baseStats.magicResistance.base,
      baseStats.magicResistance.growth,
      level,
    ),
    attackDamage: calculateStatAtLevel(baseStats.attackDamage.base, baseStats.attackDamage.growth, level),
    bonusAttackSpeed,
    attackSpeed: calculateAttackSpeed(baseStats.attackSpeed.base, bonusAttackSpeed, baseStats.attackSpeed.ratio),
  };
}
