import { z } from 'zod';

export const DailySummarySchema = z.object({
  localDate: z.string(),
  caloriesConsumed: z.number(),
  caloriesTarget: z.number().nullable(),
  caloriesRemaining: z.number().nullable(),
  proteinConsumed: z.number(),
  proteinTarget: z.number().nullable(),
  carbsConsumed: z.number(),
  carbsTarget: z.number().nullable(),
  fatConsumed: z.number(),
  fatTarget: z.number().nullable(),
  fiberConsumed: z.number(),
  fiberTarget: z.number().nullable(),
  waterConsumedMl: z.number(),
  waterTargetMl: z.number().nullable(),
  mealCount: z.number(),
  logged: z.boolean(), // has any data for this day
});

export type DailySummary = z.infer<typeof DailySummarySchema>;

export interface TrendDataPoint {
  localDate: string;
  value: number | null;
}

export interface ProgressReport {
  from: string;
  to: string;
  metrics: string[];
  granularity: 'day' | 'week';
  series: Record<string, TrendDataPoint[]>;
  facts: {
    loggedDays: number;
    calendarDays: number;
    averageCaloriesPerLoggedDay: number | null;
    averageCaloriesPerCalendarDay: number | null;
    targetHitCount: number;
    weightChange: number | null;
    firstWeight: number | null;
    lastWeight: number | null;
  };
}
