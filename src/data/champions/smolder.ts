import type { ChampionBaseStats } from "../../types/engine";

/**
 * Summoner's Rift, patch 26.20 (Data Dragon 16.20.1), checked 2026-10-07.
 * AD growth and AS ratio were cross-checked against the 16.20 game record.
 * Decimal coefficients are kept unrounded during calculation.
 * Sources and precision policy: docs/SPRINT_1.md.
 */
export const SMOLDER_BASE_STATS = {
  health: { base: 575, growth: 100 },
  armor: { base: 24, growth: 4 },
  magicResistance: { base: 33, growth: 1.1 },
  attackDamage: { base: 58, growth: 2.3 },
  attackSpeed: { base: 0.638, ratio: 0.638, growth: 0.04 },
} as const satisfies ChampionBaseStats;
