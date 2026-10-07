import { describe, expect, it } from "vitest";
import { calculateSmolderAbility } from "../src/engine/champions/smolder";
import { simulateSmolderDamage } from "../src/engine/simulator";
import type { SmolderCombatStats, SmolderSimulationConfig } from "../src/types/smolder";

const reference: SmolderSimulationConfig = {
  level: 18, stacks: 225, items: ["3031", "3036", "3508", null, null, null],
  target: { maxHealth: 3000, armor: 100, magicResistance: 100, bonusHealth: 0 },
  cast: { ability: "Q", rank: 5 },
};

const stats: SmolderCombatStats = {
  health: 2000, armor: 90, magicResistance: 50,
  attackDamage: 200, baseAttackDamage: 100, bonusAttackDamage: 100,
  bonusAttackSpeed: 0, attackSpeed: 0.638, abilityPower: 100, abilityHaste: 20,
  criticalStrikeChance: 0.5, criticalStrikeMultiplier: 2.3, armorPenetration: 0, lethality: 0,
};

describe("Smolder patch 26.20 integrated regression", () => {
  it("resolves IE + LDR + ER against the full-health 3000/100/100 target", () => {
    const result = simulateSmolderDamage(reference);
    expect(result.patch).toBe("26.20");
    expect(result.stats.bonusAttackDamage).toBe(160);
    expect(result.stats.attackDamage).toBeCloseTo(257.1, 10);
    expect(result.stats.criticalStrikeChance).toBe(0.75);
    expect(result.stats.criticalStrikeMultiplier).toBe(2.3);
    expect(result.effectiveArmor).toBe(65);
    expect(result.physicalDamage).toBeCloseTo(419.45454545454544, 8);
    expect(result.magicDamage).toBeCloseTo(66.515625, 8);
    expect(result.trueDamage).toBeCloseTo(153.75, 8);
    expect(result.totalDamage).toBeCloseTo(639.7201704545455, 8);
    expect(result.instances).toHaveLength(2);
    expect(result.instances[0].itemProcs[0].damage.physicalDamage).toBeCloseTo(96.28787878787878, 8);
    expect(result.ability.cooldownSeconds).toBeCloseTo(2.9166666666666665, 10);
    expect(result.executed).toBe(false);
  });

  it("omits Spellblade when ER is on cooldown", () => {
    const result = simulateSmolderDamage({ ...reference, itemState: { spellbladeReady: false } });
    expect(result.physicalDamage).toBeCloseTo(323.1666666666667, 8);
    expect(result.totalDamage).toBeCloseTo(543.4322916666667, 8);
    expect(result.instances[0].itemProcs).toEqual([]);
  });

  it("uses target bonus health for Giant Slayer and preserves true damage", () => {
    const normal = simulateSmolderDamage(reference);
    const amplified = simulateSmolderDamage({ ...reference, target: { ...reference.target, bonusHealth: 750 } });
    expect(amplified.physicalDamage).toBeCloseTo(normal.physicalDamage * 1.075, 10);
    expect(amplified.magicDamage).toBeCloseTo(normal.magicDamage * 1.075, 10);
    expect(amplified.trueDamage).toBe(normal.trueDamage);
    const capped = simulateSmolderDamage({ ...reference, target: { ...reference.target, bonusHealth: 2000 } });
    expect(capped.physicalDamage).toBeCloseTo(normal.physicalDamage * 1.15, 10);
  });

  it("applies armor and MR profiles independently", () => {
    const result = simulateSmolderDamage({ ...reference, mitigation: {
      armor: { flatReduction: 20, percentReduction: 0.2, percentPenetration: 0.1, flatPenetration: 10 },
      magicResistance: { percentPenetration: 0.4, flatPenetration: 10 },
    } });
    expect(result.effectiveArmor).toBeCloseTo(27.44, 10);
    expect(result.effectiveMagicResistance).toBe(50);
    expect(result.trueDamage).toBe(153.75);
  });

  it("does not mutate input or reuse a mutable result", () => {
    const before = structuredClone(reference);
    expect(simulateSmolderDamage(reference)).toEqual(simulateSmolderDamage(reference));
    expect(reference).toEqual(before);
  });
});

