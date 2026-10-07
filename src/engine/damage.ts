import type { DamageBreakdown } from "../types/engine";

export function damageBreakdown(physicalDamage = 0, magicDamage = 0, trueDamage = 0): DamageBreakdown {
  return { physicalDamage, magicDamage, trueDamage, totalDamage: physicalDamage + magicDamage + trueDamage };
}

export function sumDamage(parts: readonly DamageBreakdown[]): DamageBreakdown {
  return damageBreakdown(
    parts.reduce((total, part) => total + part.physicalDamage, 0),
    parts.reduce((total, part) => total + part.magicDamage, 0),
    parts.reduce((total, part) => total + part.trueDamage, 0),
  );
}
