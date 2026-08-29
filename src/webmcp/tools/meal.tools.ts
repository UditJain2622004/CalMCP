/**
 * Meal tools — create drafts, commit, list, get, update, delete meals.
 */

import { z } from 'zod';
import { toolOk, toolError, withErrorHandling } from '@/webmcp/tool-result';
import type { RegisteredTool } from '@/webmcp/model-context.types';
import { mealService } from '@/domain/meals/meal.service';
import { reportService } from '@/domain/reports/report.service';
import { CreateDraftInputSchema, CreateMealItemInputSchema, UpdateDraftInputSchema, UNIT_OPTIONS, MEAL_TYPES } from '@/domain/meals/meal.schema';
import { getTodayLocalDate, utcToLocalDate, nowUtc } from '@/domain/shared/dates';
import { profileService } from '@/domain/profile/profile.service';
import { DomainError } from '@/domain/shared/errors';
import { db } from '@/db/database';

function uuid(): string {
  return crypto.randomUUID();
}

async function auditEvent(toolName: string, action: string, entityType: string, entityId: string, summary: string) {
  try {
    await db.auditEvents.put({
      id: uuid(),
      occurredAt: nowUtc(),
      action,
      entityType,
      entityId,
      source: 'webmcp',
      toolName,
      summary,
    });
  } catch {
    // Audit failures are non-fatal
  }
}

// ── create_meal_draft ─────────────────────────────────────────────────────

export const createMealDraftTool: RegisteredTool = {
  name: 'create_meal_draft',
  title: 'Create Meal Draft',
  description: 'Creates and logs a meal directly from your analysis into daily intake.',
  inputSchema: {
    type: 'object',
    properties: {
      captureId: { type: 'string', description: 'Optional correlation ID from get_pending_photo_context.' },
      eatenAt: { type: 'string', description: 'ISO timestamp when meal was eaten (UTC).' },
      mealType: { type: 'string', enum: [...MEAL_TYPES] },
      title: { type: 'string', description: 'Meal name, 1-80 characters.' },
      items: {
        type: 'array',
        description: 'Food items with nutrition per entered quantity (not per 100g).',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            quantity: { type: 'number' },
            unit: { type: 'string', enum: [...UNIT_OPTIONS] },
            grams: { type: 'number', description: 'Weight in grams if known.' },
            nutrition: {
              type: 'object',
              properties: {
                caloriesKcal: { type: 'number' },
                proteinG: { type: 'number' },
                carbsG: { type: 'number' },
                fatG: { type: 'number' },
                fiberG: { type: 'number' },
              },
              required: ['caloriesKcal', 'proteinG', 'carbsG', 'fatG'],
            },
            confidence: { type: 'number', description: '0.0-1.0 confidence in this estimate.' },
            estimationNotes: { type: 'string', description: 'Explain how you estimated this item.' },
          },
          required: ['name', 'quantity', 'unit', 'nutrition'],
        },
        minItems: 1,
        maxItems: 30,
      },
      overallConfidence: { type: 'number', description: 'Overall confidence 0-1.' },
      assumptions: {
        type: 'array',
        items: { type: 'string' },
        description: 'List assumptions made in your analysis.',
      },
    },
    required: ['eatenAt', 'mealType', 'title', 'items'],
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: withErrorHandling(async (input, { signal }) => {
    let rawInput = input;
    if (typeof input === 'string') {
      try {
        rawInput = JSON.parse(input);
      } catch {
        // Keep as string for Zod to report validation error
      }
    }
    if (rawInput && typeof rawInput === 'object') {
      rawInput = { source: 'webmcp', ...rawInput };
    }

    const parsed = CreateDraftInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path.join('.')] = issue.message;
      }
      return toolError('VALIDATION_ERROR', 'Invalid draft input.', { fieldErrors });
    }

    // Create draft and commit immediately
    const { draft, warnings } = await mealService.createDraft(parsed.data);
    const meal = await mealService.commitDraft(draft.id);

    await auditEvent('create_meal_draft', 'create_meal', 'meal', meal.id,
      `Meal "${meal.title}" logged directly with ${meal.items.length} items.`);

    const profile = await profileService.getProfile();
    const summary = await reportService.getDailySummary(meal.localDate);

    return toolOk('meal_created', {
      mealId: meal.id,
      title: meal.title,
      mealType: meal.mealType,
      eatenAt: meal.eatenAt,
      itemCount: meal.items.length,
      totals: meal.totals,
      dailySummary: {
        date: summary.localDate,
        caloriesConsumed: summary.caloriesConsumed,
        caloriesTarget: summary.caloriesTarget,
        caloriesRemaining: summary.caloriesRemaining,
        mealCount: summary.mealCount,
      },
    }, { warnings });
  }),
};

