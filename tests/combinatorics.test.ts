import { describe, expect, it } from "vitest";
import { getItem } from "../src/data/items";
import { generateItemCombinations } from "../src/engine/optimizer/combinatorics";
import type { ItemId } from "../src/types/items";

describe("legal item combinations", () => {
  it("enumerates each unordered pair once and removes incompatible items", () => {
    const builds = [...generateItemCombinations({ itemCount: 2, itemPool: ["3031", "3036", "3033", "3006", "3158", "3508"] })];
    expect(builds).toHaveLength(13); // 6 choose 2, minus two incompatible pairs.
    expect(new Set(builds.map((build) => build.join(","))).size).toBe(13);
    expect(builds).not.toContainEqual(["3033", "3036"]);
    expect(builds).not.toContainEqual(["3006", "3158"]);
  });

  it("is independent of pool order and does not mutate it", () => {
    const pool = ["3508", "3031", "3072"] as const;
    const before = [...pool];
    expect([...generateItemCombinations({ itemCount: 2, itemPool: pool })]).toEqual(
      [...generateItemCombinations({ itemCount: 2, itemPool: [...pool].reverse() })],
    );
    expect(pool).toEqual(before);
  });

  it("allows 100% crit and excludes wasted crit, including external bonuses", () => {
    const pool = ["3031", "3508", "6676", "6673", "3094"] as const;
    expect([...generateItemCombinations({ itemCount: 4, itemPool: pool })]).toHaveLength(5);
    expect([...generateItemCombinations({ itemCount: 5, itemPool: pool })]).toEqual([]);
    expect([...generateItemCombinations({ itemCount: 4, itemPool: pool, bonusCriticalStrikeChance: 0.1 })]).toEqual([]);
  });

  it("respects required items and inclusive gold budgets", () => {
    const config = { itemCount: 2, itemPool: ["3031", "3508", "3072"] as const, requiredItems: ["3072"] as const };
    expect([...generateItemCombinations({ ...config, maxGold: 6450 })]).toEqual([["3072", "3508"]]);
    expect([...generateItemCombinations({ ...config, maxGold: 6449 })]).toEqual([]);
  });

  it("handles zero slots and insufficient candidates", () => {
    expect([...generateItemCombinations({ itemCount: 0, maxGold: 0 })]).toEqual([[]]);
    expect([...generateItemCombinations({ itemCount: 3, itemPool: ["3031"] })]).toEqual([]);
  });

  it("produces legal six-slot builds from the full catalog", () => {
    const builds = [...generateItemCombinations({ itemCount: 6 })];
    expect(builds.length).toBeGreaterThan(5);
    for (const build of builds) {
      expect(build).toHaveLength(6);
      expect(new Set(build).size).toBe(6);
      const items = build.map(getItem);
      expect(items.reduce((crit, item) => crit + (item.stats.criticalStrikeChance ?? 0), 0)).toBeLessThanOrEqual(1);
      for (const group of ["boots", "last-whisper"]) {
        expect(items.filter((item) => item.uniqueGroup === group).length).toBeLessThanOrEqual(1);
      }
    }
  });

  it.each([-1, 7, 1.5, NaN])("rejects invalid slot count %s", (itemCount) => {
    expect(() => [...generateItemCombinations({ itemCount })]).toThrow(RangeError);
  });

  it("rejects unknown/duplicate candidates and invalid required selections", () => {
    const invalid = [
      { itemCount: 1, itemPool: ["unknown" as ItemId] },
      { itemCount: 1, itemPool: ["3031", "3031"] as const },
      { itemCount: 1, itemPool: ["3031"] as const, requiredItems: ["3508"] as const },
      { itemCount: 1, requiredItems: ["3031", "3508"] as const },
      { itemCount: 2, requiredItems: ["3031", "3031"] as const },
      { itemCount: 2, requiredItems: ["3033", "3036"] as const },
    ];
    for (const config of invalid) expect(() => [...generateItemCombinations(config)]).toThrow(RangeError);
    for (const maxGold of [-1, NaN, Infinity]) {
      expect(() => [...generateItemCombinations({ itemCount: 1, maxGold })]).toThrow(RangeError);
    }
    expect(() => [...generateItemCombinations({ itemCount: 1, bonusCriticalStrikeChance: 1.1 })]).toThrow(RangeError);
  });
});
