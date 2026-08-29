import { z } from 'zod';

export const ProfileSchema = z.object({
  id: z.literal('local-user'),
  displayName: z.string().max(100).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sexForCalculation: z.enum(['female', 'male', 'unspecified']).optional(),
  heightCm: z.number().positive().max(300).optional(),
  currentWeightKg: z.number().positive().max(500).optional(),
  preferredWeightUnit: z.enum(['kg', 'lb']).default('kg'),
  preferredEnergyUnit: z.literal('kcal').default('kcal'),
  locale: z.string().default('en'),
  timeZone: z.string().default(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Profile = z.infer<typeof ProfileSchema>;

export const GoalSchema = z.object({
  id: z.string().min(1),
  profileId: z.literal('local-user'),
  type: z.enum(['lose_weight', 'build_muscle', 'eat_healthier', 'maintain_weight']),
  targetWeightKg: z.number().positive().max(500).optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'very_active']).optional(),
  weeklyWeightChangeKg: z.number().optional(),
  calorieTargetKcal: z.number().min(0).max(20000),
  proteinTargetG: z.number().min(0).max(1000),
  carbsTargetG: z.number().min(0).max(2000),
  fatTargetG: z.number().min(0).max(1000),
  fiberTargetG: z.number().min(0).max(200).optional(),
  waterTargetMl: z.number().min(0).max(20000),
  targetSource: z.enum(['calculated', 'manual']),
  calculation: z.object({
    formula: z.literal('mifflin_st_jeor'),
    bmrKcal: z.number(),
    tdeeKcal: z.number(),
    adjustmentKcal: z.number(),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Goal = z.infer<typeof GoalSchema>;

export const UpdateProfileInputSchema = ProfileSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial();

export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

export const SetGoalInputSchema = GoalSchema
  .omit({ id: true, profileId: true, createdAt: true, updatedAt: true });

export type SetGoalInput = z.infer<typeof SetGoalInputSchema>;
