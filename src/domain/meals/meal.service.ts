import { db } from '@/db/database';
import { DomainError, toDomainError } from '@/domain/shared/errors';
import { nowUtc, utcToLocalDate } from '@/domain/shared/dates';
import { sumNutrition, normalizeFoodName, mealSignature, checkMacroConsistency } from './meal.math';
import type {
  Meal, MealItem, MealDraft,
  CreateMealInput, CreateDraftInput, UpdateDraftInput,
  CreateMealItemInput,
} from './meal.schema';

function uuid(): string {
  return crypto.randomUUID();
}

const DRAFT_EXPIRY_HOURS = 24;

function makeDraftExpiry(): string {
  const d = new Date();
  d.setHours(d.getHours() + DRAFT_EXPIRY_HOURS);
  return d.toISOString();
}

function makeItems(
  mealId: string,
  inputs: CreateMealItemInput[],
): MealItem[] {
  return inputs.map(input => ({
    id: uuid(),
    mealId,
    name: input.name,
    normalizedName: normalizeFoodName(input.name),
    quantity: input.quantity,
    unit: input.unit,
    grams: input.grams,
    brand: input.brand,
    barcode: input.barcode,
    nutrition: {
      caloriesKcal: input.nutrition.caloriesKcal,
      proteinG: input.nutrition.proteinG,
      carbsG: input.nutrition.carbsG,
      fatG: input.nutrition.fatG,
      fiberG: input.nutrition.fiberG,
      sugarG: input.nutrition.sugarG,
      sodiumMg: input.nutrition.sodiumMg,
      saturatedFatG: input.nutrition.saturatedFatG,
      vitamins: input.nutrition.vitamins,
    },
    confidence: input.confidence,
    estimationNotes: input.estimationNotes,
  }));
}

export type MealWithItems = Meal & { items: MealItem[] };

export interface FrequentMealResult {
  meal: Meal;
  items: MealItem[];
  count: number;
  signature: string;
}

export interface ListMealsOptions {
  from: string;
  to: string;
  mealType?: Meal['mealType'];
  limit?: number;
  cursor?: string;
}

