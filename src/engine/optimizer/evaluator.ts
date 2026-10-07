import { SMOLDER_BASE_STATS } from "../../data/champions/smolder";
import { SMOLDER_KIT } from "../../data/champions/smolder-kit";
import { getItem } from "../../data/items";
import type { DamageBreakdown } from "../../types/engine";
import type { BuildEvaluation, BuildEvaluationConfig } from "../../types/optimizer";
import { damageBreakdown, sumDamage } from "../damage";
import { simulateSmolderDamage } from "../simulator";
import { assertFiniteNumber, assertFraction, assertNonNegativeNumber } from "../validation";

/** Published Summoner's Rift cap, raised to 3.0 in patch 2025.S1.3. */
export const BENCHMARK_ATTACK_SPEED_CAP = 3;

/** Analytical steady-state Q + autoattack estimate; see docs/SPRINT_3.md. */
export function evaluateSmolderBuild(config: BuildEvaluationConfig): BuildEvaluation {
  const uptime = config.dpsOptions?.autoAttackUptime ?? 1;
  assertFraction(uptime, "autoAttackUptime");
  const energizedInterval = config.dpsOptions?.energizedProcIntervalSeconds;
  if (energizedInterval !== undefined) {
    assertNonNegativeNumber(energizedInterval, "energizedProcIntervalSeconds");
    if (energizedInterval === 0) throw new RangeError("energizedProcIntervalSeconds must be positive.");
  }

  const simulation = simulateSmolderDamage({
    level: config.level, stacks: config.stacks, items: config.items,
    target: { ...config.targetDummy, currentHealth: config.targetDummy.maxHealth, canBeExecuted: false },
    cast: { ability: "Q", rank: config.qRank ?? Math.min(5, Math.ceil(config.level / 2)) },
    bonusStats: config.bonusStats, mitigation: config.mitigation, itemState: config.itemState,
  });
  const { stats, ability, physicalDamageMultiplier, magicDamageMultiplier } = simulation;
  const qRaw = ability.instances[0].rawDamage;
  const qDamage = damageBreakdown(qRaw.physicalDamage * physicalDamageMultiplier, qRaw.magicDamage * magicDamageMultiplier);
  const burnDamage = ability.instances.find((hit) => hit.source === "Q_BURN")?.rawDamage ?? damageBreakdown();
  const burstDamage = sumDamage([qDamage, burnDamage, ...simulation.instances[0].itemProcs.map((proc) => proc.damage)]);

  const attackSpeed = Math.min(BENCHMARK_ATTACK_SPEED_CAP, stats.attackSpeed);
  // Q uses Smolder's attack windup. The continuous estimate reserves that time.
  const qCastTimeSeconds = SMOLDER_KIT.basicAttack.baseCastTimeSeconds * SMOLDER_BASE_STATS.attackSpeed.base / attackSpeed;
  const qInterval = Math.max(ability.cooldownSeconds, qCastTimeSeconds);
  const qCastsPerSecond = 1 / qInterval;
  const autoAttacksPerSecond = attackSpeed * Math.max(0, 1 - qCastTimeSeconds / qInterval) * uptime;
  const autoAttackDamage = damageBreakdown(stats.attackDamage * (1 + stats.criticalStrikeChance * (stats.criticalStrikeMultiplier - 1)) * physicalDamageMultiplier);

  let spellbladeProcsPerSecond = 0;
  let energizedProcsPerSecond = 0;
  const procDps: DamageBreakdown[] = [];
  for (const id of config.items) {
    for (const effect of getItem(id).effects ?? []) {
      if (effect.kind === "spellblade" && (config.dpsOptions?.spellbladeEnabled ?? true)) {
        const castsPerProc = Math.max(1, Math.ceil(effect.cooldownSeconds / qInterval - 1e-12));
        const rate = qCastsPerSecond / castsPerProc;
        spellbladeProcsPerSecond += rate;
        procDps.push(damageBreakdown((effect.baseADRatio * stats.baseAttackDamage + effect.critChanceDamage * stats.criticalStrikeChance) * physicalDamageMultiplier * rate));
      }
      if (effect.kind === "energized" && energizedInterval !== undefined) {
        const rate = Math.min(1 / energizedInterval, autoAttacksPerSecond + qCastsPerSecond);
        energizedProcsPerSecond += rate;
        procDps.push(damageBreakdown(0, effect.magicDamage * magicDamageMultiplier * rate));
      }
    }
  }
  const scale = (damage: DamageBreakdown, rate: number): DamageBreakdown => damageBreakdown(
    damage.physicalDamage * rate, damage.magicDamage * rate, damage.trueDamage * rate,
  );
  const q = scale(qDamage, qCastsPerSecond);
  // Refreshing the same target's burn cannot stack full burns every Q.
  const burn = scale(burnDamage, 1 / Math.max(SMOLDER_KIT.q.burnDuration, qInterval));
  const autoAttacks = scale(autoAttackDamage, autoAttacksPerSecond);
  const itemProcs = sumDamage(procDps);
  const total = sumDamage([q, burn, autoAttacks, itemProcs]);
  assertFiniteNumber(burstDamage.totalDamage, "burstQ");
  assertFiniteNumber(total.totalDamage, "estimatedDps");

  return {
    items: [...config.items].sort(), goldCost: config.items.reduce((gold, id) => gold + getItem(id).goldCost, 0),
    stats, burstDamage, burstQ: burstDamage.totalDamage, estimatedDps: total.totalDamage,
    dps: { q, burn, autoAttacks, itemProcs, total },
    qCooldownSeconds: ability.cooldownSeconds, qCastTimeSeconds, qCastsPerSecond,
    autoAttacksPerSecond, autoAttackDamage, spellbladeProcsPerSecond, energizedProcsPerSecond,
  };
}
