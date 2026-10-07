import { describe, expect, it } from "vitest";
import { getItem, ITEMS } from "../src/data/items";
import { resolveSmolderBuild } from "../src/engine/build";
import { calculateCooldown } from "../src/engine/stats";
import type { ItemId } from "../src/types/items";

describe("item catalog and build stats", () => {
  it("contains the current core item stats", () => {
    expect(getItem("3031").stats).toEqual({ attackDamage: 75, criticalStrikeChance: 0.25, criticalStrikeDamage: 0.3 });
    expect(getItem("3036").stats.armorPenetration).toBe(0.35);
    expect(getItem("3508").stats.abilityHaste).toBe(20);
    for (const [id, item] of Object.entries(ITEMS)) {
      expect(item.id).toBe(id);
      expect(item.goldCost).toBeGreaterThan(0);
    }
  });

  it("aggregates level stats, items and optional external stats", () => {
    const { stats } = resolveSmolderBuild(18, ["3031", "3036", "3508", null], { abilityPower: 100 });
    expect(stats.baseAttackDamage).toBeCloseTo(97.1, 10);
    expect(stats.bonusAttackDamage).toBe(160);
    expect(stats.attackDamage).toBeCloseTo(257.1, 10);
    expect(stats.criticalStrikeChance).toBe(0.75);
    expect(stats.criticalStrikeMultiplier).toBe(2.3);
    expect(stats.abilityHaste).toBe(20);
    expect(stats.abilityPower).toBe(100);
  });

  it("caps crit chance at 100% and includes item attack speed", () => {
    const { stats } = resolveSmolderBuild(18, ["3031", "3508", "6676", "3094", "6673", "3046"]);
    expect(stats.criticalStrikeChance).toBe(1);
    expect(stats.bonusAttackSpeed).toBeCloseTo(1.68, 10);
    expect(stats.attackSpeed).toBeCloseTo(1.70984, 10);
  });

  it("rejects duplicate and mutually exclusive items", () => {
    expect(() => resolveSmolderBuild(18, ["3031", "3031"])).toThrow(RangeError);
    expect(() => resolveSmolderBuild(18, ["3036", "3033"])).toThrow(RangeError);
    expect(() => resolveSmolderBuild(18, ["3036", "6694"])).toThrow(RangeError);
    expect(() => resolveSmolderBuild(18, ["3158", "3006"])).toThrow(RangeError);
  });

  it("rejects more than six slots and unknown IDs", () => {
    expect(() => resolveSmolderBuild(18, [null, null, null, null, null, null, null])).toThrow(RangeError);
    expect(() => resolveSmolderBuild(18, ["unknown" as ItemId])).toThrow(RangeError);
  });
});

describe("ability haste to cooldown", () => {
  it.each([[0, 3.5], [15, 3.0434782608695654], [60, 2.1875]])("matches D2 at %s AH", (haste, expected) => {
    expect(calculateCooldown(3.5, haste)).toBeCloseTo(expected, 10);
  });

  it("rejects negative and non-finite cooldown inputs", () => {
    for (const value of [-1, NaN, Infinity]) {
      expect(() => calculateCooldown(3.5, value)).toThrow(RangeError);
      expect(() => calculateCooldown(value, 15)).toThrow(RangeError);
    }
  });
});
