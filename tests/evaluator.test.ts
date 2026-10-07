import { describe, expect, it } from "vitest";
import { evaluateSmolderBuild } from "../src/engine/optimizer/evaluator";
import type { BuildEvaluationConfig } from "../src/types/optimizer";

const reference: BuildEvaluationConfig = {
  level: 18, stacks: 225, items: ["3031", "3036", "3508"],
  targetDummy: { maxHealth: 3000, armor: 100, magicResistance: 100, bonusHealth: 0 },
};

describe("build fitness", () => {
  it("matches the integrated Q regression and independently derived sustained DPS", () => {
    const result = evaluateSmolderBuild(reference);
    expect(result.burstQ).toBeCloseTo(639.7201704545455, 8);
    expect(result.goldCost).toBe(9850);
    expect(result.qCooldownSeconds).toBeCloseTo(2.9166666666666665, 10);
    expect(result.qCastTimeSeconds).toBeCloseTo(0.1488095238095238, 10);
    expect(result.autoAttackDamage.physicalDamage).toBeCloseTo(307.74090909090916, 8);
    expect(result.autoAttacksPerSecond).toBeCloseTo(1.0171542857142857, 10);
    expect(result.dps.q.physicalDamage).toBeCloseTo(110.8, 8);
    expect(result.dps.q.magicDamage).toBeCloseTo(22.80535714285714, 8);
    expect(result.dps.burn.trueDamage).toBeCloseTo(51.25, 8);
    expect(result.dps.autoAttacks.physicalDamage).toBeCloseTo(313.0199845714286, 8);
    expect(result.dps.itemProcs.physicalDamage).toBeCloseTo(33.012987012987004, 8);
    expect(result.estimatedDps).toBeCloseTo(530.8883287272727, 8);
  });

  it("uses expected crit damage for autos, without applying Q's special multiplier", () => {
    const plain = evaluateSmolderBuild({ ...reference, stacks: 0, items: [] });
    const ie = evaluateSmolderBuild({ ...reference, stacks: 0, items: ["3031"] });
    expect(plain.autoAttackDamage.physicalDamage).toBeCloseTo(48.55, 10);
    expect(ie.autoAttackDamage.physicalDamage).toBeCloseTo(114.01625, 10);
    expect(plain.dps.burn.totalDamage).toBe(0);
  });

  it("refreshes burn without stacking it when Q is faster than three seconds", () => {
    const result = evaluateSmolderBuild({ ...reference, bonusStats: { abilityHaste: 230 } }); // 250 total with ER.
    expect(result.qCooldownSeconds).toBe(1);
    expect(result.dps.burn.trueDamage).toBe(51.25);
    expect(result.spellbladeProcsPerSecond).toBe(0.5); // Every second Q: 1.5 s cooldown.
    expect(result.dps.itemProcs.physicalDamage).toBeCloseTo(48.14393939393939, 8);
    const slow = evaluateSmolderBuild({ ...reference, items: [] });
    expect(slow.dps.burn.trueDamage).toBeCloseTo(33.75 / 3.5, 10);
  });

  it("can model reduced attack uptime and an explicit Energized recharge interval", () => {
    const config = { ...reference, items: ["3094"] as const };
    const normal = evaluateSmolderBuild(config);
    const idle = evaluateSmolderBuild({ ...config, dpsOptions: { autoAttackUptime: 0 } });
    expect(idle.autoAttacksPerSecond).toBe(0);
    expect(idle.dps.q).toEqual(normal.dps.q);
    const charged = evaluateSmolderBuild({ ...config, itemState: { energized: true }, dpsOptions: { energizedProcIntervalSeconds: 5 } });
    expect(charged.burstQ - normal.burstQ).toBeCloseTo(20, 10);
    expect(charged.energizedProcsPerSecond).toBe(0.2);
    expect(charged.dps.itemProcs.magicDamage).toBe(4);
    expect(normal.dps.itemProcs.magicDamage).toBe(0);
  });

  it("separates initial Spellblade availability from its sustained cadence", () => {
    const ready = evaluateSmolderBuild(reference);
    const initialCooldown = evaluateSmolderBuild({ ...reference, itemState: { spellbladeReady: false } });
    expect(ready.burstQ - initialCooldown.burstQ).toBeCloseTo(96.28787878787878, 8);
    expect(initialCooldown.estimatedDps).toBe(ready.estimatedDps);
    const disabled = evaluateSmolderBuild({ ...reference, dpsOptions: { spellbladeEnabled: false } });
    expect(ready.estimatedDps - disabled.estimatedDps).toBeCloseTo(33.012987012987004, 8);
    expect(disabled.spellbladeProcsPerSecond).toBe(0);
  });

  it("caps attack speed and bounds Q cadence by its cast time", () => {
    const result = evaluateSmolderBuild({ ...reference, bonusStats: { attackSpeed: 10, abilityHaste: 10000 } });
    expect(result.stats.attackSpeed).toBeGreaterThan(3);
    expect(result.autoAttacksPerSecond).toBe(0);
    expect(result.qCastTimeSeconds).toBeCloseTo(0.25 * 0.638 / 3, 10);
    expect(result.qCastsPerSecond).toBeCloseTo(1 / result.qCastTimeSeconds, 10);
    expect(Number.isFinite(result.estimatedDps)).toBe(true);
  });

  it("preserves full-cast benchmark damage even if the impact would kill the target", () => {
    const result = evaluateSmolderBuild({ ...reference, targetDummy: { maxHealth: 10, armor: 0, magicResistance: 0 } });
    expect(result.burstDamage.trueDamage).toBeCloseTo(0.5125, 10);
    expect(result.burstDamage.physicalDamage).toBeCloseTo(692.1, 8);
  });

  it("is deterministic and does not mutate inputs", () => {
    const before = structuredClone(reference);
    expect(evaluateSmolderBuild(reference)).toEqual(evaluateSmolderBuild(reference));
    expect(reference).toEqual(before);
  });

  it("rejects invalid DPS options and rank/stacks/target configuration", () => {
    for (const autoAttackUptime of [-1, 1.1, NaN]) {
      expect(() => evaluateSmolderBuild({ ...reference, dpsOptions: { autoAttackUptime } })).toThrow(RangeError);
    }
    for (const energizedProcIntervalSeconds of [0, -1, Infinity]) {
      expect(() => evaluateSmolderBuild({ ...reference, dpsOptions: { energizedProcIntervalSeconds } })).toThrow(RangeError);
    }
    expect(() => evaluateSmolderBuild({ ...reference, level: 1, qRank: 5 })).toThrow(RangeError);
    expect(() => evaluateSmolderBuild({ ...reference, stacks: -1 })).toThrow(RangeError);
    expect(() => evaluateSmolderBuild({ ...reference, targetDummy: { ...reference.targetDummy, maxHealth: 0 } })).toThrow(RangeError);
  });
});
