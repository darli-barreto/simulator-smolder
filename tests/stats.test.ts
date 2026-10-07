import { describe, expect, it } from "vitest";
import { SMOLDER_BASE_STATS } from "../src/data/champions/smolder";
import {
  calculateAttackSpeed,
  calculateChampionStats,
  calculateStatAtLevel,
} from "../src/engine/stats";

// D2 reference values are rounded for display; the engine must not round.
const statVectors = [
  { name: "health", base: 575, growth: 100, expected: [575, 647, 722.5, 2275] },
  { name: "armor", base: 24, growth: 4, expected: [24, 26.88, 29.9, 92] },
  { name: "magic resistance", base: 33, growth: 1.1, expected: [33, 33.79, 34.62, 51.7] },
  { name: "attack damage", base: 58, growth: 2.3, expected: [58, 59.66, 61.39, 97.1] },
  { name: "bonus attack speed", base: 0, growth: 0.04, expected: [0, 0.0288, 0.059, 0.68] },
];
const levels = [1, 2, 3, 18];

describe("calculateStatAtLevel", () => {
  for (const vector of statVectors) {
    levels.forEach((level, index) => {
      it(`matches D2 ${vector.name} at level ${level}`, () => {
        expect(calculateStatAtLevel(vector.base, vector.growth, level))
          .toBeCloseTo(vector.expected[index], 2);
      });
    });
  }

  it("retains precision between calculations", () => {
    expect(calculateStatAtLevel(58, 2.3, 2)).toBeCloseTo(59.656, 10);
    expect(calculateStatAtLevel(58, 2.3, 3)).toBeCloseTo(61.3925, 10);
  });

  it("keeps stats with zero growth unchanged", () => {
    expect(calculateStatAtLevel(330, 0, 18)).toBe(330);
  });

  it.each([0, -1, 19, 2.5, NaN, Infinity])("rejects invalid level %s", (level) => {
    expect(() => calculateStatAtLevel(575, 100, level)).toThrow(RangeError);
  });

  it.each([NaN, Infinity, -Infinity])("rejects non-finite stats %s", (value) => {
    expect(() => calculateStatAtLevel(value, 100, 1)).toThrow(RangeError);
    expect(() => calculateStatAtLevel(575, value, 18)).toThrow(RangeError);
  });
});

describe("calculateAttackSpeed", () => {
  it.each([
    { level: 1, bonus: 0, expected: 0.638 },
    { level: 2, bonus: 0.0288, expected: 0.6564 },
    { level: 3, bonus: 0.059, expected: 0.6756 },
    { level: 18, bonus: 0.68, expected: 1.0718 },
  ])("matches D2 attacks/second at level $level", ({ bonus, expected }) => {
    expect(calculateAttackSpeed(0.638, bonus)).toBeCloseTo(expected, 4);
  });

  it("uses the champion ratio when it differs from base attack speed", () => {
    expect(calculateAttackSpeed(0.625, 1.1235, 0.651)).toBeCloseTo(1.3563985, 10);
  });

  it.each([NaN, Infinity, -0.1])("rejects invalid attack speed input %s", (value) => {
    expect(() => calculateAttackSpeed(value, 0)).toThrow(RangeError);
    expect(() => calculateAttackSpeed(0.638, value)).toThrow(RangeError);
    expect(() => calculateAttackSpeed(0.638, 0, value)).toThrow(RangeError);
  });
});

describe("calculateChampionStats", () => {
  it.each([
    { level: 1, health: 575, armor: 24, magicResistance: 33, attackDamage: 58, bonusAttackSpeed: 0, attackSpeed: 0.638 },
    { level: 2, health: 647, armor: 26.88, magicResistance: 33.792, attackDamage: 59.656, bonusAttackSpeed: 0.0288, attackSpeed: 0.6563744 },
    { level: 3, health: 722.5, armor: 29.9, magicResistance: 34.6225, attackDamage: 61.3925, bonusAttackSpeed: 0.059, attackSpeed: 0.675642 },
    { level: 18, health: 2275, armor: 92, magicResistance: 51.7, attackDamage: 97.1, bonusAttackSpeed: 0.68, attackSpeed: 1.07184 },
  ])("calculates unmodified Smolder stats at level $level", ({ level, ...expected }) => {
    const actual = calculateChampionStats(SMOLDER_BASE_STATS, level);
    for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
      expect(actual[key]).toBeCloseTo(expected[key], 10);
    }
  });

  it("does not mutate the champion data", () => {
    const before = structuredClone(SMOLDER_BASE_STATS);
    calculateChampionStats(SMOLDER_BASE_STATS, 18);
    expect(SMOLDER_BASE_STATS).toEqual(before);
  });
});