describe("Q and Dragon Practice", () => {
  it("uses bonus AD, independent physical/magic crit scaling and the current burn", () => {
    const result = calculateSmolderAbility(stats, 225, { ability: "Q", rank: 5 }, 3000);
    expect(result.instances[0].rawDamage.physicalDamage).toBeCloseTo(342.125, 10);
    expect(result.instances[0].rawDamage.magicDamage).toBeCloseTo(107.4375, 10);
    expect(result.instances[1].rawDamage.trueDamage).toBeCloseTo(108.75, 10);
    expect(result.instances[0].appliesOnHit).toBe(true);
    const moreBaseAD = calculateSmolderAbility({ ...stats, attackDamage: 300, baseAttackDamage: 200 }, 225, { ability: "Q", rank: 5 }, 3000);
    expect(moreBaseAD.instances).toEqual(result.instances);
  });

  it.each([
    { stacks: 24, tier: 0 }, { stacks: 25, tier: 1 }, { stacks: 124, tier: 1 },
    { stacks: 125, tier: 2 }, { stacks: 224, tier: 2 }, { stacks: 225, tier: 3 },
  ])("unlocks tier $tier at $stacks stacks", ({ stacks, tier }) => {
    const result = calculateSmolderAbility(stats, stacks, { ability: "Q", rank: 5 }, 3000);
    expect(result.qTier).toBe(tier);
    expect(result.instances).toHaveLength(tier === 3 ? 2 : 1);
  });

  it("adds no extra projectile damage to the primary target at 125 stacks", () => {
    const primary = calculateSmolderAbility(stats, 125, { ability: "Q", rank: 5 }, 3000);
    expect(primary.instances).toHaveLength(1);
    expect(primary.secondaryProjectileCountFormula).toBe(3);
    const secondary = calculateSmolderAbility(stats, 225, { ability: "Q", rank: 5, hit: "secondary" }, 3000);
    expect(secondary.instances[0].rawDamage.physicalDamage).toBeCloseTo(171.0625, 10);
    expect(secondary.instances[0].rawDamage.magicDamage).toBeCloseTo(53.71875, 10);
    expect(secondary.instances[1].rawDamage.trueDamage).toBeCloseTo(108.75, 10);
    expect(secondary.instances[0].appliesOnHit).toBe(false);
  });

  it("applies full spell damage to splash and on-hit only to the primary target", () => {
    const primary = calculateSmolderAbility(stats, 25, { ability: "Q", rank: 5 }, 3000);
    const splash = calculateSmolderAbility(stats, 25, { ability: "Q", rank: 5, hit: "splash" }, 3000);
    expect(splash.instances[0].rawDamage).toEqual(primary.instances[0].rawDamage);
    expect(splash.instances[0].appliesOnHit).toBe(false);
    expect(() => calculateSmolderAbility(stats, 24, { ability: "Q", rank: 1, hit: "splash" }, 3000)).toThrow(RangeError);
    expect(() => calculateSmolderAbility(stats, 124, { ability: "Q", rank: 1, hit: "secondary" }, 3000)).toThrow(RangeError);
  });

  it("uses the 26.20 passive endpoints at 0% and 100% crit", () => {
    for (const [crit, multiplier, expected] of [[0, 2, 25], [1, 2, 60], [1, 2.3, 70.5]]) {
      const result = calculateSmolderAbility({ ...stats, criticalStrikeChance: crit, criticalStrikeMultiplier: multiplier }, 100, { ability: "Q", rank: 1 }, 3000);
      expect(result.instances[0].rawDamage.magicDamage).toBeCloseTo(expected, 10);
    }
  });
});

