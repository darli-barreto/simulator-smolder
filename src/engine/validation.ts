/** Internal numeric guards shared by the pure engine modules. */
export function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite.`);
  }
}

export function assertNonNegativeNumber(value: number, name: string): void {
  assertFiniteNumber(value, name);
  if (value < 0) {
    throw new RangeError(`${name} must be non-negative.`);
  }
}

export function assertFraction(value: number, name: string): void {
  assertNonNegativeNumber(value, name);
  if (value > 1) {
    throw new RangeError(`${name} must be a fraction between 0 and 1.`);
  }
}

export function assertIntegerInRange(value: number, name: string, minimum: number, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
}
