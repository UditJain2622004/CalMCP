/**
 * Unit conversion utilities.
 * Canonical internal units: kg, ml.
 */

// ── Weight ──────────────────────────────────────────────────

export function lbToKg(lb: number): number {
  return lb * 0.45359237;
}

export function kgToLb(kg: number): number {
  return kg / 0.45359237;
}

export function normalizeWeightToKg(value: number, unit: 'kg' | 'lb'): number {
  return unit === 'lb' ? lbToKg(value) : value;
}

export function displayWeight(kg: number, preferredUnit: 'kg' | 'lb'): string {
  if (preferredUnit === 'lb') {
    return `${kgToLb(kg).toFixed(1)} lb`;
  }
  return `${kg.toFixed(1)} kg`;
}

// ── Volume / Hydration ──────────────────────────────────────

export function litersToMl(l: number): number {
  return l * 1000;
}

export function mlToLiters(ml: number): number {
  return ml / 1000;
}

export function flOzToMl(flOz: number): number {
  return flOz * 29.5735;
}

export function mlToFlOz(ml: number): number {
  return ml / 29.5735;
}

export function cupsToMl(cups: number): number {
  return cups * 236.588;
}

export function normalizeWaterToMl(
  value: number,
  unit: 'ml' | 'l' | 'fl_oz' | 'cup',
): number {
  switch (unit) {
    case 'ml': return value;
    case 'l': return litersToMl(value);
    case 'fl_oz': return flOzToMl(value);
    case 'cup': return cupsToMl(value);
  }
}

export function displayWater(ml: number): string {
  if (ml >= 1000) {
    return `${(ml / 1000).toFixed(1)} L`;
  }
  return `${Math.round(ml)} ml`;
}

// ── BMI ─────────────────────────────────────────────────────

export function computeBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function bmiCategory(bmi: number): string {
  // Neutral descriptive categories — not prescriptive
  if (bmi < 18.5) return 'Below healthy range';
  if (bmi < 25) return 'Healthy range';
  if (bmi < 30) return 'Above healthy range';
  return 'Well above healthy range';
}

// ── Nutrition calorie check ──────────────────────────────────

/**
 * Checks if calories are reasonably close to 4P + 4C + 9F.
 * Returns difference in kcal. Positive means calories are higher than macros suggest.
 */
export function macroCalorieDeviation(
  caloriesKcal: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
): number {
  const macroCalories = proteinG * 4 + carbsG * 4 + fatG * 9;
  return caloriesKcal - macroCalories;
}

export const MACRO_DEVIATION_THRESHOLD_KCAL = 50;

// ── Nutrition rounding ───────────────────────────────────────

export function roundNutrition(value: number, decimals = 1): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}
