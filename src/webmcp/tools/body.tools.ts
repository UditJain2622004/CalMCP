/**
 * Body tools — weight logging and progress.
 */

import { z } from 'zod';
import { toolOk, toolError, withErrorHandling } from '@/webmcp/tool-result';
import type { RegisteredTool } from '@/webmcp/model-context.types';
import { weightService } from '@/domain/weight/weight.service';
import { profileService } from '@/domain/profile/profile.service';
import { normalizeWeightToKg, computeBmi, bmiCategory, displayWeight } from '@/domain/shared/units';
import { getTodayLocalDate, nowUtc } from '@/domain/shared/dates';
import { db } from '@/db/database';

function uuid(): string { return crypto.randomUUID(); }

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
    // Non-fatal
  }
}

// ── log_weight ────────────────────────────────────────────────────────────

const LogWeightSchema = z.object({
  weight: z.number().positive(),
  unit: z.enum(['kg', 'lb']),
  recordedAt: z.string().datetime().optional(),
  note: z.string().max(200).optional(),
  userConfirmed: z.boolean(),
});

export const logWeightTool: RegisteredTool = {
  name: 'log_weight',
  title: 'Log Weight',
  description: 'Records a weigh-in. Converts to kg internally. Requires userConfirmed: true.',
  inputSchema: {
    type: 'object',
    properties: {
      weight: { type: 'number', description: 'Weight value.' },
      unit: { type: 'string', enum: ['kg', 'lb'] },
      recordedAt: { type: 'string', description: 'UTC ISO timestamp. Defaults to now.' },
      note: { type: 'string', description: 'Optional note.' },
      userConfirmed: { type: 'boolean' },
    },
    required: ['weight', 'unit', 'userConfirmed'],
  },
  annotations: { readOnlyHint: false },
  execute: withErrorHandling(async (input) => {
    const parsed = LogWeightSchema.safeParse(input);
    if (!parsed.success) return toolError('VALIDATION_ERROR', 'Invalid weight input.');

    if (!parsed.data.userConfirmed) {
      return toolError('CONFIRMATION_REQUIRED', 'userConfirmed must be true.');
    }

    const weightKg = normalizeWeightToKg(parsed.data.weight, parsed.data.unit);

    if (weightKg < 20 || weightKg > 500) {
      return toolError('VALIDATION_ERROR', 'Weight out of safe range (20-500 kg).');
    }

    // Check for implausible daily jump
    const profile = await profileService.getProfile();
    const latest = await weightService.getLatest();
    if (latest) {
      const diff = Math.abs(weightKg - latest.weightKg);
      if (diff > 10) {
        // Return warning but don't reject
      }
    }

    const now = nowUtc();
    const today = getTodayLocalDate(profile.timeZone);

    const entry = await weightService.addEntry({
      weightKg,
      localDate: today,
      recordedAt: parsed.data.recordedAt ?? now,
      note: parsed.data.note,
      source: 'webmcp',
    });

    await auditEvent('log_weight', 'add_weight', 'weight_entry', entry.id,
      `Weight logged: ${displayWeight(weightKg, profile.preferredWeightUnit)}`);

    const result: Record<string, unknown> = {
      entryId: entry.id,
      weightKg: entry.weightKg,
      displayWeight: displayWeight(weightKg, profile.preferredWeightUnit),
      recordedAt: entry.recordedAt,
    };

    if (profile.heightCm) {
      const bmi = computeBmi(weightKg, profile.heightCm);
      result.bmi = {
        value: Math.round(bmi * 10) / 10,
        category: bmiCategory(bmi),
        note: 'BMI is a limited screening measure and does not reflect individual health.',
      };
    }

    const warnings: string[] = [];
    if (latest) {
      const diff = Math.abs(weightKg - latest.weightKg);
      if (diff > 10) {
        warnings.push(`This entry (${displayWeight(weightKg, profile.preferredWeightUnit)}) differs by ${diff.toFixed(1)} kg from the previous entry. Verify this is correct.`);
      }
    }

    return toolOk('weight_logged', result, { warnings });
  }),
};

// ── get_weight_progress ───────────────────────────────────────────────────

const GetWeightProgressSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  includeNotes: z.boolean().optional().default(false),
});

export const getWeightProgressTool: RegisteredTool = {
  name: 'get_weight_progress',
  title: 'Get Weight Progress',
  description: 'Returns weigh-ins, 7-day moving average, and weight change for a date range.',
  inputSchema: {
    type: 'object',
    properties: {
      from: { type: 'string', description: 'Start local date.' },
      to: { type: 'string', description: 'End local date.' },
      includeNotes: { type: 'boolean', description: 'Include notes (untrusted content).' },
    },
    required: ['from', 'to'],
  },
  annotations: { readOnlyHint: true, untrustedContentHint: true },
  execute: withErrorHandling(async (input) => {
    const parsed = GetWeightProgressSchema.safeParse(input);
    if (!parsed.success) return toolError('VALIDATION_ERROR', 'Invalid date range.');

    const profile = await profileService.getProfile();
    const entries = await weightService.listEntries({ from: parsed.data.from, to: parsed.data.to });
    const movingAvg = weightService.computeMovingAverage(entries);

    const goal = await profileService.getActiveGoal();

    const result: Record<string, unknown> = {
      entries: entries.map((e, i) => ({
        id: e.id,
        localDate: e.localDate,
        weightKg: e.weightKg,
        display: displayWeight(e.weightKg, profile.preferredWeightUnit),
        movingAvg7d: movingAvg[i]?.avg ?? null,
        ...(parsed.data.includeNotes ? { note: e.note } : {}),
      })),
      summary: {
        count: entries.length,
        firstKg: entries[0]?.weightKg ?? null,
        lastKg: entries[entries.length - 1]?.weightKg ?? null,
        changeKg: entries.length >= 2
          ? Math.round((entries[entries.length - 1].weightKg - entries[0].weightKg) * 100) / 100
          : null,
        targetKg: goal?.targetWeightKg ?? null,
      },
    };

    if (entries.length < 3) {
      return toolOk('weight_progress', result, {
        warnings: [`Only ${entries.length} weigh-in(s) in range. At least 3 are needed for trend statements.`],
      });
    }

    return toolOk('weight_progress', result);
  }),
};
