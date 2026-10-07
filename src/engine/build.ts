import { SMOLDER_BASE_STATS } from "../data/champions/smolder";
import { SMOLDER_KIT } from "../data/champions/smolder-kit";
import { getItem } from "../data/items";
import type { ItemDefinition, ItemId, ItemStats } from "../types/items";
import type { SmolderCombatStats } from "../types/smolder";
import { calculateAttackSpeed, calculateChampionStats } from "./stats";
import { assertFraction, assertNonNegativeNumber } from "./validation";

const statKeys = ["attackDamage", "abilityPower", "abilityHaste", "attackSpeed",
  "criticalStrikeChance", "criticalStrikeDamage", "armorPenetration", "lethality"] as const;

export function resolveSmolderBuild(
  level: number,
  slots: readonly (ItemId | null)[],
  bonusStats: ItemStats = {},
): { readonly items: readonly ItemDefinition[]; readonly stats: SmolderCombatStats } {
  if (slots.length > 6) {
    throw new RangeError("A build can contain at most six inventory slots.");
  }
  const items: ItemDefinition[] = [];
  const seen = new Set<ItemId>();
  const groups = new Set<NonNullable<ItemDefinition["uniqueGroup"]>>();
  for (const id of slots) {
    if (id === null) continue;
    const item = getItem(id);
    if (seen.has(id) || (item.uniqueGroup && groups.has(item.uniqueGroup))) {
      throw new RangeError(`Duplicate or mutually exclusive item: ${id}`);
    }
    seen.add(id);
    if (item.uniqueGroup) groups.add(item.uniqueGroup);
    items.push(item);
  }

  const totals: Record<keyof ItemStats, number> = {
    attackDamage: 0, abilityPower: 0, abilityHaste: 0, attackSpeed: 0,
    criticalStrikeChance: 0, criticalStrikeDamage: 0, armorPenetration: 0, lethality: 0,
  };
  for (const source of [bonusStats, ...items.map((item) => item.stats)]) {
    for (const key of statKeys) {
      const value = source[key] ?? 0;
      assertNonNegativeNumber(value, key);
      if (key === "armorPenetration" || key === "criticalStrikeChance") {
        assertFraction(value, key);
      }
      totals[key] = key === "armorPenetration"
        ? 1 - (1 - totals[key]) * (1 - value)
        : totals[key] + value;
    }
  }

  const base = calculateChampionStats(SMOLDER_BASE_STATS, level);
  const bonusAttackSpeed = base.bonusAttackSpeed + totals.attackSpeed;
  return {
    items,
    stats: {
      ...base,
      baseAttackDamage: base.attackDamage,
      bonusAttackDamage: totals.attackDamage,
      attackDamage: base.attackDamage + totals.attackDamage,
      bonusAttackSpeed,
      attackSpeed: calculateAttackSpeed(SMOLDER_BASE_STATS.attackSpeed.base, bonusAttackSpeed, SMOLDER_BASE_STATS.attackSpeed.ratio),
      abilityPower: totals.abilityPower,
      abilityHaste: totals.abilityHaste,
      criticalStrikeChance: Math.min(1, totals.criticalStrikeChance),
      criticalStrikeMultiplier: SMOLDER_KIT.baseCriticalStrikeMultiplier + totals.criticalStrikeDamage,
      armorPenetration: totals.armorPenetration,
      lethality: totals.lethality,
    },
  };
}
