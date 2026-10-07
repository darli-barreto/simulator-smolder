import { getItem } from "../src/data/items";
import { optimizeBuild } from "../src/engine/optimizer/optimizer";

const benchmark = {
  champion: "smolder", level: 18, stacks: 225,
  targetDummy: { maxHealth: 3000, armor: 100, magicResistance: 100, bonusHealth: 0 },
} as const;

for (const metric of ["BURST_Q", "DPS"] as const) {
  const result = optimizeBuild({ ...benchmark, metric });
  console.log(`\n${metric} | parche ${result.patch} | ${result.evaluatedCount} builds legales`);
  console.table(result.topBuilds.map((build) => ({
    Puesto: build.rank,
    Objetos: build.items.map((id) => getItem(id).name).join(" + "),
    Oro: build.goldCost,
    "Daño Q": build.burstQ.toFixed(2),
    "DPS estimado": build.estimatedDps.toFixed(2),
    "AD total": build.stats.attackDamage.toFixed(2),
    "Crítico %": (100 * build.stats.criticalStrikeChance).toFixed(0),
    "Q CD (s)": build.qCooldownSeconds.toFixed(3),
  })));
}
