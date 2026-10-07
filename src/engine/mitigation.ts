import type { MitigationProfile } from "../types/engine";
import { assertFiniteNumber, assertFraction, assertNonNegativeNumber } from "./validation";

/** Resolves either armor or MR; pass a separate profile for each channel. */
export function calculateEffectiveResistance(
  resistance: number,
  profile: MitigationProfile = {},
): number {
  const {
    flatReduction = 0,
    percentReduction = 0,
    percentPenetration = 0,
    flatPenetration = 0,
  } = profile;

  assertFiniteNumber(resistance, "resistance");
  assertNonNegativeNumber(flatReduction, "flatReduction");
  assertFraction(percentReduction, "percentReduction");
  assertFraction(percentPenetration, "percentPenetration");
  assertNonNegativeNumber(flatPenetration, "flatPenetration");

  // Flat reduction can make resistance negative. Other effects are then ignored.
  const afterFlatReduction = resistance - flatReduction;
  if (afterFlatReduction <= 0) {
    return afterFlatReduction;
  }

  const afterPercentReduction = afterFlatReduction * (1 - percentReduction);
  const afterPercentPenetration = afterPercentReduction * (1 - percentPenetration);

  // Penetration ignores resistance but cannot make positive resistance negative.
  return Math.max(0, afterPercentPenetration - flatPenetration);
}

/** Negative resistance amplifies damage and uses its own branch. */
export function calculateDamageMultiplier(effectiveResistance: number): number {
  assertFiniteNumber(effectiveResistance, "effectiveResistance");
  return effectiveResistance >= 0
    ? 100 / (100 + effectiveResistance)
    : 2 - 100 / (100 - effectiveResistance);
}
