# Sprint 1 — motor matemático base

Verificado el 7 de octubre de 2026 para Grieta del Invocador, parche **26.20**.
Versión de Data Dragon consultada: **16.20.1**. Los datos están fijados a esa
versión para que los cálculos y las pruebas sean reproducibles.

## Tareas del plan

- [x] 1.1: `ChampionStats`, `DamageBreakdown`, `DummyTarget` y `MitigationProfile` en `src/types/engine.ts`.
- [x] 1.2: curva de crecimiento, velocidad de ataque y estadísticas por nivel en `src/engine/stats.ts`.
- [x] 1.3: orden de reducción/penetración y multiplicador de daño en `src/engine/mitigation.ts`.
- [x] 1.4: vectores D2 en `tests/stats.test.ts`, complementados con `tests/mitigation.test.ts`.

## Datos y fuentes

| Estadística de Smolder | Base | Crecimiento |
| --- | ---: | ---: |
| Vida | 575 | 100 |
| Armadura | 24 | 4 |
| Resistencia mágica | 33 | 1.1 |
| AD | 58 | 2.3 |
| Velocidad de ataque | 0.638 ataques/s | 4% |

El ratio de velocidad de ataque de Smolder es 0.638. El porcentaje de AS se
representa como fracción: 4% = 0.04.

Fuentes consultadas:

- [Versiones publicadas por Riot](https://ddragon.leagueoflegends.com/api/versions.json).
- [Smolder en Data Dragon 16.20.1](https://ddragon.leagueoflegends.com/cdn/16.20.1/data/en_US/champion/Smolder.json): vida, armadura, MR, AD base y AS.
- [Archivo del juego 16.20, extraído por CommunityDragon](https://raw.communitydragon.org/16.20/game/data/characters/smolder/smolder.bin.json): registro `Characters/Smolder/CharacterRecords/Root`, campos `damagePerLevelModifiable`, `attackSpeedModifiable` y `attackSpeedRatioModifiable`.
- [Notas oficiales de 26.20](https://www.leagueoflegends.com/en-us/news/game-updates/league-of-legends-patch-26-20-notes/): cambios de pasiva y curación de R de Smolder; sin cambios de estadísticas base publicados.
- [Notas oficiales de 14.1](https://www.leagueoflegends.com/en-us/news/game-updates/patch-14-1-notes/): letalidad equivalente a penetración plana 1:1 en todos los niveles.
- D2.txt aportado por el usuario: curva polinómica y vectores de referencia.
- [Reglas de penetración](https://leagueoflegends.fandom.com/wiki/Armor_penetration) y [resistencias negativas](https://leagueoflegends.fandom.com/zh/wiki/%E6%8A%A4%E7%94%B2?variant=zh-hant): referencia de mecánicas para los casos extremos.

La [wiki indicada por el usuario](https://wiki.leagueoflegends.com/en-us/Smolder#Swiftplay)
bloqueó la lectura automatizada. Se contrastaron los valores con Riot y con el
archivo del juego. El perfil implementado corresponde a Grieta del Invocador;
las variantes de modo requieren su propio perfil.

**Discrepancia de Data Dragon:** `attackdamageperlevel` vale 0 en su JSON de
16.20.1. El registro del juego contiene `damagePerLevelModifiable.baseValue =
2.299999952316284`, consistente con el 2.3 de D2. Se conserva 2.3 como
coeficiente decimal. AS y ratio contienen `0.6380000114440918`, normalizados a
0.638. Estas diferencias de representación son menores a 0.000001 en los
vectores de niveles 1–18; los resultados intermedios se mantienen sin redondeo.

## Reglas del motor

`calculateStatAtLevel(base, growth, level)` acepta niveles enteros de 1 a 18,
según el alcance del plan, y calcula:

```text
base + growth × (level − 1) × [0.7025 + 0.0175 × (level − 1)]
```

`calculateAttackSpeed(base, bonus, ratio = base)` calcula `base + ratio × bonus`.
La función devuelve AS antes de límites, ralentizaciones y excepciones de
campeón. `calculateChampionStats` devuelve las estadísticas por nivel antes de
los objetos, runas y efectos temporales.

`calculateEffectiveResistance(resistance, profile)` procesa un canal de
resistencia con este orden:

1. Reducción plana.
2. Reducción porcentual.
3. Penetración porcentual.
4. Penetración plana: letalidad para armadura o penetración mágica para MR.

Los porcentajes son fracciones entre 0 y 1; los campos omitidos valen 0. El
perfil recibe porcentajes ya agregados: las fuentes que acumulan
multiplicativamente deben resolverse como `1 − producto(1 − porcentaje)`.
Cada canal recibe su propio perfil para evitar aplicar letalidad a MR.

**Corrección al caso extremo de D2:** su `max(0, ...)` global borra resistencias
negativas causadas por reducción plana. El motor conserva esos valores e
ignora los efectos porcentuales y la penetración cuando el valor reducido es
menor o igual a cero. La penetración aplicada a una resistencia positiva tiene
un mínimo efectivo de cero.

`calculateDamageMultiplier(effectiveResistance)` usa:

```text
R ≥ 0: 100 / (100 + R)
R < 0: 2 − 100 / (100 − R)
```

Las entradas inválidas producen `RangeError`. El motor usa únicamente
TypeScript y funciones numéricas, con ejecución de las pruebas en entorno Node.

## Verificación

- `bun run test --run`: **69/69 pruebas**, 2 archivos.
- `bun run lint`: correcto.
- `bun run build`: compilación, comprobación TypeScript y generación de páginas correctas.
- `strict: true`; sin `any` ni dependencias de React, DOM o Next.js en el motor.

Los vectores publicados en D2 se validan con tolerancia menor a 0.01; las
pruebas adicionales verifican precisión sin redondeo, ratio de AS independiente,
orden de operaciones, resistencia cero/negativa y rechazo de entradas inválidas.
La verificación realizada es matemática y contra los datos consultados. La
paridad empírica con Practice Tool del parche 26.20 requiere capturas o
mediciones de esa versión.

Para Sprint 2, las fórmulas de habilidades y crítico de D2 deben contrastarse de
nuevo: 26.20 modifica la pasiva de Smolder. El visor 3D pertenece a Sprint 4.
