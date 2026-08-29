import { db } from '@/db/database';
import { toDomainError } from '@/domain/shared/errors';
import { nowUtc } from '@/domain/shared/dates';
import type { WaterEntry, AddWaterInput } from './hydration.schema';

function uuid(): string {
  return crypto.randomUUID();
}

export const hydrationService = {
  /**
   * Adds a water entry.
   */
  async addWater(input: AddWaterInput): Promise<WaterEntry> {
    try {
      const now = nowUtc();
      const entry: WaterEntry = {
        id: uuid(),
        localDate: input.localDate,
        recordedAt: input.recordedAt ?? now,
        amountMl: input.amountMl,
        source: input.source,
        createdAt: now,
      };
      await db.waterEntries.put(entry);
      return entry;
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Gets the total water consumed on a given local date.
   */
  async getDailyTotal(localDate: string): Promise<number> {
    try {
      const entries = await db.waterEntries
        .where('localDate')
        .equals(localDate)
        .toArray();
      return entries.reduce((sum, e) => sum + e.amountMl, 0);
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Gets all water entries for a date.
   */
  async getEntriesForDate(localDate: string): Promise<WaterEntry[]> {
    try {
      return db.waterEntries
        .where('localDate')
        .equals(localDate)
        .sortBy('recordedAt');
    } catch (err) {
      throw toDomainError(err);
    }
  },

  /**
   * Deletes the most recent water entry (quick undo).
   */
  async deleteEntry(id: string): Promise<void> {
    try {
      await db.waterEntries.delete(id);
    } catch (err) {
      throw toDomainError(err);
    }
  },
};
