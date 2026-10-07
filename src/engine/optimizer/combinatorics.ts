import { getItem, ITEMS } from "../../data/items";
import type { ItemDefinition, ItemId } from "../../types/items";
import type { BuildCombinationConfig } from "../../types/optimizer";
import { assertFraction, assertIntegerInRange, assertNonNegativeNumber } from "../validation";

type ItemGroup = NonNullable<ItemDefinition["uniqueGroup"]>;

/** Lazy unordered combinations, pruned by inventory groups, crit and gold. */
export function* generateItemCombinations(config: BuildCombinationConfig): Generator<readonly ItemId[], void, unknown> {
  assertIntegerInRange(config.itemCount, "itemCount", 0, 6);
  const bonusCrit = config.bonusCriticalStrikeChance ?? 0;
  assertFraction(bonusCrit, "bonusCriticalStrikeChance");
  if (config.maxGold !== undefined) assertNonNegativeNumber(config.maxGold, "maxGold");
  const maxGold = config.maxGold ?? Infinity;

  const pool = [...(config.itemPool ?? Object.keys(ITEMS) as ItemId[])].sort();
  if (new Set(pool).size !== pool.length) throw new RangeError("Duplicate item in itemPool.");
  const definitions = new Map(pool.map((id) => [id, getItem(id)]));
  const required = [...(config.requiredItems ?? [])].sort();
  if (new Set(required).size !== required.length || required.length > config.itemCount) {
    throw new RangeError("Required items must be unique and fit the inventory.");
  }

  const groups = new Set<ItemGroup>();
  let requiredCrit = bonusCrit;
  let requiredGold = 0;
  for (const id of required) {
    const item = definitions.get(id);
    if (!item) throw new RangeError(`Required item ${id} is not in itemPool.`);
    if (item.uniqueGroup && groups.has(item.uniqueGroup)) {
      throw new RangeError("Required items contain incompatible inventory groups.");
    }
    if (item.uniqueGroup) groups.add(item.uniqueGroup);
    requiredCrit += item.stats.criticalStrikeChance ?? 0;
    requiredGold += item.goldCost;
  }
  if (requiredCrit > 1 || requiredGold > maxGold) return;

  const requiredSet = new Set(required);
  const optional = pool.filter((id) => !requiredSet.has(id)).map((id) => definitions.get(id)!);
  const slotsToFill = config.itemCount - required.length;
  const selected: ItemId[] = [];

  function* visit(start: number, crit: number, gold: number): Generator<readonly ItemId[], void, unknown> {
    if (selected.length === slotsToFill) {
      yield [...required, ...selected].sort();
      return;
    }
    const remaining = slotsToFill - selected.length;
    for (let index = start; index <= optional.length - remaining; index += 1) {
      const item = optional[index];
      const nextCrit = crit + (item.stats.criticalStrikeChance ?? 0);
      const nextGold = gold + item.goldCost;
      if (nextCrit > 1 || nextGold > maxGold || (item.uniqueGroup && groups.has(item.uniqueGroup))) continue;
      selected.push(item.id);
      if (item.uniqueGroup) groups.add(item.uniqueGroup);
      yield* visit(index + 1, nextCrit, nextGold);
      if (item.uniqueGroup) groups.delete(item.uniqueGroup);
      selected.pop();
    }
  }

  yield* visit(0, requiredCrit, requiredGold);
}
