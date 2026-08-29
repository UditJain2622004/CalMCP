import { db } from '@/db/database';
import { toDomainError } from '@/domain/shared/errors';
import { nowUtc } from '@/domain/shared/dates';
import type { WeightEntry, AddWeightInput } from './weight.schema';

function uuid(): string {
  return crypto.randomUUID();
}

export const weightService = {
  /**
   * Adds a new weight entry.
   */
  async addEntry(input: AddWeightInput): Promise<WeightEntry> {
    try {
      const now = nowUtc();
      const entry: WeightEntry = {
        id: uuid(),
        localDate: input.localDate,
        recordedAt: input.recordedAt ?? now,
        weightKg: input.weightKg,
        note: input.note,
        source: input.source ?? 'manual',
        createdAt: now,
        updatedAt: now,
      };
      await db.weightEntries.put(entry);
      return entry;
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Lists weight entries within a date range, sorted ascending.
   */
  async listEntries(opts: { from: string; to: string }): Promise<WeightEntry[]> {
    try {
      return db.weightEntries
        .where('localDate')
        .between(opts.from, opts.to, true, true)
        .sortBy('recordedAt');
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Returns the most recent weight entry.
   */
  async getLatest(): Promise<WeightEntry | null> {
    try {
      const entries = await db.weightEntries.orderBy('recordedAt').last();
      return entries ?? null;
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Deletes a weight entry.
   */
  async deleteEntry(id: string): Promise<void> {
    try {
      await db.weightEntries.delete(id);
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Calculates 7-day moving average from sorted entries.
   */
  computeMovingAverage(
    entries: WeightEntry[],
    windowSize = 7,
  ): Array<{ localDate: string; avg: number | null }> {
    return entries.map((_, idx) => {
      if (idx < windowSize - 1) return { localDate: entries[idx].localDate, avg: null };
      const window = entries.slice(idx - windowSize + 1, idx + 1);
      const avg = window.reduce((sum, e) => sum + e.weightKg, 0) / window.length;
      return { localDate: entries[idx].localDate, avg: Math.round(avg * 100) / 100 };
    });
  },
};
