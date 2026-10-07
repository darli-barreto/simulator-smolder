export type ItemId =
  | "3031" | "3036" | "3508" | "6676" | "3094" | "3072" | "6673"
  | "3046" | "3033" | "6694" | "3142" | "3158" | "3006";

/** Percentages are fractions, and criticalStrikeDamage is an additive bonus. */
export interface ItemStats {
  readonly attackDamage?: number;
  readonly abilityPower?: number;
  readonly abilityHaste?: number;
  readonly attackSpeed?: number;
  readonly criticalStrikeChance?: number;
  readonly criticalStrikeDamage?: number;
  readonly armorPenetration?: number;
  readonly lethality?: number;
}

export type ItemEffect =
  | { readonly kind: "spellblade"; readonly baseADRatio: number; readonly critChanceDamage: number }
  | { readonly kind: "giant-slayer"; readonly maxBonusDamage: number; readonly maxBonusHealth: number }
  | { readonly kind: "energized"; readonly magicDamage: number }
  | { readonly kind: "execute"; readonly threshold: number };

export interface ItemDefinition {
  readonly id: ItemId;
  readonly name: string;
  readonly goldCost: number;
  readonly stats: ItemStats;
  readonly uniqueGroup?: "last-whisper" | "boots";
  readonly effects?: readonly ItemEffect[];
}
