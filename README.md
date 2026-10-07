# Smolder Build Optimizer

Aplicación Next.js con un motor matemático puro en TypeScript. Sprints 1–3 implementados y verificados con pruebas automatizadas para el parche 26.20. La paridad con una medición del cliente queda pendiente; el usuario autorizó continuar al Sprint 3 con esa comprobación pendiente.

## Desarrollo con Bun

```bash
bun install --frozen-lockfile
bun run dev
```

## Verificación

```bash
bun run test --run
bun run lint
bun run build
```

`bun run test` inicia Vitest en modo de observación. Usa `bun run test --run` para una ejecución completa; `bun test` invoca el corredor nativo de Bun.

## Motor

- `src/engine/stats.ts`: escalado de estadísticas, velocidad de ataque y enfriamientos.
- `src/engine/mitigation.ts`: reducción, penetración y multiplicadores de daño.
- `src/engine/build.ts`: agregación de estadísticas y restricciones de inventario.
- `src/engine/champions/smolder.ts`: Q/W/E/R, pasiva y tiers de cargas.
- `src/engine/simulator.ts`: daño por instancia, procs de objetos, vida restante y ejecución.
- `src/engine/optimizer/`: evaluación de Q/DPS estimado, combinaciones legales y Top 5 de builds.
- `src/data/champions/smolder.ts`: datos base versionados de Smolder.
- `src/data/champions/smolder-kit.ts`: coeficientes de habilidades del parche.
- `src/data/items.ts`: catálogo tipado de 13 objetos compatibles.
- `src/types/`: contratos del motor, objetos y simulación.
- `tests/`: pruebas unitarias en entorno Node.

Consulta [Sprint 1](docs/SPRINT_1.md), [Sprint 2](docs/SPRINT_2.md) y [Sprint 3](docs/SPRINT_3.md) para fuentes, fórmulas, ejemplos y resultados de verificación. El caso integrado actualizado de Q produce **639.72** de daño con Spellblade disponible y sin bonificación de Giant Slayer.

## Ejemplo del optimizador

```bash
bun run optimize
```

Imprime el Top 5 para daño de Q y DPS estimado, evaluando 565 builds legales de seis objetos del catálogo soportado. La función `optimizeBuild` permite limitar candidatos, presupuesto y objetos obligatorios. Las botas ocupan un slot y pueden fijarse con `requiredItems`.
