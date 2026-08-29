/**
 * Hydration tools — log water, get daily summary.
 */

import { z } from 'zod';
import { toolOk, toolError, withErrorHandling } from '@/webmcp/tool-result';
import type { RegisteredTool } from '@/webmcp/model-context.types';
import { hydrationService } from '@/domain/hydration/hydration.service';
import { profileService } from '@/domain/profile/profile.service';
import { normalizeWaterToMl, displayWater } from '@/domain/shared/units';
import { getTodayLocalDate, nowUtc } from '@/domain/shared/dates';
import { db } from '@/db/database';

function uuid(): string { return crypto.randomUUID(); }

async function auditEvent(toolName: string, action: string, entityType: string, entityId: string, summary: string) {
  try {
    await db.auditEvents.put({
      id: uuid(), occurredAt: nowUtc(), action, entityType, entityId, source: 'webmcp', toolName, summary,
    });
  } catch { /* non-fatal */ }
}

// ── log_water ─────────────────────────────────────────────────────────────

const LogWaterSchema = z.object({
  amount: z.number().positive(),
  unit: z.enum(['ml', 'l', 'fl_oz', 'cup']),
  recordedAt: z.string().datetime().optional(),
});

export const logWaterTool: RegisteredTool = {
  name: 'log_water',
  title: 'Log Water',
  description: 'Records water consumption. Converts to ml internally. Small amounts committed directly.',
  inputSchema: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'Amount of water consumed.' },
      unit: { type: 'string', enum: ['ml', 'l', 'fl_oz', 'cup'] },
      recordedAt: { type: 'string', description: 'UTC ISO timestamp. Defaults to now.' },
    },
    required: ['amount', 'unit'],
  },
  annotations: { readOnlyHint: false },
  execute: withErrorHandling(async (input) => {
    const parsed = LogWaterSchema.safeParse(input);
    if (!parsed.success) return toolError('VALIDATION_ERROR', 'Invalid water input.');

    const amountMl = normalizeWaterToMl(parsed.data.amount, parsed.data.unit);

    if (amountMl < 1 || amountMl > 5000) {
      return toolError('VALIDATION_ERROR', 'Water amount must be between 1ml and 5000ml.');
    }

    const profile = await profileService.getProfile();
    const today = getTodayLocalDate(profile.timeZone);

    const entry = await hydrationService.addWater({
      amountMl,
      localDate: today,
      recordedAt: parsed.data.recordedAt,
      source: 'webmcp',
    });

    await auditEvent('log_water', 'add_water', 'water_entry', entry.id,
      `Water logged: ${displayWater(amountMl)}`);

    const dailyTotal = await hydrationService.getDailyTotal(today);
    const goal = await profileService.getActiveGoal();

    return toolOk('water_logged', {
      entryId: entry.id,
      amountMl: Math.round(amountMl),
      display: displayWater(amountMl),
      dailyTotal: Math.round(dailyTotal),
      dailyTotalDisplay: displayWater(dailyTotal),
      target: goal?.waterTargetMl ?? null,
      remaining: goal ? Math.max(0, goal.waterTargetMl - dailyTotal) : null,
    });
  }),
};

// ── get_hydration_summary ─────────────────────────────────────────────────

const GetHydrationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const getHydrationSummaryTool: RegisteredTool = {
  name: 'get_hydration_summary',
  title: 'Get Hydration Summary',
  description: 'Returns daily water consumed, target, and recent entry times.',
  inputSchema: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Local date YYYY-MM-DD. Defaults to today.' },
    },
  },
  annotations: { readOnlyHint: true },
  execute: withErrorHandling(async (input) => {
    const parsed = GetHydrationSchema.safeParse(input);
    if (!parsed.success) return toolError('VALIDATION_ERROR', 'Invalid date.');

    const profile = await profileService.getProfile();
    const date = parsed.data.date ?? getTodayLocalDate(profile.timeZone);
    const goal = await profileService.getActiveGoal();

    const [total, entries] = await Promise.all([
      hydrationService.getDailyTotal(date),
      hydrationService.getEntriesForDate(date),
    ]);

    return toolOk('hydration_summary', {
      date,
      totalMl: Math.round(total),
      totalDisplay: displayWater(total),
      targetMl: goal?.waterTargetMl ?? null,
      remaining: goal ? Math.max(0, goal.waterTargetMl - total) : null,
      percentOfTarget: goal
        ? Math.round((total / goal.waterTargetMl) * 100)
        : null,
      recentEntries: entries.slice(-5).map(e => ({
        id: e.id,
        amountMl: e.amountMl,
        display: displayWater(e.amountMl),
        recordedAt: e.recordedAt,
      })),
    });
  }),
};