export const mealService = {
  /**
   * Creates a new draft from external agent or manual entry.
   */
  async createDraft(input: CreateDraftInput): Promise<{ draft: MealDraft; warnings: string[] }> {
    try {
      const warnings: string[] = [];
      const now = nowUtc();
      const draftId = uuid();

      const draftItems = input.items.map(itemInput => {
        const warn = checkMacroConsistency(
          itemInput.nutrition.caloriesKcal,
          itemInput.nutrition.proteinG,
          itemInput.nutrition.carbsG,
          itemInput.nutrition.fatG,
        );
        if (warn) warnings.push(`[${itemInput.name}] ${warn}`);

        return {
          id: uuid(),
          mealId: draftId,
          name: itemInput.name,
          normalizedName: normalizeFoodName(itemInput.name),
          quantity: itemInput.quantity,
          unit: itemInput.unit,
          grams: itemInput.grams,
          brand: itemInput.brand,
          barcode: itemInput.barcode,
          nutrition: itemInput.nutrition,
          confidence: itemInput.confidence,
          estimationNotes: itemInput.estimationNotes,
        };
      });

      const draft: MealDraft = {
        id: draftId,
        captureId: input.captureId,
        proposedEatenAt: input.eatenAt,
        proposedMealType: input.mealType,
        proposedTitle: input.title,
        items: draftItems,
        overallConfidence: input.overallConfidence,
        assumptions: input.assumptions,
        source: input.source,
        status: 'pending_review',
        createdAt: now,
        expiresAt: makeDraftExpiry(),
      };

      await db.mealDrafts.put(draft);
      return { draft, warnings };
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Updates a pending draft.
   */
  async updateDraft(id: string, patch: UpdateDraftInput): Promise<{ draft: MealDraft; warnings: string[] }> {
    try {
      const existing = await db.mealDrafts.get(id);
      if (!existing) {
        throw new DomainError('NOT_FOUND', `Draft ${id} not found.`);
      }
      if (existing.status !== 'pending_review') {
        throw new DomainError('CONFLICT', `Draft ${id} is not pending review (status: ${existing.status}).`);
      }

      const warnings: string[] = [];
      let items = existing.items;

      if (patch.items) {
        items = patch.items.map(itemInput => {
          const warn = checkMacroConsistency(
            itemInput.nutrition.caloriesKcal,
            itemInput.nutrition.proteinG,
            itemInput.nutrition.carbsG,
            itemInput.nutrition.fatG,
          );
          if (warn) warnings.push(`[${itemInput.name}] ${warn}`);
          return {
            id: uuid(),
            mealId: id,
            name: itemInput.name,
            normalizedName: normalizeFoodName(itemInput.name),
            quantity: itemInput.quantity,
            unit: itemInput.unit,
            grams: itemInput.grams,
            brand: itemInput.brand,
            nutrition: itemInput.nutrition,
            confidence: itemInput.confidence,
            estimationNotes: itemInput.estimationNotes,
          };
        });
      }

      const updated: MealDraft = {
        ...existing,
        proposedTitle: patch.proposedTitle ?? existing.proposedTitle,
        proposedMealType: patch.proposedMealType ?? existing.proposedMealType,
        proposedEatenAt: patch.proposedEatenAt ?? existing.proposedEatenAt,
        items,
        overallConfidence: patch.overallConfidence ?? existing.overallConfidence,
        assumptions: patch.assumptions ?? existing.assumptions,
      };

      await db.mealDrafts.put(updated);
      return { draft: updated, warnings };
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Commits a pending draft to a confirmed meal.
   * This is atomic — both meal and items are saved in a transaction.
   */
  async commitDraft(id: string): Promise<MealWithItems> {
    try {
      const draft = await db.mealDrafts.get(id);
      if (!draft) {
        throw new DomainError('NOT_FOUND', `Draft ${id} not found.`);
      }
      if (draft.status === 'committed') {
        throw new DomainError('CONFLICT', `Draft ${id} is already committed.`);
      }
      if (draft.status === 'discarded') {
        throw new DomainError('CONFLICT', `Draft ${id} has been discarded.`);
      }

      const now = nowUtc();
      const mealId = uuid();
      const items = makeItems(mealId, draft.items as CreateMealItemInput[]);
      const totals = sumNutrition(items);

      const meal: Meal = {
        id: mealId,
        localDate: utcToLocalDate(draft.proposedEatenAt),
        eatenAt: draft.proposedEatenAt,
        mealType: draft.proposedMealType,
        title: draft.proposedTitle,
        captureId: draft.captureId,
        source: draft.source === 'webmcp' ? 'webmcp' : 'manual',
        status: 'confirmed',
        totals,
        createdAt: now,
        updatedAt: now,
      };

      await db.transaction('rw', db.meals, db.mealItems, db.mealDrafts, async () => {
        await db.meals.put(meal);
        await db.mealItems.bulkPut(items);
        await db.mealDrafts.update(id, { status: 'committed' });
      });

      return { ...meal, items };
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Discards a pending draft.
   */
  async discardDraft(id: string): Promise<void> {
    try {
      const draft = await db.mealDrafts.get(id);
      if (!draft) {
        throw new DomainError('NOT_FOUND', `Draft ${id} not found.`);
      }
      await db.mealDrafts.update(id, { status: 'discarded' });
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Gets a draft by ID.
   */
  async getDraft(id: string): Promise<MealDraft | null> {
    try {
      return (await db.mealDrafts.get(id)) ?? null;
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Creates a confirmed meal directly (manual logging, no draft).
   */
  async createManualMeal(input: CreateMealInput): Promise<MealWithItems> {
    try {
      const now = nowUtc();
      const mealId = uuid();
      const items = makeItems(mealId, input.items);
      const totals = sumNutrition(items);

      const meal: Meal = {
        id: mealId,
        localDate: input.localDate,
        eatenAt: input.eatenAt,
        mealType: input.mealType,
        title: input.title,
        notes: input.notes,
        captureId: input.captureId,
        source: 'manual',
        status: 'confirmed',
        totals,
        createdAt: now,
        updatedAt: now,
      };

      await db.transaction('rw', db.meals, db.mealItems, async () => {
        await db.meals.put(meal);
        await db.mealItems.bulkPut(items);
      });

      return { ...meal, items };
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Updates an existing confirmed meal (replaces all items).
   */
  async updateMeal(id: string, input: CreateMealInput): Promise<MealWithItems> {
    try {
      const existing = await db.meals.get(id);
      if (!existing) {
        throw new DomainError('NOT_FOUND', `Meal ${id} not found.`);
      }

      const now = nowUtc();
      const items = makeItems(id, input.items);
      const totals = sumNutrition(items);

      const updated: Meal = {
        ...existing,
        localDate: input.localDate,
        eatenAt: input.eatenAt,
        mealType: input.mealType,
        title: input.title,
        notes: input.notes,
        totals,
        updatedAt: now,
      };

      await db.transaction('rw', db.meals, db.mealItems, async () => {
        await db.meals.put(updated);
        await db.mealItems.where('mealId').equals(id).delete();
        await db.mealItems.bulkPut(items);
      });

      return { ...updated, items };
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Deletes a confirmed meal and its items.
   */
  async deleteMeal(id: string): Promise<void> {
    try {
      const existing = await db.meals.get(id);
      if (!existing) {
        throw new DomainError('NOT_FOUND', `Meal ${id} not found.`);
      }

      await db.transaction('rw', db.meals, db.mealItems, async () => {
        await db.meals.delete(id);
        await db.mealItems.where('mealId').equals(id).delete();
      });
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Gets a meal with its items.
   */
  async getMeal(id: string): Promise<MealWithItems | null> {
    try {
      const meal = await db.meals.get(id);
      if (!meal) return null;
      const items = await db.mealItems.where('mealId').equals(id).toArray();
      return { ...meal, items };
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Lists meals in a date range.
   */
  async listMeals(opts: ListMealsOptions): Promise<Meal[]> {
    try {
      let query = db.meals.where('localDate').between(opts.from, opts.to, true, true);
      const results = await query.sortBy('eatenAt');

      let filtered = results;
      if (opts.mealType) {
        filtered = filtered.filter(m => m.mealType === opts.mealType);
      }
      if (opts.cursor) {
        const cursorIdx = filtered.findIndex(m => m.id === opts.cursor);
        if (cursorIdx >= 0) filtered = filtered.slice(cursorIdx + 1);
      }

      const limit = opts.limit ?? 20;
      return filtered.slice(0, limit);
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Gets meals for a specific local date.
   */
  async getMealsForDate(localDate: string): Promise<Meal[]> {
    try {
      const results = await db.meals.where('localDate').equals(localDate).sortBy('eatenAt');
      return results;
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Gets items for a meal.
   */
  async getMealItems(mealId: string): Promise<MealItem[]> {
    try {
      return db.mealItems.where('mealId').equals(mealId).toArray();
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Copies a previous meal to a new date.
   */
  async repeatMeal(
    sourceMealId: string,
    localDate: string,
    eatenAt: string,
    mealType?: Meal['mealType'],
  ): Promise<MealWithItems> {
    try {
      const source = await mealService.getMeal(sourceMealId);
      if (!source) {
        throw new DomainError('NOT_FOUND', `Meal ${sourceMealId} not found.`);
      }

      return mealService.createManualMeal({
        localDate,
        eatenAt,
        mealType: mealType ?? source.mealType,
        title: source.title,
        notes: source.notes,
        items: source.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          grams: item.grams,
          brand: item.brand,
          nutrition: item.nutrition,
        })),
      });
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Finds frequently eaten meals from history.
   */
  async findFrequentMeals(opts: { query?: string; limit?: number }): Promise<FrequentMealResult[]> {
    try {
      const limit = opts.limit ?? 10;
      const allMeals = await db.meals.toArray();
      const allItems = await db.mealItems.toArray();

      const itemsByMeal = new Map<string, MealItem[]>();
      for (const item of allItems) {
        if (!itemsByMeal.has(item.mealId)) itemsByMeal.set(item.mealId, []);
        itemsByMeal.get(item.mealId)!.push(item);
      }

      // Group by signature
      const sigMap = new Map<string, { meal: Meal; items: MealItem[]; count: number }>();
      const now = Date.now();

      for (const meal of allMeals) {
        const items = itemsByMeal.get(meal.id) ?? [];
        if (opts.query) {
          const q = opts.query.toLowerCase();
          const matches =
            meal.title.toLowerCase().includes(q) ||
            items.some(i => i.name.toLowerCase().includes(q));
          if (!matches) continue;
        }

        const sig = mealSignature(items);
        if (sigMap.has(sig)) {
          const entry = sigMap.get(sig)!;
          entry.count++;
          // Keep most recent meal
          if (meal.eatenAt > entry.meal.eatenAt) {
            entry.meal = meal;
            entry.items = items;
          }
        } else {
          sigMap.set(sig, { meal, items, count: 1 });
        }
      }

      // Rank: count * 3 + recencyWeight
      const results = [...sigMap.entries()].map(([signature, data]) => {
        const mealDate = new Date(data.meal.eatenAt).getTime();
        const daysSince = (now - mealDate) / (1000 * 60 * 60 * 24);
        const recencyWeight = Math.max(0, 10 - daysSince / 3);
        const score = data.count * 3 + recencyWeight;
        return { ...data, signature, score };
      });

      results.sort((a, b) => b.score - a.score);

      return results.slice(0, limit).map(r => ({
        meal: r.meal,
        items: r.items,
        count: r.count,
        signature: r.signature,
      }));
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Gets pending drafts (not committed or discarded, not expired).
   */
  async getPendingDrafts(): Promise<MealDraft[]> {
    try {
      const now = new Date().toISOString();
      return db.mealDrafts
        .where('status')
        .equals('pending_review')
        .filter(d => d.expiresAt > now)
        .toArray();
    } catch (err) {
      throw toDomainError(err);
    }
  },
};
