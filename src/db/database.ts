import Dexie, { type EntityTable } from 'dexie';
import type { Profile, Goal } from '@/domain/profile/profile.schema';
import type { Meal, MealItem, MealDraft } from '@/domain/meals/meal.schema';
import type { WeightEntry } from '@/domain/weight/weight.schema';
import type { WaterEntry } from '@/domain/hydration/hydration.schema';

// ── Capture (photos stored as Blob) ────────────────────────────────────────

export interface Capture {
  id: string;
  blob: Blob;
  mimeType: string;
  width?: number;
  height?: number;
  sizeBytes: number;
  createdAt: string;
}

// ── Settings (key/value store) ─────────────────────────────────────────────

export interface SettingsRecord {
  key: string;
  value: unknown;
}

// ── Audit Event ────────────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  occurredAt: string;
  action: string;
  entityType: string;
  entityId: string;
  source: 'webmcp';
  toolName: string;
  summary: string;
}

// ── Database ───────────────────────────────────────────────────────────────

export class CalorieTrackerDB extends Dexie {
  profiles!: EntityTable<Profile, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  meals!: EntityTable<Meal, 'id'>;
  mealItems!: EntityTable<MealItem, 'id'>;
  mealDrafts!: EntityTable<MealDraft, 'id'>;
  captures!: EntityTable<Capture, 'id'>;
  weightEntries!: EntityTable<WeightEntry, 'id'>;
  waterEntries!: EntityTable<WaterEntry, 'id'>;
  settings!: EntityTable<SettingsRecord, 'key'>;
  auditEvents!: EntityTable<AuditEvent, 'id'>;

  constructor() {
    super('webmcp-calorie-tracker');
    this.version(1).stores({
      profiles: 'id, updatedAt',
      goals: 'id, profileId, updatedAt',
      meals: 'id, localDate, eatenAt, mealType, status, source, updatedAt',
      mealItems: 'id, mealId, normalizedName',
      mealDrafts: 'id, captureId, status, createdAt, expiresAt',
      captures: 'id, createdAt',
      weightEntries: 'id, localDate, recordedAt',
      waterEntries: 'id, localDate, recordedAt',
      settings: 'key',
      auditEvents: 'id, occurredAt, action, entityType, entityId',
    });
  }
}

export const db = new CalorieTrackerDB();

// ── Real-time UI synchronization ─────────────────────────────────────────

function notifyDataChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tracker:data-changed'));
  }
}

const WATCHED_TABLES = [
  'profiles',
  'goals',
  'meals',
  'mealItems',
  'mealDrafts',
  'captures',
  'weightEntries',
  'waterEntries',
  'settings',
];

WATCHED_TABLES.forEach(tableName => {
  const table = db.table(tableName);
  table.hook('creating', () => { setTimeout(notifyDataChanged, 0); });
  table.hook('updating', () => { setTimeout(notifyDataChanged, 0); });
  table.hook('deleting', () => { setTimeout(notifyDataChanged, 0); });
});

/**
 * Cleanup expired meal drafts.
 * Called at app startup — never removes confirmed meals.
 */
export async function cleanupExpiredDrafts(): Promise<void> {
  const now = new Date().toISOString();
  await db.mealDrafts
    .where('status')
    .equals('pending_review')
    .filter(draft => draft.expiresAt < now)
    .modify({ status: 'discarded' });
}