// ── update_meal_draft ─────────────────────────────────────────────────────

const UpdateMealDraftToolSchema = z.object({
  mealId: z.string().min(1),
  title: z.string().min(1).max(80).optional(),
  mealType: z.enum(MEAL_TYPES).optional(),
  eatenAt: z.string().optional(),
  items: z.array(CreateMealItemInputSchema).min(1).max(30).optional(),
});

export const updateMealDraftTool: RegisteredTool = {
  name: 'update_meal_draft',
  title: 'Update Meal Draft / Entry',
  description: 'Updates or corrects a logged meal entry or draft by ID with updated items or attributes.',
  inputSchema: {
    type: 'object',
    properties: {
      mealId: { type: 'string', description: 'ID of the meal entry or draft to update.' },
      title: { type: 'string' },
      mealType: { type: 'string', enum: [...MEAL_TYPES] },
      eatenAt: { type: 'string' },
      items: { type: 'array', description: 'Updated list of food items.' },
    },
    required: ['mealId'],
  },
  annotations: { readOnlyHint: false },
  execute: withErrorHandling(async (input) => {
    let rawInput = input;
    if (typeof input === 'string') {
      try { rawInput = JSON.parse(input); } catch { /* ignore */ }
    }
    const parsed = UpdateMealDraftToolSchema.safeParse(rawInput);
    if (!parsed.success) {
      return toolError('VALIDATION_ERROR', 'Invalid update input.');
    }

    const { mealId, title, mealType, eatenAt, items } = parsed.data;

    const existing = await mealService.getMeal(mealId);
    if (!existing) {
      const draft = await mealService.getDraft(mealId);
      if (draft) {
        const { draft: updatedDraft, warnings } = await mealService.updateDraft(mealId, {
          proposedTitle: title,
          proposedMealType: mealType,
          proposedEatenAt: eatenAt,
          items,
        });
        return toolOk('draft_updated', { draftId: updatedDraft.id, title: updatedDraft.proposedTitle }, { warnings });
      }
      return toolError('NOT_FOUND', `Meal or draft with ID ${mealId} not found.`);
    }

    const profile = await profileService.getProfile();
    const updatedEatenAt = eatenAt ?? existing.eatenAt;
    const updatedLocalDate = utcToLocalDate(updatedEatenAt, profile.timeZone);

    const updated = await mealService.updateMeal(mealId, {
      localDate: updatedLocalDate,
      eatenAt: updatedEatenAt,
      mealType: mealType ?? existing.mealType,
      title: title ?? existing.title,
      notes: existing.notes,
      items: items ?? existing.items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        grams: i.grams,
        brand: i.brand,
        nutrition: i.nutrition,
        confidence: i.confidence,
        estimationNotes: i.estimationNotes,
      })),
    });

    const summary = await reportService.getDailySummary(updated.localDate);

    return toolOk('meal_updated', {
      mealId: updated.id,
      title: updated.title,
      totals: updated.totals,
      dailySummary: {
        caloriesConsumed: summary.caloriesConsumed,
        caloriesRemaining: summary.caloriesRemaining,
      },
    });
  }),
};

// ── get_meal ──────────────────────────────────────────────────────────────

