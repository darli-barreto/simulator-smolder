# Sprint 3 — optimizador de builds

Implementado el **7 de octubre de 2026**, para Smolder en Grieta del Invocador,
parche **26.20**, sobre el catálogo versionado de 13 objetos del Sprint 2.
El usuario autorizó avanzar con la paridad de Practice Tool pendiente.
El resultado de DPS es una estimación analítica de Q y autoataques.

## Tareas

- [x] 3.1: `src/engine/optimizer/evaluator.ts`, daño de Q y DPS estimado con desglose por fuente.
- [x] 3.2: `src/engine/optimizer/combinatorics.ts`, generador de combinaciones legales.
- [x] 3.3: `src/engine/optimizer/optimizer.ts`, búsqueda exhaustiva y Top 5 por `BURST_Q` o `DPS`.

Contratos en `src/types/optimizer.ts`. El ejemplo `examples/optimize-smolder.ts`
se ejecuta con `bun run optimize`, sin abrir la interfaz.

## Métricas

### BURST_Q

Daño de un lanzamiento principal de Q, incluyendo quemadura completa de tres
segundos y procs disponibles. Usa las fórmulas y mitigación del Sprint 2.
El objetivo es un benchmark independiente de muerte, vida actual y ejecuciones:
se conserva el daño del lanzamiento completo para poder comparar las builds.
La vida máxima sigue determinando la quemadura y la vida adicional sigue
determinando Giant Slayer.

`itemState.spellbladeReady` y `itemState.energized` conservan sus valores por
defecto del Sprint 2: Spellblade disponible, Energizado sin carga. El exceso de
crítico se evita durante la generación de candidatos.

### DPS estimado

Se supone que Smolder lanza Q en cuanto está disponible y usa el tiempo restante
para atacar un objetivo estacionario. Cargas, estadísticas y resistencias son
constantes. Los autoataques usan daño crítico esperado, sin azar:

```text
Daño AA físico = AD total × [1 + C × (D − 1)] × multiplicador físico
AS efectiva = min(AS calculada, 3.0)
Tiempo Q aproximado = 0.25 × 0.638 / AS efectiva
Intervalo Q = max(enfriamiento Q, tiempo Q)
Q por segundo = 1 / intervalo Q
AA por segundo = AS efectiva × (1 − tiempo Q / intervalo Q) × uptime

DPS Q = daño del impacto de Q, sin procs / intervalo Q
DPS burn = daño de quemadura completa / max(3, intervalo Q)
DPS AA = daño AA esperado × AA por segundo
DPS total = DPS Q + DPS burn + DPS AA + DPS de procs
```

La reserva de tiempo de Q se aproxima a partir de su windup de autoataque.
El modelo usa tiempo continuo, no una secuencia de animaciones ni un conteo
entero de ataques. La quemadura se modela como un efecto que se refresca sobre
el mismo objetivo: no se suman quemaduras completas que se solapan.

Spellblade se activa con Q y se consume en el impacto principal. Su enfriamiento
es 1.5 segundos; el estimador permite un proc cada
`max(1, ceil(1.5 / intervalo Q))` lanzamientos. El estado inicial de enfriamiento
afecta al burst, no al régimen sostenido. `dpsOptions.spellbladeEnabled: false`
permite excluirlo del DPS.

La cadencia repetida de Energizado depende de ataques y movimiento. Se puede
proporcionar `dpsOptions.energizedProcIntervalSeconds`, una duración positiva
obtenida de la rotación deseada. Sin ese valor, el DPS no incluye recargas de
Energizado; una carga inicial todavía puede contribuir al burst. La frecuencia
configurada se limita al número de impactos de Q y AA disponibles.

`dpsOptions.autoAttackUptime` es una fracción entre 0 y 1, con valor inicial 1;
permite representar tiempo de ataque reducido sin modificar la cadencia de Q.
La estimación excluye W/E/R, maná, regeneración, escudos, crecimiento de cargas,
ejecuciones y otras fuentes fuera del catálogo/modelo. No equivale al contador
de DPS del cliente ni a una recomendación general de partida.

### Fuentes de tiempos y reglas

