/**
 * BMR/TDEE calculations using Mifflin-St Jeor equation.
 * Results are estimates, not medical advice.
 */

import type { Profile, Goal } from './profile.schema';

export type ActivityLevel = NonNullable<Goal['activityLevel']>;

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
};

/** Minimum kcal floor below which a warning should be shown */
export const CALORIE_FLOOR_KCAL = 1200;

/**
 * Calculates BMR using Mifflin-St Jeor equation.
 * Requires weight (kg), height (cm), age (years), and sex.
 */
export function calculateBmr(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: 'male' | 'female',
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === 'male' ? base + 5 : base - 161;
}

/**
 * Calculates TDEE from BMR and activity level.
 */
export function calculateTdee(bmrKcal: number, activityLevel: ActivityLevel): number {
  return bmrKcal * ACTIVITY_MULTIPLIERS[activityLevel];
}

/**
 * Calculates age from birthDate string.
 */
export function ageFromBirthDate(birthDate: string): number {
  const born = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) {
    age--;
  }
  return age;
}

/**
 * Calculates calorie adjustment from weekly weight change target.
 * 7700 kcal ≈ 1 kg body tissue.
 */
export function calorieAdjustmentFromWeeklyChange(weeklyKg: number): number {
  return (weeklyKg * 7700) / 7;
}

/**
 * Suggests targets from a profile + goal type.
 * Returns null if profile is incomplete for calculation.
 */
export function calculateTargets(
  profile: Profile,
  goalType: Goal['type'],
  activityLevel: ActivityLevel,
  weeklyWeightChangeKg?: number,
): {
  bmrKcal: number;
  tdeeKcal: number;
  calorieTargetKcal: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  fiberTargetG: number;
  waterTargetMl: number;
  adjustmentKcal: number;
  warnings: string[];
} | null {
  if (
    !profile.currentWeightKg ||
    !profile.heightCm ||
    !profile.birthDate ||
    !profile.sexForCalculation ||
    profile.sexForCalculation === 'unspecified'
  ) {
    return null;
  }

  const ageYears = ageFromBirthDate(profile.birthDate);
  const bmrKcal = calculateBmr(
    profile.currentWeightKg,
    profile.heightCm,
    ageYears,
    profile.sexForCalculation as 'male' | 'female',
  );

  const tdeeKcal = calculateTdee(bmrKcal, activityLevel);

  let adjustmentKcal = 0;
  if (goalType === 'lose_weight' && weeklyWeightChangeKg) {
    adjustmentKcal = -Math.abs(calorieAdjustmentFromWeeklyChange(weeklyWeightChangeKg));
  } else if (goalType === 'build_muscle') {
    adjustmentKcal = 250;
  }

  const calorieTargetKcal = Math.round(tdeeKcal + adjustmentKcal);

  const warnings: string[] = [];
  if (calorieTargetKcal < CALORIE_FLOOR_KCAL) {
    warnings.push(
      `Calculated target (${calorieTargetKcal} kcal) is below ${CALORIE_FLOOR_KCAL} kcal. ` +
      'This is an estimate only — consult a healthcare provider before restricting calories significantly.',
    );
  }

  // Protein: ~0.8g per kg bodyweight (conservative estimate for general use)
  const proteinTargetG = Math.round(profile.currentWeightKg * 0.8);
  // Fat: ~25% of calories
  const fatTargetG = Math.round((calorieTargetKcal * 0.25) / 9);
  // Carbs: remaining calories
  const proteinCals = proteinTargetG * 4;
  const fatCals = fatTargetG * 9;
  const carbsCals = Math.max(0, calorieTargetKcal - proteinCals - fatCals);
  const carbsTargetG = Math.round(carbsCals / 4);

  // Fiber: 14g per 1000 kcal (general guideline reference)
  const fiberTargetG = Math.round((calorieTargetKcal / 1000) * 14);

  // Water: 35ml per kg bodyweight (general reference)
  const waterTargetMl = Math.round(profile.currentWeightKg * 35);

  return {
    bmrKcal: Math.round(bmrKcal),
    tdeeKcal: Math.round(tdeeKcal),
    calorieTargetKcal,
    proteinTargetG,
    carbsTargetG,
    fatTargetG,
    fiberTargetG,
    waterTargetMl,
    adjustmentKcal: Math.round(adjustmentKcal),
    warnings,
  };
}