describe("W, E and R", () => {
  it("separates W glob and explosion; passive applies to explosions", () => {
    const result = calculateSmolderAbility(stats, 100, { ability: "W", rank: 5 }, 3000);
    expect(result.instances[0].rawDamage.physicalDamage).toBe(160);
    expect(result.instances[0].rawDamage.magicDamage).toBe(0);
    expect(result.instances[1].rawDamage.physicalDamage).toBe(240);
    expect(result.instances[1].rawDamage.magicDamage).toBeCloseTo(55, 10);
  });

  it("reduces successive W explosions to 75% of the previous explosion", () => {
    const result = calculateSmolderAbility(stats, 100, { ability: "W", rank: 5, globHit: false, explosions: 3 }, 3000);
    expect(result.instances.map((hit) => hit.rawDamage.physicalDamage)).toEqual([240, 180, 135]);
    [55, 41.25, 30.9375].forEach((expected, index) => {
      expect(result.instances[index].rawDamage.magicDamage).toBeCloseTo(expected, 10);
    });
    expect(calculateSmolderAbility(stats, 100, { ability: "W", rank: 1, explosions: 0 }, 3000).instances).toHaveLength(1);
  });

  it("rounds E additional bolts down and preserves damage per bolt", () => {
    const result = calculateSmolderAbility(stats, 225, { ability: "E", rank: 5 }, 3000);
    expect(result.availableEBolts).toBe(7);
    expect(result.instances).toHaveLength(7);
    expect(result.instances[0].rawDamage.physicalDamage).toBe(90);
    expect(result.instances[0].rawDamage.magicDamage).toBeCloseTo(26.775, 10);
    expect(calculateSmolderAbility(stats, 299, { ability: "E", rank: 1, boltsHit: 2 }, 3000).instances).toHaveLength(2);
    expect(calculateSmolderAbility(stats, 300, { ability: "E", rank: 1 }, 3000).availableEBolts).toBe(8);
  });

  it("matches E passive endpoints in 26.20", () => {
    for (const [multiplier, expected] of [[2, 14], [2.3, 15.8]]) {
      const result = calculateSmolderAbility({ ...stats, criticalStrikeChance: 1, criticalStrikeMultiplier: multiplier }, 100, { ability: "E", rank: 1 }, 3000);
      expect(result.instances[0].rawDamage.magicDamage).toBeCloseTo(expected, 10);
    }
  });

  it("applies R center amplification and updated self-heal separately", () => {
    const edge = calculateSmolderAbility(stats, 225, { ability: "R", rank: 3, center: false }, 3000);
    const center = calculateSmolderAbility(stats, 225, { ability: "R", rank: 3, center: true }, 3000);
    expect(edge.instances[0].rawDamage.physicalDamage).toBe(550);
    expect(center.instances[0].rawDamage.physicalDamage).toBe(825);
    expect(center.instances[0].rawDamage.magicDamage).toBe(0);
    expect(center.selfHealing).toBe(400);
    expect(center.cooldownSeconds).toBeCloseTo(83.33333333333333, 10);
  });
});

describe("item procs and execute", () => {
  it("consumes Energized on a primary Q only", () => {
    const config = { ...reference, items: ["3094"] as const, itemState: { energized: true } };
    const result = simulateSmolderDamage(config);
    expect(result.instances[0].itemProcs[0].damage.magicDamage).toBe(20);
    expect(simulateSmolderDamage({ ...config, cast: { ability: "Q", rank: 5, hit: "splash" } }).instances[0].itemProcs).toEqual([]);
    expect(simulateSmolderDamage({ ...config, itemState: { energized: false } }).instances[0].itemProcs).toEqual([]);
  });

  it.each(["W", "E", "R"] as const)("does not apply Spellblade/Energized on %s", (ability) => {
    const result = simulateSmolderDamage({ ...reference, items: ["3508", "3094"], cast: { ability, rank: 1 }, itemState: { energized: true } });
    expect(result.instances.every((hit) => hit.itemProcs.length === 0)).toBe(true);
  });

  it("executes immediately after Q impact and cancels future burn damage", () => {
    const result = simulateSmolderDamage({ level: 18, stacks: 225, items: [], target: { maxHealth: 1000, currentHealth: 220, armor: 0, magicResistance: 0 } });
    expect(result.executed).toBe(true);
    expect(result.instances.map((hit) => hit.source)).toEqual(["Q_HIT", "SMOLDER_EXECUTE"]);
    expect(result.totalDamage).toBe(220);
    expect(result.remainingHealth).toBe(0);
  });

  it("uses a strict 6.5% threshold", () => {
    const target = { maxHealth: 1000, currentHealth: 232.5, armor: 0, magicResistance: 0 };
    const exact = simulateSmolderDamage({ level: 18, stacks: 225, items: [], target });
    expect(exact.remainingHealth).toBe(65);
    expect(exact.executed).toBe(false);
    const below = simulateSmolderDamage({ level: 18, stacks: 225, items: [], target: { ...target, currentHealth: 232.49 } });
    expect(below.executed).toBe(true);
  });

  it("executes with W only if the target already has Smolder's burn", () => {
    const config: SmolderSimulationConfig = { level: 18, stacks: 225, items: [], cast: { ability: "W", rank: 1 }, target: { maxHealth: 1000, currentHealth: 250, armor: 0, magicResistance: 0 } };
    expect(simulateSmolderDamage(config).executed).toBe(false);
    expect(simulateSmolderDamage({ ...config, target: { ...config.target, smolderBurnActive: true } }).executed).toBe(true);
  });

  it("supports Collector's independent 5% execute", () => {
    const result = simulateSmolderDamage({ level: 18, stacks: 0, items: ["6676"], target: { maxHealth: 1000, currentHealth: 240, armor: 0, magicResistance: 0 } });
    expect(result.executed).toBe(true);
    expect(result.instances.at(-1)?.source).toBe("COLLECTOR_EXECUTE");
    expect(result.totalDamage).toBe(240);
  });

  it("can disable executes for target measurements", () => {
    const result = simulateSmolderDamage({ level: 18, stacks: 225, items: [], target: { maxHealth: 1000, currentHealth: 220, armor: 0, magicResistance: 0, canBeExecuted: false } });
    expect(result.executed).toBe(false);
    expect(result.totalDamage).toBe(167.5);
    expect(result.remainingHealth).toBe(52.5);
  });

  it("caps applied health loss, while keeping overkill damage of a fatal hit", () => {
    const result = simulateSmolderDamage({ ...reference, target: { ...reference.target, currentHealth: 10 } });
    expect(result.remainingHealth).toBe(0);
    expect(result.damageAppliedToHealth).toBe(10);
    expect(result.totalDamage).toBeGreaterThan(10);
    expect(result.instances).toHaveLength(1);
    expect(result.executed).toBe(false);
  });
});