- [Registro de Smolder 16.20](https://raw.communitydragon.org/16.20/game/data/characters/smolder/smolder.bin.json), extraído del juego por CommunityDragon: `CharacterRecords/Root.basicAttack.mAttackCastTime = 0.25`; Q contiene `mUseAutoattackCastTimeData`. De estos datos se deriva la aproximación de windup usada arriba.
- [Notas oficiales de 2025.S1.3](https://www.leagueoflegends.com/en-us/news/game-updates/patch-2025-s1-3-notes/): límite publicado de AS elevado de 2.5 a 3.0; se usa 3.0 para el benchmark sin excepciones de runas o modos.
- [Registro de objetos 16.20](https://raw.communitydragon.org/16.20/game/items.cdtb.bin.json): `Items/3508.mDataValues.SpellbladeCooldown = 1.5`.
- `docs/SPRINT_1.md` y `docs/SPRINT_2.md`: fuentes de estadísticas, crítico, habilidades y objetos.

## Combinaciones y clasificación

`generateItemCombinations` produce combinaciones sin permutaciones ni duplicados,
en orden estable de IDs. Poda ramas incompatibles antes de evaluarlas:

- Entre cero y seis objetos, con botas incluidas en esos seis slots.
- Hasta un objeto de Último Susurro y un par de botas.
- Crítico total menor o igual a 100%, contando `bonusStats.criticalStrikeChance`.
- Objetos obligatorios incluidos y coste total menor o igual al presupuesto.

El catálogo completo es el pool por defecto. Se puede limitar con `itemPool`.
`requiredItems` permite fijar botas u otros objetos. `maxGold` es opcional.
`itemCount` vale seis por defecto; no se rellenan slots con objetos ficticios.

El optimizador visita todas las combinaciones factibles y conserva solo cinco
resultados en memoria. Ordena por puntuación descendente, coste ascendente y
IDs ascendentes. Devuelve estadísticas, desglose de daño/DPS, cadencias,
puntuación, rango y número de builds evaluadas. Si hay menos de cinco builds,
devuelve las disponibles; si no hay ninguna, devuelve una lista vacía.

La búsqueda obtiene el óptimo del **catálogo soportado y el modelo configurado**.
No explora todos los objetos, runas o rotaciones del juego.

## Uso

```ts
import { optimizeBuild } from "@/engine/optimizer/optimizer";

const result = optimizeBuild({
  champion: "smolder",
  level: 18,
  stacks: 225,
  targetDummy: { maxHealth: 3000, armor: 100, magicResistance: 100, bonusHealth: 0 },
  metric: "DPS", // o "BURST_Q"
  itemCount: 6,
  requiredItems: ["3158"], // botas dentro del inventario
  maxGold: 18000,
});

// result.topBuilds[0]?.items
// result.topBuilds[0]?.estimatedDps
// result.evaluatedCount
```

## Resultados reproducibles

`bun run optimize`, nivel 18, 225 cargas, objetivo 3000/100/100 con cero vida
adicional, seis objetos, sin botas obligatorias ni presupuesto: **565 builds
legales evaluadas** para cada métrica.

| Métrica | Mejor build (IDs) | Daño Q | DPS estimado | Oro |
| --- | --- | ---: | ---: | ---: |
| BURST_Q | 3031, 3036, 3072, 3142, 3508, 6676 | 1287.62 | 1193.63 | 19050 |
| DPS | 3031, 3046, 3142, 3508, 6676, 6694 | 1103.94 | 1303.43 | 18000 |

Con la build de referencia del Sprint 2 (Filo Infinito + LDR + Segador):
`burstQ = 639.7201704545455`, `estimatedDps = 530.8883287272727`.
El ejemplo imprime los cinco resultados de cada métrica. Solo la presentación
redondea; el motor y la clasificación conservan precisión completa.

## Verificación

- `bun run test --run`: **145/145 pruebas**, siete archivos.
- `bun run lint`: correcto.
- `bun run build`: compilación y TypeScript estricto correctos.
- `bun run optimize`: ejemplo ejecutado correctamente con el Top 5 de ambas métricas.
- Motor independiente de React/DOM/Next.js y sin `any`; sin nuevas dependencias.

Las pruebas verifican combinaciones sin duplicados, restricciones, presupuestos,
crítico, entradas inválidas, crítico medio de AA, reserva de tiempo, límite de
AS, refresco de quemadura, cooldown de Spellblade y Energizado configurable.
El Top 5 se contrasta con una enumeración exhaustiva independiente; también se
verifica un caso donde BURST_Q y DPS eligen builds distintas.

La medición de Practice Tool sigue pendiente por acuerdo del usuario. La
verificación realizada es de implementación, regresiones numéricas y consistencia
del modelo declarado.
