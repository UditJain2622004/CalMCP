import { db } from '@/db/database';
import { toDomainError, DomainError } from '@/domain/shared/errors';
import { daysBetween, addDaysToLocalDate } from '@/domain/shared/dates';
import { sumNutrition, emptyNutrition } from '@/domain/meals/meal.math';
import { profileService } from '@/domain/profile/profile.service';
import type { DailySummary, ProgressReport, TrendDataPoint } from './report.schema';
import type { Nutrition } from '@/domain/meals/meal.schema';

export const reportService = {
  /**
   * Returns a comprehensive daily summary for a local date.
   */
  async getDailySummary(localDate: string): Promise<DailySummary> {
    try {
      const [meals, waterEntries, goal] = await Promise.all([
        db.meals.where('localDate').equals(localDate).toArray(),
        db.waterEntries.where('localDate').equals(localDate).toArray(),
        profileService.getActiveGoal(),
      ]);

      const mealItems = await Promise.all(
        meals.map(m => db.mealItems.where('mealId').equals(m.id).toArray()),
      );
      const allItems = mealItems.flat();
      const nutrition: Nutrition = allItems.length > 0
        ? sumNutrition(allItems)
        : emptyNutrition();

      const waterConsumedMl = waterEntries.reduce((sum, e) => sum + e.amountMl, 0);

      const caloriesRemaining = goal
        ? Math.round(goal.calorieTargetKcal - nutrition.caloriesKcal)
        : null;

      return {
        localDate,
        caloriesConsumed: Math.round(nutrition.caloriesKcal),
        caloriesTarget: goal?.calorieTargetKcal ?? null,
        caloriesRemaining,
        proteinConsumed: Math.round(nutrition.proteinG * 10) / 10,
        proteinTarget: goal?.proteinTargetG ?? null,
        carbsConsumed: Math.round(nutrition.carbsG * 10) / 10,
        carbsTarget: goal?.carbsTargetG ?? null,
        fatConsumed: Math.round(nutrition.fatG * 10) / 10,
        fatTarget: goal?.fatTargetG ?? null,
        fiberConsumed: Math.round((nutrition.fiberG ?? 0) * 10) / 10,
        fiberTarget: goal?.fiberTargetG ?? null,
        waterConsumedMl: Math.round(waterConsumedMl),
        waterTargetMl: goal?.waterTargetMl ?? null,
        mealCount: meals.length,
        logged: meals.length > 0 || waterEntries.length > 0,
      };
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Returns progress data for a date range.
   */
  async getProgressReport(opts: {
    from: string;
    to: string;
    metrics: string[];
    granularity: 'day' | 'week';
  }): Promise<ProgressReport> {
    try {
      const rangeDays = daysBetween(opts.from, opts.to);
      if (rangeDays > 366) {
        throw new DomainError('VALIDATION_ERROR', 'Date range cannot exceed 366 days.');
      }
      if (rangeDays < 0) {
        throw new DomainError('VALIDATION_ERROR', '"from" must be before "to".');
      }

      // Collect all days in range
      const days: string[] = [];
      for (let i = 0; i <= rangeDays; i++) {
        days.push(addDaysToLocalDate(opts.from, i));
      }

      // Fetch all meals for range
      const allMeals = await db.meals
        .where('localDate')
        .between(opts.from, opts.to, true, true)
        .toArray();

      const allMealItems = await Promise.all(
        allMeals.map(m => db.mealItems.where('mealId').equals(m.id).toArray()),
      );

      const nutritionByDate = new Map<string, Nutrition>();
      allMeals.forEach((meal, idx) => {
        const items = allMealItems[idx];
        const existing = nutritionByDate.get(meal.localDate) ?? emptyNutrition();
        const mealNutrition = sumNutrition(items);
        nutritionByDate.set(meal.localDate, {
          caloriesKcal: existing.caloriesKcal + mealNutrition.caloriesKcal,
          proteinG: existing.proteinG + mealNutrition.proteinG,
          carbsG: existing.carbsG + mealNutrition.carbsG,
          fatG: existing.fatG + mealNutrition.fatG,
          fiberG: (existing.fiberG ?? 0) + (mealNutrition.fiberG ?? 0),
        });
      });

      // Fetch weight and water
      const weightEntries = await db.weightEntries
        .where('localDate')
        .between(opts.from, opts.to, true, true)
        .toArray();

      const waterEntries = await db.waterEntries
        .where('localDate')
        .between(opts.from, opts.to, true, true)
        .toArray();

      const weightByDate = new Map<string, number>();
      weightEntries.forEach(e => weightByDate.set(e.localDate, e.weightKg));

      const waterByDate = new Map<string, number>();
      waterEntries.forEach(e => {
        waterByDate.set(e.localDate, (waterByDate.get(e.localDate) ?? 0) + e.amountMl);
      });

      // Build series
      const series: Record<string, TrendDataPoint[]> = {};

      const buildSeries = (metricKey: string, getValue: (date: string) => number | null) => {
        if (opts.granularity === 'day') {
          series[metricKey] = days.map(date => ({
            localDate: date,
            value: getValue(date),
          }));
        } else {
          // Weekly aggregation
          const weeks: string[][] = [];
          for (let i = 0; i < days.length; i += 7) {
            weeks.push(days.slice(i, i + 7));
          }
          series[metricKey] = weeks.map(week => {
            const values = week.map(d => getValue(d)).filter((v): v is number => v !== null);
            return {
              localDate: week[0],
              value: values.length > 0 ? values.reduce((a, b) => a + b) / values.length : null,
            };
          });
        }
      };

      if (opts.metrics.includes('calories')) {
        buildSeries('calories', d => {
          const n = nutritionByDate.get(d);
          return n ? Math.round(n.caloriesKcal) : null;
        });
      }
      if (opts.metrics.includes('protein')) {
        buildSeries('protein', d => nutritionByDate.get(d)?.proteinG ?? null);
      }
      if (opts.metrics.includes('carbs')) {
        buildSeries('carbs', d => nutritionByDate.get(d)?.carbsG ?? null);
      }
      if (opts.metrics.includes('fat')) {
        buildSeries('fat', d => nutritionByDate.get(d)?.fatG ?? null);
      }
      if (opts.metrics.includes('fiber')) {
        buildSeries('fiber', d => nutritionByDate.get(d)?.fiberG ?? null);
      }
      if (opts.metrics.includes('water')) {
        buildSeries('water', d => waterByDate.get(d) ?? null);
      }
      if (opts.metrics.includes('weight')) {
        buildSeries('weight', d => weightByDate.get(d) ?? null);
      }

      // Facts
      const loggedDays = days.filter(d => nutritionByDate.has(d)).length;
      const totalCalories = [...nutritionByDate.values()].reduce((s, n) => s + n.caloriesKcal, 0);

      const goal = await profileService.getActiveGoal();
      const targetHitCount = goal
        ? [...nutritionByDate.entries()].filter(
            ([, n]) => n.caloriesKcal >= goal.calorieTargetKcal * 0.9 &&
                       n.caloriesKcal <= goal.calorieTargetKcal * 1.1,
          ).length
        : 0;

      const sortedWeights = [...weightByDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const firstWeight = sortedWeights[0]?.[1] ?? null;
      const lastWeight = sortedWeights[sortedWeights.length - 1]?.[1] ?? null;
      const weightChange = firstWeight !== null && lastWeight !== null
        ? Math.round((lastWeight - firstWeight) * 100) / 100
        : null;

      return {
        from: opts.from,
        to: opts.to,
        metrics: opts.metrics,
        granularity: opts.granularity,
        series,
        facts: {
          loggedDays,
          calendarDays: days.length,
          averageCaloriesPerLoggedDay: loggedDays > 0 ? Math.round(totalCalories / loggedDays) : null,
          averageCaloriesPerCalendarDay: days.length > 0 ? Math.round(totalCalories / days.length) : null,
          targetHitCount,
          weightChange,
          firstWeight,
          lastWeight,
        },
      };
    } catch (err) {
      throw toDomainError(err);
    }
  },
};