describe("invalid simulator inputs", () => {
  it.each([-1, 1.5, NaN, Infinity])("rejects invalid stacks %s", (stacks) => {
    expect(() => simulateSmolderDamage({ ...reference, stacks })).toThrow(RangeError);
  });

  it.each([0, 6, 1.5])("rejects invalid Q rank %s", (rank) => {
    expect(() => simulateSmolderDamage({ ...reference, cast: { ability: "Q", rank } })).toThrow(RangeError);
  });

  it("enforces level-dependent rank limits", () => {
    expect(() => simulateSmolderDamage({ ...reference, level: 1, cast: { ability: "Q", rank: 5 } })).toThrow(RangeError);
    expect(() => simulateSmolderDamage({ ...reference, level: 5, cast: { ability: "R", rank: 1 } })).toThrow(RangeError);
    expect(() => simulateSmolderDamage({ ...reference, level: 15, cast: { ability: "R", rank: 3 } })).toThrow(RangeError);
  });

  it("rejects invalid target health and bonuses", () => {
    for (const target of [{ ...reference.target, maxHealth: 0 }, { ...reference.target, currentHealth: -1 }, { ...reference.target, currentHealth: 3001 }, { ...reference.target, bonusHealth: 3001 }]) {
      expect(() => simulateSmolderDamage({ ...reference, target })).toThrow(RangeError);
    }
    expect(() => simulateSmolderDamage({ ...reference, bonusStats: { abilityPower: NaN } })).toThrow(RangeError);
  });

  it("rejects impossible hit counts and invalid offensive stats", () => {
    expect(() => calculateSmolderAbility(stats, 225, { ability: "E", rank: 1, boltsHit: 8 }, 3000)).toThrow(RangeError);
    expect(() => calculateSmolderAbility(stats, 225, { ability: "W", rank: 1, explosions: -1 }, 3000)).toThrow(RangeError);
    expect(() => calculateSmolderAbility({ ...stats, criticalStrikeChance: 1.1 }, 225, { ability: "Q", rank: 1 }, 3000)).toThrow(RangeError);
  });

  it("rejects invalid penetration before item bonuses can mask it", () => {
    expect(() => simulateSmolderDamage({ ...reference, mitigation: { armor: { percentPenetration: -0.1 } } })).toThrow(RangeError);
    expect(() => simulateSmolderDamage({ ...reference, items: ["6676"], mitigation: { armor: { flatPenetration: -1 } } })).toThrow(RangeError);
  });
});
