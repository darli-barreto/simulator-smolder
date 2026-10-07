import { describe, expect, it } from "vitest";
import {
  calculateDamageMultiplier,
  calculateEffectiveResistance,
} from "../src/engine/mitigation";
import type { MitigationProfile } from "../src/types/engine";

describe("calculateEffectiveResistance", () => {
  it.each([
    { name: "no penetration", profile: {}, resistance: 100, expected: 100 },
    { name: "40% penetration", profile: { percentPenetration: 0.4 }, resistance: 100, expected: 60 },
    { name: "40% penetration + 10 lethality", profile: { percentPenetration: 0.4, flatPenetration: 10 }, resistance: 100, expected: 50 },
  ])("matches D2: $name", ({ profile, resistance, expected }) => {
    expect(calculateEffectiveResistance(resistance, profile)).toBeCloseTo(expected, 10);
  });

  it("applies flat reduction, percent reduction, percent penetration, then flat penetration", () => {
    expect(calculateEffectiveResistance(100, {
      flatReduction: 20,
      percentReduction: 0.2,
      percentPenetration: 0.4,
      flatPenetration: 10,
    })).toBeCloseTo(28.4, 10);
  });

  it("allows flat reduction to produce negative resistance", () => {
    expect(calculateEffectiveResistance(10, { flatReduction: 25 })).toBe(-15);
  });

  it("ignores percentage effects and penetration after resistance becomes non-positive", () => {
    const profile: MitigationProfile = {
      flatReduction: 25,
      percentReduction: 0.5,
      percentPenetration: 0.4,
      flatPenetration: 100,
    };
    expect(calculateEffectiveResistance(10, profile)).toBe(-15);
    expect(calculateEffectiveResistance(25, profile)).toBe(0);
    expect(calculateEffectiveResistance(-50, { percentReduction: 0.5, flatPenetration: 100 })).toBe(-50);
  });

  it("prevents penetration alone from producing negative resistance", () => {
    expect(calculateEffectiveResistance(10, { flatPenetration: 25 })).toBe(0);
    expect(calculateEffectiveResistance(100, { percentPenetration: 1, flatPenetration: 10 })).toBe(0);
  });

  it("handles 100% reduction", () => {
    expect(calculateEffectiveResistance(100, { percentReduction: 1 })).toBe(0);
  });

  it.each([NaN, Infinity, -Infinity])("rejects non-finite resistance %s", (value) => {
    expect(() => calculateEffectiveResistance(value)).toThrow(RangeError);
  });

  it.each(["percentReduction", "percentPenetration"] as const)("validates fractions for %s", (field) => {
    for (const value of [-0.1, 1.1, NaN, Infinity]) {
      expect(() => calculateEffectiveResistance(100, { [field]: value })).toThrow(RangeError);
    }
  });

  it.each(["flatReduction", "flatPenetration"] as const)("validates non-negative finite %s", (field) => {
    for (const value of [-1, NaN, Infinity]) {
      expect(() => calculateEffectiveResistance(100, { [field]: value })).toThrow(RangeError);
    }
  });
});

describe("calculateDamageMultiplier", () => {
  it.each([
    { resistance: 100, expected: 0.5 },
    { resistance: 60, expected: 0.625 },
    { resistance: 50, expected: 0.6666666666666666 },
    { resistance: 0, expected: 1 },
    { resistance: -50, expected: 1.3333333333333333 },
    { resistance: -100, expected: 1.5 },
  ])("resolves resistance $resistance to multiplier $expected", ({ resistance, expected }) => {
    expect(calculateDamageMultiplier(resistance)).toBeCloseTo(expected, 10);
  });

  it("resolves reduction-created negative resistance without the positive-resistance formula", () => {
    const effective = calculateEffectiveResistance(10, { flatReduction: 25 });
    expect(calculateDamageMultiplier(effective)).toBeCloseTo(1.1304347826086956, 10);
  });

  it.each([NaN, Infinity, -Infinity])("rejects non-finite resistance %s", (value) => {
    expect(() => calculateDamageMultiplier(value)).toThrow(RangeError);
  });
});