const GetMealSchema = z.object({ mealId: z.string().min(1) });

export const getMealTool: RegisteredTool = {
  name: 'get_meal',
  title: 'Get Meal',
  description: 'Retrieves one confirmed meal by ID, with its items and nutrition.',
  inputSchema: {
    type: 'object',
    properties: {
      mealId: { type: 'string', description: 'ID of the meal.' },
    },
    required: ['mealId'],
  },
  annotations: { readOnlyHint: true, untrustedContentHint: true },
  execute: withErrorHandling(async (input) => {
    const parsed = GetMealSchema.safeParse(input);
    if (!parsed.success) return toolError('VALIDATION_ERROR', 'mealId is required.');

    const meal = await mealService.getMeal(parsed.data.mealId);
    if (!meal) return toolError('NOT_FOUND', `Meal ${parsed.data.mealId} not found.`);

    return toolOk('meal', {
      id: meal.id,
      localDate: meal.localDate,
      eatenAt: meal.eatenAt,
      mealType: meal.mealType,
      title: meal.title,
      source: meal.source,
      totals: meal.totals,
      items: meal.items.map(i => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        grams: i.grams,
        nutrition: i.nutrition,
        confidence: i.confidence,
      })),
    });
  }),
};

// ── list_meals ────────────────────────────────────────────────────────────

const ListMealsSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: z.enum(MEAL_TYPES).optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
  cursor: z.string().optional(),
});

export const listMealsTool: RegisteredTool = {
  name: 'list_meals',
  title: 'List Meals',
  description: 'Returns a bounded list of confirmed meals in a date range. Maximum 31-day range.',
  inputSchema: {
    type: 'object',
    properties: {
      from: { type: 'string', description: 'Start local date (YYYY-MM-DD).' },
      to: { type: 'string', description: 'End local date (YYYY-MM-DD).' },
      mealType: { type: 'string', enum: [...MEAL_TYPES] },
      limit: { type: 'number', description: 'Max results, default 20, max 50.' },
      cursor: { type: 'string', description: 'Pagination cursor (meal ID).' },
    },
    required: ['from', 'to'],
  },
  annotations: { readOnlyHint: true, untrustedContentHint: true },
  execute: withErrorHandling(async (input) => {
    const parsed = ListMealsSchema.safeParse(input);
    if (!parsed.success) {
      return toolError('VALIDATION_ERROR', 'Invalid list parameters.', {
        fieldErrors: Object.fromEntries(parsed.error.issues.map(i => [i.path.join('.'), i.message])),
      });
    }

    const { from, to } = parsed.data;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays > 31) {
      return toolError('VALIDATION_ERROR', 'Date range cannot exceed 31 days. Use get_progress_report for longer ranges.');
    }

    const meals = await mealService.listMeals(parsed.data);

    return toolOk('meals', {
      meals: meals.map(m => ({
        id: m.id,
        localDate: m.localDate,
        eatenAt: m.eatenAt,
        mealType: m.mealType,
        title: m.title,
        caloriesKcal: m.totals.caloriesKcal,
        proteinG: m.totals.proteinG,
      })),
      count: meals.length,
      nextCursor: meals.length === parsed.data.limit ? meals[meals.length - 1].id : null,
    });
  }),
};

// ── delete_meal ───────────────────────────────────────────────────────────

const DeleteMealSchema = z.object({
  mealId: z.string().min(1),
  userConfirmed: z.boolean(),
});

