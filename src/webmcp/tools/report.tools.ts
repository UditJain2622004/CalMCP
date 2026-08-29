/**
 * Report and progress tools.
 */

import { z } from 'zod';
import { toolOk, toolError, withErrorHandling } from '@/webmcp/tool-result';
import type { RegisteredTool } from '@/webmcp/model-context.types';
import { reportService } from '@/domain/reports/report.service';
import { profileService } from '@/domain/profile/profile.service';
import { getTodayLocalDate } from '@/domain/shared/dates';

// ── get_daily_summary ─────────────────────────────────────────────────────

const GetDailySummarySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const getDailySummaryTool: RegisteredTool = {
  name: 'get_daily_summary',
  title: 'Get Daily Summary',
  description: 'Returns calories, macros, and hydration consumed vs target for a date. Defaults to today.',
  inputSchema: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Local date YYYY-MM-DD. Defaults to today.' },
    },
  },
  annotations: { readOnlyHint: true },
  execute: withErrorHandling(async (input) => {
    const parsed = GetDailySummarySchema.safeParse(input);
    if (!parsed.success) return toolError('VALIDATION_ERROR', 'Invalid date format.');

    const profile = await profileService.getProfile();
    const date = parsed.data.date ?? getTodayLocalDate(profile.timeZone);
    const summary = await reportService.getDailySummary(date);

    const caloriePercent = summary.caloriesTarget
      ? Math.round((summary.caloriesConsumed / summary.caloriesTarget) * 100)
      : null;

    return toolOk('daily_summary', {
      ...summary,
      caloriePercent,
      overTarget: summary.caloriesRemaining !== null && summary.caloriesRemaining < 0,
    });
  }),
};

// ── get_progress_report ───────────────────────────────────────────────────

const VALID_METRICS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'water', 'weight'] as const;

const GetProgressReportSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  metrics: z.array(z.enum(VALID_METRICS)).min(1).max(7),
  granularity: z.enum(['day', 'week']).default('day'),
});

export const getProgressReportTool: RegisteredTool = {
  name: 'get_progress_report',
  title: 'Get Progress Report',
  description: 'Returns nutrition and weight trend data with summary facts. Max 366 days. At least 3 data points required for trend statements.',
  inputSchema: {
    type: 'object',
    properties: {
      from: { type: 'string', description: 'Start local date YYYY-MM-DD.' },
      to: { type: 'string', description: 'End local date YYYY-MM-DD.' },
      metrics: {
        type: 'array',
        items: { type: 'string', enum: [...VALID_METRICS] },
        description: 'Which metrics to include.',
      },
      granularity: { type: 'string', enum: ['day', 'week'], description: 'Data point granularity.' },
    },
    required: ['from', 'to', 'metrics'],
  },
  annotations: { readOnlyHint: true },
  execute: withErrorHandling(async (input) => {
    const parsed = GetProgressReportSchema.safeParse(input);
    if (!parsed.success) {
      return toolError('VALIDATION_ERROR', 'Invalid report parameters.', {
        fieldErrors: Object.fromEntries(parsed.error.issues.map(i => [i.path.join('.'), i.message])),
      });
    }

    const report = await reportService.getProgressReport(parsed.data);

    const warnings: string[] = [];
    if (report.facts.loggedDays < 3) {
      warnings.push(`Only ${report.facts.loggedDays} logged day(s) in range. At least 3 are needed for trend statements.`);
    }

    return toolOk('progress_report', report, { warnings });
  }),
};
