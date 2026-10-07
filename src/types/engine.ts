/** A base value and its growth coefficient, not a linear gain per level. */
export interface ScalingStat {
  readonly base: number;
  readonly growth: number;
}

export interface ChampionBaseStats {
  readonly health: ScalingStat;
  readonly armor: ScalingStat;
  readonly magicResistance: ScalingStat;
  readonly attackDamage: ScalingStat;
  readonly attackSpeed: {
    /** Attacks per second at level 1. */
    readonly base: number;
    /** Champion-specific coefficient for bonus attack speed. */
    readonly ratio: number;
    /** Fraction per growth coefficient: 0.04 means 4%. */
    readonly growth: number;
  };
}

/** Level-scaled stats before item, rune, or temporary bonuses. */
export interface ChampionStats {
  readonly health: number;
  readonly armor: number;
  readonly magicResistance: number;
  readonly attackDamage: number;
  /** Fraction: 0.68 means 68% bonus attack speed. */
  readonly bonusAttackSpeed: number;
  /** Attacks per second, before caps or attack speed slows. */
  readonly attackSpeed: number;
}

/** Damage amounts after mitigation, expressed in health points. */
export interface DamageBreakdown {
  readonly physicalDamage: number;
  readonly magicDamage: number;
  readonly trueDamage: number;
  readonly totalDamage: number;
}

export interface DummyTarget {
  readonly maxHealth: number;
  readonly armor: number;
  readonly magicResistance: number;
}

/**
 * Effects on one resistance channel. Omitted values default to zero.
 * Percentage fields are already aggregated fractions in [0, 1].
 * Armor uses lethality as flatPenetration (1:1 at every level);
 * magic resistance uses flat magic penetration in that field.
 */
export interface MitigationProfile {
  readonly flatReduction?: number;
  readonly percentReduction?: number;
  readonly percentPenetration?: number;
  readonly flatPenetration?: number;
}
