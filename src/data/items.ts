import type { ItemDefinition, ItemId } from "../types/items";

/** Summoner's Rift snapshot: Data Dragon 16.20.1 and game/items.cdtb.bin.json. */
export const ITEM_DATA_VERSION = { patch: "26.20", dataDragon: "16.20.1", verifiedOn: "2026-10-07" } as const;

export const ITEMS = {
  "3031": { id: "3031", name: "Filo Infinito", goldCost: 3500,
    stats: { attackDamage: 75, criticalStrikeChance: 0.25, criticalStrikeDamage: 0.3 } },
  "3036": { id: "3036", name: "Recuerdos de Lord Dominik", goldCost: 3300,
    stats: { attackDamage: 35, criticalStrikeChance: 0.25, armorPenetration: 0.35 }, uniqueGroup: "last-whisper",
    effects: [{ kind: "giant-slayer", maxBonusDamage: 0.15, maxBonusHealth: 1500 }] },
  "3508": { id: "3508", name: "Segador de Esencia", goldCost: 3050,
    stats: { attackDamage: 50, criticalStrikeChance: 0.25, abilityHaste: 20 },
    effects: [{ kind: "spellblade", baseADRatio: 1.25, critChanceDamage: 50 }] },
  "6676": { id: "6676", name: "El Coleccionista", goldCost: 3000,
    stats: { attackDamage: 50, criticalStrikeChance: 0.25, lethality: 10 },
    effects: [{ kind: "execute", threshold: 0.05 }] },
  "3094": { id: "3094", name: "Cañón de Fuego Rápido", goldCost: 2650,
    stats: { attackSpeed: 0.35, criticalStrikeChance: 0.25 },
    effects: [{ kind: "energized", magicDamage: 40 }] },
  "3072": { id: "3072", name: "La Sanguinaria", goldCost: 3400, stats: { attackDamage: 80 } },
  "6673": { id: "6673", name: "Arcoescudo Inmortal", goldCost: 3000,
    stats: { attackDamage: 55, criticalStrikeChance: 0.25 } },
  "3046": { id: "3046", name: "Bailarín Espectral", goldCost: 2650,
    stats: { attackSpeed: 0.65, criticalStrikeChance: 0.25 } },
  "3033": { id: "3033", name: "Recordatorio Mortal", goldCost: 3000,
    stats: { attackDamage: 35, criticalStrikeChance: 0.25, armorPenetration: 0.3 }, uniqueGroup: "last-whisper" },
  "6694": { id: "6694", name: "Rencor de Serylda", goldCost: 3000,
    stats: { attackDamage: 45, armorPenetration: 0.35, abilityHaste: 15 }, uniqueGroup: "last-whisper" },
  "3142": { id: "3142", name: "Filo Fantasmal de Youmuu", goldCost: 2800,
    stats: { attackDamage: 55, lethality: 18 } },
  "3158": { id: "3158", name: "Botas Jonias de la Lucidez", goldCost: 900,
    stats: { abilityHaste: 10 }, uniqueGroup: "boots" },
  "3006": { id: "3006", name: "Grebas de Berserker", goldCost: 1100,
    stats: { attackSpeed: 0.3 }, uniqueGroup: "boots" },
} as const satisfies Record<ItemId, ItemDefinition>;

export function getItem(id: ItemId): ItemDefinition {
  if (!Object.hasOwn(ITEMS, id)) {
    throw new RangeError(`Unknown item ID: ${id}`);
  }
  return ITEMS[id];
}
