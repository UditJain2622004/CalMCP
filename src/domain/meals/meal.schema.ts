import { z } from 'zod';

// ── Nutrition ──────────────────────────────────────────────────────────────

export const NutritionSchema = z.object({
  caloriesKcal: z.number().min(0).max(10000),
  proteinG: z.number().min(0).max(2000),
  carbsG: z.number().min(0).max(2000),
  fatG: z.number().min(0).max(2000),
  fiberG: z.number().min(0).max(200).optional(),
  sugarG: z.number().min(0).max(2000).optional(),
  sodiumMg: z.number().min(0).max(50000).optional(),
  saturatedFatG: z.number().min(0).max(2000).optional(),
  vitamins: z.array(z.object({
    code: z.string().min(1).max(50),
    amount: z.number().min(0),
    unit: z.enum(['mg', 'mcg', 'IU']),
  })).optional(),
});

export type Nutrition = z.infer<typeof NutritionSchema>;

// ── MealItem ───────────────────────────────────────────────────────────────

export const UNIT_OPTIONS = ['g', 'ml', 'oz', 'piece', 'serving', 'cup', 'tbsp', 'tsp'] as const;
export type MealItemUnit = typeof UNIT_OPTIONS[number];

export const MealItemSchema = z.object({
  id: z.string().min(1),
  mealId: z.string().min(1),
  name: z.string().min(1).max(100),
  normalizedName: z.string().min(1),
  quantity: z.number().positive().max(100000),
  unit: z.enum(UNIT_OPTIONS),
  grams: z.number().positive().optional(),
  brand: z.string().max(100).optional(),
  barcode: z.string().max(50).optional(),
  nutrition: NutritionSchema,
  confidence: z.number().min(0).max(1).optional(),
  estimationNotes: z.string().max(300).optional(),
});

export type MealItem = z.infer<typeof MealItemSchema>;

// ── Meal ───────────────────────────────────────────────────────────────────

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = typeof MEAL_TYPES[number];

export const MealSchema = z.object({
  id: z.string().min(1),
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eatenAt: z.string().datetime(),
  mealType: z.enum(MEAL_TYPES),
  title: z.string().min(1).max(80),
  notes: z.string().max(500).optional(),
  captureId: z.string().optional(),
  source: z.enum(['manual', 'webmcp', 'repeat']),
  status: z.literal('confirmed'),
  totals: NutritionSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Meal = z.infer<typeof MealSchema>;

// ── MealDraft ──────────────────────────────────────────────────────────────

export const MealDraftItemSchema = MealItemSchema.omit({ mealId: true });
export type MealDraftItem = z.infer<typeof MealDraftItemSchema>;

export const MealDraftSchema = z.object({
  id: z.string().min(1),
  captureId: z.string().optional(),
  proposedEatenAt: z.string().datetime(),
  proposedMealType: z.enum(MEAL_TYPES),
  proposedTitle: z.string().min(1).max(80),
  items: z.array(MealDraftItemSchema).min(1).max(30),
  overallConfidence: z.number().min(0).max(1).optional(),
  assumptions: z.array(z.string().max(200)).max(10),
  source: z.enum(['webmcp', 'manual']),
  status: z.enum(['pending_review', 'committed', 'discarded']),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

export type MealDraft = z.infer<typeof MealDraftSchema>;

// ── Input schemas for creating meals ──────────────────────────────────────

export const CreateMealItemInputSchema = z.object({
  name: z.string().min(1).max(100),
  quantity: z.number().positive().max(100000),
  unit: z.enum(UNIT_OPTIONS),
  grams: z.number().positive().optional(),
  brand: z.string().max(100).optional(),
  barcode: z.string().max(50).optional(),
  nutrition: NutritionSchema,
  confidence: z.number().min(0).max(1).optional(),
  estimationNotes: z.string().max(300).optional(),
});

export type CreateMealItemInput = z.infer<typeof CreateMealItemInputSchema>;

export const CreateMealInputSchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eatenAt: z.string().datetime(),
  mealType: z.enum(MEAL_TYPES),
  title: z.string().min(1).max(80),
  notes: z.string().max(500).optional(),
  captureId: z.string().optional(),
  items: z.array(CreateMealItemInputSchema).min(1).max(30),
});

export type CreateMealInput = z.infer<typeof CreateMealInputSchema>;

export const CreateDraftInputSchema = z.object({
  captureId: z.string().optional(),
  eatenAt: z.string().datetime(),
  mealType: z.enum(MEAL_TYPES),
  title: z.string().min(1).max(80),
  items: z.array(CreateMealItemInputSchema).min(1).max(30),
  overallConfidence: z.number().min(0).max(1).optional(),
  assumptions: z.array(z.string().max(500)).max(20).default([]),
  source: z.enum(['webmcp', 'manual']).default('webmcp'),
});

export type CreateDraftInput = z.infer<typeof CreateDraftInputSchema>;

export const UpdateDraftInputSchema = z.object({
  proposedTitle: z.string().min(1).max(80).optional(),
  proposedMealType: z.enum(MEAL_TYPES).optional(),
  proposedEatenAt: z.string().datetime().optional(),
  items: z.array(CreateMealItemInputSchema).min(1).max(30).optional(),
  overallConfidence: z.number().min(0).max(1).optional(),
  assumptions: z.array(z.string().max(200)).max(10).optional(),
});

export type UpdateDraftInput = z.infer<typeof UpdateDraftInputSchema>;
