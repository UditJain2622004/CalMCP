/**
 * Development seed data — only runs in development mode.
 * Creates a sample profile and some sample meals for testing.
 */

import { db } from './database';
import { nowUtc, getTodayLocalDate, localDateAtHourToUtc, addDaysToLocalDate } from '../domain/shared/dates';
import { normalizeFoodName, sumNutrition } from '../domain/meals/meal.math';
import type { Profile } from '../domain/profile/profile.schema';
import type { Meal, MealItem } from '../domain/meals/meal.schema';
import type { WeightEntry } from '../domain/weight/weight.schema';
import type { WaterEntry } from '../domain/hydration/hydration.schema';

function uuid(): string {
  return crypto.randomUUID();
}

export async function seedDevData(): Promise<void> {
  if (import.meta.env.PROD) return;

  // Only seed if profile doesn't exist
  const existing = await db.profiles.get('local-user');
  if (existing) return;

  const now = nowUtc();
  const today = getTodayLocalDate();
  const yesterday = addDaysToLocalDate(today, -1);

  // Profile
  const profile: Profile = {
    id: 'local-user',
    displayName: 'Alex',
    birthDate: '1990-05-15',
    sexForCalculation: 'unspecified',
    heightCm: 170,
    currentWeightKg: 72,
    preferredWeightUnit: 'kg',
    preferredEnergyUnit: 'kcal',
    locale: 'en',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    createdAt: now,
    updatedAt: now,
  };

  await db.profiles.put(profile);

  // Sample meal for today - Breakfast
  const breakfastId = uuid();
  const breakfastItems: MealItem[] = [
    {
      id: uuid(),
      mealId: breakfastId,
      name: 'Oatmeal',
      normalizedName: normalizeFoodName('Oatmeal'),
      quantity: 80,
      unit: 'g',
      grams: 80,
      nutrition: {
        caloriesKcal: 304,
        proteinG: 11,
        carbsG: 52,
        fatG: 6,
        fiberG: 8,
      },
    },
    {
      id: uuid(),
      mealId: breakfastId,
      name: 'Banana',
      normalizedName: normalizeFoodName('Banana'),
      quantity: 1,
      unit: 'piece',
      grams: 118,
      nutrition: {
        caloriesKcal: 105,
        proteinG: 1.3,
        carbsG: 27,
        fatG: 0.4,
        fiberG: 3.1,
      },
    },
  ];

  const breakfastMeal: Meal = {
    id: breakfastId,
    localDate: today,
    eatenAt: localDateAtHourToUtc(today, 8),
    mealType: 'breakfast',
    title: 'Oatmeal with Banana',
    source: 'manual',
    status: 'confirmed',
    totals: sumNutrition(breakfastItems),
    createdAt: now,
    updatedAt: now,
  };

  await db.meals.put(breakfastMeal);
  await db.mealItems.bulkPut(breakfastItems);

  // Sample weight entries
  const weightEntries: WeightEntry[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDaysToLocalDate(today, -i);
    weightEntries.push({
      id: uuid(),
      localDate: date,
      recordedAt: localDateAtHourToUtc(date, 7),
      weightKg: 72 + (Math.random() - 0.5) * 0.5,
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    });
  }
  await db.weightEntries.bulkPut(weightEntries);

  // Sample water for today
  const waterEntries: WaterEntry[] = [
    {
      id: uuid(),
      localDate: today,
      recordedAt: localDateAtHourToUtc(today, 8),
      amountMl: 250,
      source: 'manual',
      createdAt: now,
    },
    {
      id: uuid(),
      localDate: today,
      recordedAt: localDateAtHourToUtc(today, 10),
      amountMl: 500,
      source: 'manual',
      createdAt: now,
    },
  ];
  await db.waterEntries.bulkPut(waterEntries);

  // Yesterday's meals
  const lunchId = uuid();
  const lunchItems: MealItem[] = [
    {
      id: uuid(),
      mealId: lunchId,
      name: 'Grilled Chicken Breast',
      normalizedName: normalizeFoodName('Grilled Chicken Breast'),
      quantity: 150,
      unit: 'g',
      grams: 150,
      nutrition: {
        caloriesKcal: 248,
        proteinG: 46.5,
        carbsG: 0,
        fatG: 5.4,
      },
    },
    {
      id: uuid(),
      mealId: lunchId,
      name: 'Brown Rice',
      normalizedName: normalizeFoodName('Brown Rice'),
      quantity: 100,
      unit: 'g',
      grams: 100,
      nutrition: {
        caloriesKcal: 111,
        proteinG: 2.6,
        carbsG: 23,
        fatG: 0.9,
        fiberG: 1.8,
      },
    },
  ];

  const lunchMeal: Meal = {
    id: lunchId,
    localDate: yesterday,
    eatenAt: localDateAtHourToUtc(yesterday, 13),
    mealType: 'lunch',
    title: 'Chicken and Rice Bowl',
    source: 'manual',
    status: 'confirmed',
    totals: sumNutrition(lunchItems),
    createdAt: now,
    updatedAt: now,
  };

  await db.meals.put(lunchMeal);
  await db.mealItems.bulkPut(lunchItems);

  console.log('[Seed] Development data seeded successfully');
}