export const deleteMealTool: RegisteredTool = {
  name: 'delete_meal',
  title: 'Delete Meal',
  description: 'Deletes a confirmed meal. Requires userConfirmed: true.',
  inputSchema: {
    type: 'object',
    properties: {
      mealId: { type: 'string' },
      userConfirmed: { type: 'boolean', description: 'Must be true after user confirms deletion.' },
    },
    required: ['mealId', 'userConfirmed'],
  },
  annotations: { readOnlyHint: false },
  execute: withErrorHandling(async (input) => {
    const parsed = DeleteMealSchema.safeParse(input);
    if (!parsed.success) return toolError('VALIDATION_ERROR', 'Invalid input.');

    if (!parsed.data.userConfirmed) {
      return toolError('CONFIRMATION_REQUIRED', 'userConfirmed must be true. Confirm deletion with user first.', {
        recoverable: true,
      });
    }

    const meal = await mealService.getMeal(parsed.data.mealId);
    if (!meal) return toolError('NOT_FOUND', `Meal ${parsed.data.mealId} not found.`);

    await mealService.deleteMeal(parsed.data.mealId);

    await auditEvent('delete_meal', 'delete_meal', 'meal', parsed.data.mealId,
      `Meal "${meal.title}" deleted.`);

    return toolOk('meal_deleted', { mealId: parsed.data.mealId });
  }),
};

// ── find_frequent_meals ───────────────────────────────────────────────────

const FindFrequentMealsSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().min(1).max(10).optional().default(5),
});

export const findFrequentMealsTool: RegisteredTool = {
  name: 'find_frequent_meals',
  title: 'Find Frequent Meals',
  description: 'Returns frequently logged meals, ranked by count and recency. Use to suggest meals from memory.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Optional search query to filter by food name.' },
      limit: { type: 'number', description: 'Max results, default 5, max 10.' },
    },
  },
  annotations: { readOnlyHint: true, untrustedContentHint: true },
  execute: withErrorHandling(async (input) => {
    const parsed = FindFrequentMealsSchema.safeParse(input);
    if (!parsed.success) return toolError('VALIDATION_ERROR', 'Invalid input.');

    const results = await mealService.findFrequentMeals(parsed.data);

    return toolOk('frequent_meals', {
      meals: results.map(r => ({
        mealId: r.meal.id,
        title: r.meal.title,
        mealType: r.meal.mealType,
        count: r.count,
        lastEatenAt: r.meal.eatenAt,
        totals: r.meal.totals,
        itemCount: r.items.length,
      })),
    });
  }),
};

// ── repeat_meal ───────────────────────────────────────────────────────────

const RepeatMealSchema = z.object({
  sourceMealId: z.string().min(1),
  eatenAt: z.string().datetime(),
  mealType: z.enum(MEAL_TYPES).optional(),
  userConfirmed: z.boolean(),
});

export const repeatMealTool: RegisteredTool = {
  name: 'repeat_meal',
  title: 'Repeat Meal',
  description: 'Copies a previous confirmed meal to a new timestamp. Requires userConfirmed: true.',
  inputSchema: {
    type: 'object',
    properties: {
      sourceMealId: { type: 'string', description: 'ID of the meal to copy.' },
      eatenAt: { type: 'string', description: 'UTC ISO timestamp for the new meal.' },
      mealType: { type: 'string', enum: [...MEAL_TYPES] },
      userConfirmed: { type: 'boolean' },
    },
    required: ['sourceMealId', 'eatenAt', 'userConfirmed'],
  },
  annotations: { readOnlyHint: false },
  execute: withErrorHandling(async (input) => {
    const parsed = RepeatMealSchema.safeParse(input);
    if (!parsed.success) return toolError('VALIDATION_ERROR', 'Invalid input.');
    if (!parsed.data.userConfirmed) {
      return toolError('CONFIRMATION_REQUIRED', 'userConfirmed must be true.');
    }

    const profile = await profileService.getProfile();
    const { utcToLocalDate } = await import('@/domain/shared/dates');
    const localDate = utcToLocalDate(parsed.data.eatenAt, profile.timeZone);

    const newMeal = await mealService.repeatMeal(
      parsed.data.sourceMealId,
      localDate,
      parsed.data.eatenAt,
      parsed.data.mealType,
    );

    return toolOk('meal_repeated', {
      newMealId: newMeal.id,
      title: newMeal.title,
      totals: newMeal.totals,
    });
  }),
};
