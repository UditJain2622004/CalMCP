import type { Nutrition, MealItem } from './meal.schema';

/**
 * Sums nutrition across multiple items.
 * This is the canonical total calculation — used by both UI and WebMCP tools.
 */
export function sumNutrition(items: Pick<MealItem, 'nutrition'>[]): Nutrition {
  const totals: Nutrition = {
    caloriesKcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  };

  for (const item of items) {
    const n = item.nutrition;
    totals.caloriesKcal += n.caloriesKcal;
    totals.proteinG += n.proteinG;
    totals.carbsG += n.carbsG;
    totals.fatG += n.fatG;
    if (n.fiberG !== undefined) totals.fiberG = (totals.fiberG ?? 0) + n.fiberG;
    if (n.sugarG !== undefined) totals.sugarG = (totals.sugarG ?? 0) + n.sugarG;
    if (n.sodiumMg !== undefined) totals.sodiumMg = (totals.sodiumMg ?? 0) + n.sodiumMg;
    if (n.saturatedFatG !== undefined) totals.saturatedFatG = (totals.saturatedFatG ?? 0) + n.saturatedFatG;
  }

  // Round to 1 decimal
  totals.caloriesKcal = Math.round(totals.caloriesKcal * 10) / 10;
  totals.proteinG = Math.round(totals.proteinG * 10) / 10;
  totals.carbsG = Math.round(totals.carbsG * 10) / 10;
  totals.fatG = Math.round(totals.fatG * 10) / 10;
  if (totals.fiberG !== undefined) totals.fiberG = Math.round(totals.fiberG * 10) / 10;
  if (totals.sugarG !== undefined) totals.sugarG = Math.round(totals.sugarG * 10) / 10;
  if (totals.sodiumMg !== undefined) totals.sodiumMg = Math.round(totals.sodiumMg);
  if (totals.saturatedFatG !== undefined) totals.saturatedFatG = Math.round(totals.saturatedFatG * 10) / 10;

  return totals;
}

/**
 * Adds two nutrition objects together.
 */
export function addNutrition(a: Nutrition, b: Nutrition): Nutrition {
  return sumNutrition([{ nutrition: a }, { nutrition: b }]);
}

/**
 * Creates an empty nutrition object with zero values.
 */
export function emptyNutrition(): Nutrition {
  return {
    caloriesKcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  };
}

/**
 * Checks for significant deviation between item calories and macro-derived calories.
 * Returns a warning string if significant, undefined if OK.
 */
export function checkMacroConsistency(
  caloriesKcal: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
  threshold = 50,
): string | undefined {
  const macroCalories = proteinG * 4 + carbsG * 4 + fatG * 9;
  const diff = Math.abs(caloriesKcal - macroCalories);
  if (diff > threshold) {
    return `Calorie count (${caloriesKcal} kcal) differs from macros by ${Math.round(diff)} kcal (4P+4C+9F = ${Math.round(macroCalories)} kcal). Small differences are normal due to fiber rounding.`;
  }
  return undefined;
}

/**
 * Normalizes a food name for matching/deduplication.
 */
export function normalizeFoodName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Computes a meal signature for frequent-meal matching.
 */
export function mealSignature(items: Array<{ normalizedName: string; quantity: number }>): string {
  const sorted = [...items]
    .sort((a, b) => a.normalizedName.localeCompare(b.normalizedName))
    .map(i => `${i.normalizedName}:${Math.round(i.quantity)}`);
  return sorted.join('|');
}

/**
 * Calculates percentage of target consumed, clamped for display.
 */
export function consumedPercent(consumed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((consumed / target) * 100), 999);
}

/**
 * Returns remaining budget (may be negative if over target).
 */
export function remainingBudget(consumed: number, target: number): number {
  return Math.round(target - consumed);
}
