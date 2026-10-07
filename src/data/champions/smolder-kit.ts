/** Canonical decimal coefficients cross-checked against the 16.20 game record. */
export const SMOLDER_KIT = {
  baseCriticalStrikeMultiplier: 2,
  // Game record: basicAttack.mAttackCastTime; Q uses autoattack cast-time data.
  basicAttack: { baseCastTimeSeconds: 0.25 },
  q: {
    baseDamage: [60, 70, 80, 90, 100], bonusADRatio: 1.3, critRatio: 0.75,
    stackRatio: 0.25, stackCritRatio: 1.4, thresholds: [25, 125, 225],
    secondaryDamageMultiplier: 0.5, secondaryBase: 2, secondaryStackRatio: 0.008,
    burnBonusADRatio: 0.00025, burnStackRatio: 0.00005, burnDuration: 3,
    executeThreshold: 0.065, cooldown: [5.5, 5, 4.5, 4, 3.5],
  },
  w: {
    globDamage: [60, 70, 80, 90, 100], globBonusADRatio: 0.6,
    explosionDamage: [10, 35, 60, 85, 110], explosionBonusADRatio: 0.5,
    explosionAPRatio: 0.8, stackRatio: 0.55, subsequentMultiplier: 0.75,
    cooldown: [14, 13, 12, 11, 10],
  },
  e: {
    boltDamage: [10, 15, 20, 25, 30], totalADRatio: 0.3,
    stackRatio: 0.08, stackCritRatio: 0.75, baseBolts: 5, stacksPerBolt: 100,
    cooldown: [24, 22, 20, 18, 16],
  },
  r: {
    baseDamage: [150, 250, 350], bonusADRatio: 1, apRatio: 1, centerMultiplier: 1.5,
    baseHealing: [100, 175, 250], healBonusADRatio: 0.75, healAPRatio: 0.75,
    cooldown: [120, 110, 100],
  },
} as const;
