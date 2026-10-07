import { describe, expect, it } from "vitest";
import { evaluateSmolderBuild } from "../src/engine/optimizer/evaluator";
import { optimizeBuild } from "../src/engine/optimizer/optimizer";
import type { OptimizeBuildConfig } from "../src/types/optimizer";

const reference: OptimizeBuildConfig = {
  champion: "smolder", level: 18, stacks: 225,
  targetDummy: { maxHealth: 3000, armor: 100, magicResistance: 100, bonusHealth: 0 },
  metric: "BURST_Q",
};

describe("Smolder optimizer", () => {
  it("finds different optimal builds for burst and sustained DPS", () => {
    const config = { ...reference, itemCount: 3, itemPool: ["3031", "3036", "3072", "3046"] as const, requiredItems: ["3031", "3036"] as const };
    const burst = optimizeBuild(config);
    const dps = optimizeBuild({ ...config, metric: "DPS" });
    expect(burst.evaluatedCount).toBe(2);
    expect(burst.topBuilds[0].items).toEqual(["3031", "3036", "3072"]);
    expect(dps.topBuilds[0].items).toEqual(["3031", "3036", "3046"]);
    expect(burst.topBuilds[0].score).toBe(burst.topBuilds[0].burstQ);
    expect(dps.topBuilds[0].score).toBe(dps.topBuilds[0].estimatedDps);
  });

  it("returns the true top five compared with independent exhaustive pairs", () => {
    const pool = ["3031", "3072", "3508", "3046", "6676", "6673"] as const;
    const expected = [];
    for (let first = 0; first < pool.length; first += 1) {
      for (let second = first + 1; second < pool.length; second += 1) {
        const build = evaluateSmolderBuild({ ...reference, items: [pool[first], pool[second]].sort() });
        expected.push(build);
      }
    }
    expected.sort((a, b) => b.burstQ - a.burstQ || a.goldCost - b.goldCost || (a.items.join(",") < b.items.join(",") ? -1 : 1));
    const result = optimizeBuild({ ...reference, itemCount: 2, itemPool: pool });
    expect(result.evaluatedCount).toBe(15);
    expect(result.topBuilds.map((build) => build.items)).toEqual(expected.slice(0, 5).map((build) => build.items));
    expect(result.topBuilds.map((build) => build.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("breaks equal burst scores by price, then item IDs", () => {
    const boots = optimizeBuild({ ...reference, itemCount: 1, itemPool: ["3006", "3158"] });
    expect(boots.topBuilds[0].items).toEqual(["3158"]);
    const samePrice = optimizeBuild({ ...reference, itemCount: 1, itemPool: ["3094", "3046"] });
    expect(samePrice.topBuilds[0].items).toEqual(["3046"]);
    expect(samePrice).toEqual(optimizeBuild({ ...reference, itemCount: 1, itemPool: ["3046", "3094"] }));
  });

  it("respects gold, required boots and fewer than five feasible builds", () => {
    const result = optimizeBuild({ ...reference, itemCount: 2, itemPool: ["3031", "3508", "3158"], requiredItems: ["3158"], maxGold: 3950 });
    expect(result.evaluatedCount).toBe(1);
    expect(result.topBuilds).toHaveLength(1);
    expect(result.topBuilds[0].items).toEqual(["3158", "3508"]);
    expect(result.topBuilds[0].goldCost).toBe(3950);
    expect(optimizeBuild({ ...reference, maxGold: 0 }).topBuilds).toEqual([]);
  });

  it("evaluates the complete supported catalog and keeps results independent", () => {
    const before = structuredClone(reference);
    const result = optimizeBuild(reference);
    expect(result.patch).toBe("26.20");
    expect(result.itemCount).toBe(6);
    expect(result.evaluatedCount).toBeGreaterThan(5);
    expect(result.topBuilds).toHaveLength(5);
    expect(result).toEqual(optimizeBuild(reference));
    expect(reference).toEqual(before);
    expect(result.topBuilds.every((build, index, all) => index === 0 || all[index - 1].score >= build.score)).toBe(true);
  });

  it("validates the request even if no combination is feasible", () => {
    expect(() => optimizeBuild({ ...reference, level: 0, maxGold: 0 })).toThrow(RangeError);
    expect(() => optimizeBuild({ ...reference, champion: "other" } as unknown as OptimizeBuildConfig)).toThrow(RangeError);
    expect(() => optimizeBuild({ ...reference, metric: "other" } as unknown as OptimizeBuildConfig)).toThrow(RangeError);
  });
});
