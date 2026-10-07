# Sprint 2 — kit de Smolder y objetos

Implementación y verificación automatizada realizadas el **7 de octubre de
2026**, para **Grieta del Invocador, parche 26.20 / Data Dragon 16.20.1**.
La comprobación empírica en Practice Tool sigue pendiente; el Sprint 3 no se ha
iniciado.

## Tareas

- [x] 2.1: catálogo tipado en `src/data/items.ts` y contratos en `src/types/items.ts`.
- [x] 2.2: pasiva, Q/W/E/R y tiers en `src/engine/champions/smolder.ts`; coeficientes en `src/data/champions/smolder-kit.ts`.
- [x] 2.3: configuración, estadísticas de build, mitigación, procs y desglose por instancia en `src/engine/simulator.ts`.
- [x] 2.4: regresión integrada actualizada en `tests/smolder_damage.test.ts`, con casos adicionales de habilidades, ejecución y entradas inválidas.

## Fuentes y actualización de D1/D2

La petición del usuario de usar el último parche prevalece sobre los valores
históricos del plan. Se fijaron datos versionados para reproducir resultados:

- [Notas oficiales de 26.20](https://www.leagueoflegends.com/en-us/news/game-updates/league-of-legends-patch-26-20-notes/): cambios de escalado crítico de la pasiva en Q/E y de curación de R.
- [Notas oficiales de 26.1](https://www.leagueoflegends.com/en-us/news/game-updates/patch-26-1-notes/): crítico base de 200%, cambios de Filo Infinito y regreso de Spellblade en Segador de Esencia.
- [Objetos de Riot, Data Dragon 16.20.1](https://ddragon.leagueoflegends.com/cdn/16.20.1/data/en_US/item.json): estadísticas, precios y descripción de Giant Slayer.
- [Registro de Smolder del juego 16.20](https://raw.communitydragon.org/16.20/game/data/characters/smolder/smolder.bin.json), extraído por CommunityDragon: `DataValues` y `mSpellCalculations` de Q/W/E/R/P. Q utiliza AD adicional (`mStatFormula: 2`), E utiliza AD total y R utiliza AD adicional.
- [Registro de objetos del juego 16.20](https://raw.communitydragon.org/16.20/game/items.cdtb.bin.json), extraído por CommunityDragon: `Items/3508.mItemCalculations.SpellbladeDamage`, `Items/3036.mDataValues` y procs de Coleccionista/RFC. Spellblade utiliza AD base (`mStatFormula: 1`).

La wiki indicada por el usuario bloqueó la lectura automatizada. Los datos
anteriores corresponden al modo indicado, sin modificadores de Swiftplay,
ARAM u otros modos. Los coeficientes binarios se normalizaron a sus decimales
publicados; el motor conserva precisión sin redondear resultados intermedios.

## Fórmulas implementadas

`S` = cargas; `B` = AD adicional; `A` = AD total; `P` = AP; `C` = probabilidad
de crítico; `D` = multiplicador crítico total. `C` se expresa como fracción y
se limita a 1. `D = 2 + bonus`, incluyendo 0.3 de Filo Infinito.

| Instancia | Daño bruto |
| --- | --- |
| Q físico | `(base[r] + 1.3B) × [1 + 0.75C(D − 1)]` |
| Q pasiva, mágico | `0.25S × [1 + 1.4C(D − 1)]` |
| Q quemadura, verdadero total de 3 s | `(0.00025B + 0.00005S) × HP máximo` |
| W glóbulo, físico | `base[r] + 0.6B` |
| W explosión, físico | `baseExplosión[r] + 0.5B + 0.8P` |
| W explosión, mágico | `0.55S` |
| E por proyectil, físico | `base[r] + 0.3A` |
| E por proyectil, mágico | `0.08S × [1 + 0.75C(D − 1)]` |
| R físico | `base[r] + B + P`; centro `× 1.5` |
| R curación propia | `curaciónBase[r] + 0.75B + 0.75P` |

Q desbloquea área a 25 cargas, proyectiles secundarios a 125 y quemadura/
ejecución a 225. El simulador calcula un impacto elegido: principal, área o
secundario. El secundario inflige 50% del componente físico y mágico; la
quemadura permanece completa. Solo el principal aplica los procs al impacto.
La expresión de cantidad de secundarios `2 + 0.008S` se expone sin atribuirle
un redondeo ni sumar impactos automáticamente al mismo objetivo.

W acepta el impacto del glóbulo y de cero a cinco explosiones; cada explosión
posterior usa 75% del daño de la anterior. E dispone de `5 + floor(S / 100)`
proyectiles, con cantidad de impactos configurable. R distingue centro/borde y
reporta su curación aparte del daño. Los enfriamientos usan
`base × 100 / (100 + AH)`.

## Catálogo y procs

El catálogo contiene Filo Infinito, LDR, Segador de Esencia, Coleccionista,
RFC, Sanguinaria, Arcoescudo, Bailarín Espectral, Recordatorio Mortal, Serylda,
Youmuu y dos botas. Admite hasta seis slots, incluidos slots vacíos y botas;
rechaza duplicados y combinaciones incompatibles de Último Susurro o botas.
Este catálogo es el conjunto soportado, no todos los objetos del juego.

Procs ofensivos modelados:

- Segador: `1.25 × AD base + 50C` físico, incluido en Q principal sin multiplicarlo por el factor crítico de Q. Disponible por defecto; `spellbladeReady: false` lo desactiva.
- LDR: amplificación física/mágica de hasta 15%, alcanzada con 1500 de vida adicional del objetivo. `target.bonusHealth` es explícito y vale 0 por defecto. El daño verdadero se conserva.
- RFC: 40 mágico en Q principal con `energized: true`; sin carga por defecto.
- Coleccionista: ejecución independiente por debajo de 5% de HP máximo.

La vida máxima no permite inferir la vida adicional de un objetivo. Tampoco
se simulan el robo de vida, escudos defensivos, movimiento o heridas graves,
que no alteran el daño de este lanzamiento contra el objetivo definido.

## Regresión integrada del parche actual

Smolder nivel 18, 225 cargas, Q5 principal, Filo Infinito + LDR + Segador,
objetivo a vida completa de 3000 HP / 100 armadura / 100 MR, **0 vida
adicional**, Spellblade disponible, sin otros bonos ni efectos:

```text
AD base = 97.1; AD adicional = 160; AD total = 257.1
C = 0.75; D = 2.3; AH = 20; armadura efectiva = 65
Q físico bruto = (100 + 1.3 × 160) × 1.73125 = 533.225
Spellblade bruto = 1.25 × 97.1 + 50 × 0.75 = 158.875
Q mágico bruto = 225 × 0.25 × 2.365 = 133.03125
Quemadura verdadera = 3000 × (0.00025 × 160 + 0.00005 × 225) = 153.75
```

| Componente mitigado | Daño |
| --- | ---: |
| Físico, incluyendo Spellblade | 419.45454545454544 |
| Mágico | 66.515625 |
| Verdadero | 153.75 |
| **Total** | **639.7201704545455** |

Sin Spellblade, el total es **543.4322916666667**. El resultado histórico de
D1, `603.39`, usa AD base 99.1; D2 lo corrige a 97.1 y `601.28`. Ambos usan
habilidades y objetos anteriores. Se conserva esta explicación y se valida
el parche actual; no se ajustan coeficientes para forzar los valores antiguos.

## Uso

```ts
import { simulateSmolderDamage } from "@/engine/simulator";

const result = simulateSmolderDamage({
  level: 18,
  stacks: 225,
  items: ["3031", "3036", "3508", null, null, null],
  target: { maxHealth: 3000, armor: 100, magicResistance: 100, bonusHealth: 0 },
  cast: { ability: "Q", rank: 5 },
  itemState: { spellbladeReady: true },
});

// result.totalDamage ≈ 639.7201704545455
// result.instances: impacto de Q con Spellblade, seguido de quemadura total
```

Cada instancia contiene daño bruto/mitigado, procs desglosados y vida antes/
después. Los procs ya están incluidos en el daño del impacto: no deben sumarse
otra vez. `totalDamage` conserva el exceso de daño del impacto mortal;
`damageAppliedToHealth` limita la pérdida a la vida disponible.

La ejecución de Smolder exige 225 cargas, quemadura activa y vida estrictamente
menor a `0.065 × HP máximo` tras daño de Smolder. Se puede indicar una
quemadura previa para W/E/R. `canBeExecuted: false` permite medir daño sin
ejecuciones. Una ejecución se registra como daño verdadero igual a la vida
restante y cancela impactos posteriores.

## Verificación y límites

- `bun run test --run`: **119/119 pruebas**, 4 archivos.
- `bun run lint`: correcto.
- `bun run build`: compilación, TypeScript estricto y generación de páginas correctos.
- Motor sin `any`, React, DOM ni Next.js; sin nuevas dependencias.

Las regresiones numéricas usan tolerancias más pequeñas que 0.01. Se verifican
tiers, escalados, procs, resistencias por canal, umbrales estrictos, muerte,
restricciones de inventario y rechazo de entradas inválidas.

Es un cálculo de un lanzamiento contra un objetivo de tipo campeón, sin
regeneración, escudos, distancia o cronología de combate. La quemadura de Q se
agrupa en una instancia de tres segundos; no reproduce sus ticks ni el instante
exacto de ejecución durante la quemadura. Los impactos efectivos de W/E y el
tipo de impacto de Q son entradas del cálculo.

Para cumplir la paridad empírica de la DoD de D1 falta una medición de Practice
Tool 26.20 con la configuración anterior, anotando vida adicional, disponibilidad
de Spellblade y ausencia de otros bonos. Las pruebas automatizadas verifican
las fórmulas y los datos consultados; no sustituyen esa medición.
