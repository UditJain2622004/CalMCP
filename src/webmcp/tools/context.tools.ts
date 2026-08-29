/**
 * Context tools — get user profile, photo context, daily summary.
 */

import { z } from 'zod';
import { toolOk, toolError, withErrorHandling } from '@/webmcp/tool-result';
import type { RegisteredTool } from '@/webmcp/model-context.types';
import { profileService } from '@/domain/profile/profile.service';
import { db } from '@/db/database';
import { getTodayLocalDate } from '@/domain/shared/dates';

// ── get_user_context ──────────────────────────────────────────────────────

const GetUserContextSchema = z.object({
  includeBodyMetrics: z.boolean().optional().default(false),
});

export const getUserContextTool: RegisteredTool = {
  name: 'get_user_context',
  title: 'Get User Context',
  description: 'Returns user preferences, locale, timezone, and nutrition targets needed for calculations.',
  inputSchema: {
    type: 'object',
    properties: {
      includeBodyMetrics: {
        type: 'boolean',
        description: 'If true, includes height and weight (sensitive — only request if needed).',
      },
    },
  },
  annotations: { readOnlyHint: true },
  execute: withErrorHandling(async (input) => {
    const parsed = GetUserContextSchema.safeParse(input);
    if (!parsed.success) {
      return toolError('VALIDATION_ERROR', 'Invalid input.');
    }

    const [profile, goal] = await Promise.all([
      profileService.getProfile(),
      profileService.getActiveGoal(),
    ]);

    const data: Record<string, unknown> = {
      preferredWeightUnit: profile.preferredWeightUnit,
      preferredEnergyUnit: profile.preferredEnergyUnit,
      locale: profile.locale,
      timeZone: profile.timeZone,
      todayLocalDate: getTodayLocalDate(profile.timeZone),
      targets: goal
        ? {
            caloriesKcal: goal.calorieTargetKcal,
            proteinG: goal.proteinTargetG,
            carbsG: goal.carbsTargetG,
            fatG: goal.fatTargetG,
            fiberG: goal.fiberTargetG,
            waterMl: goal.waterTargetMl,
            goalType: goal.type,
          }
        : null,
    };

    if (parsed.data.includeBodyMetrics) {
      data.bodyMetrics = {
        heightCm: profile.heightCm ?? null,
        currentWeightKg: profile.currentWeightKg ?? null,
      };
    }

    return toolOk('user_context', data);
  }),
};
