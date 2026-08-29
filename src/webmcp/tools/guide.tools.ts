/**
 * Meta and guide tools — teach the agent how to use this app's tools.
 */

import { z } from 'zod';
import { toolOk, toolError, withErrorHandling } from '@/webmcp/tool-result';
import type { RegisteredTool } from '@/webmcp/model-context.types';
import { mealService } from '@/domain/meals/meal.service';
import { db } from '@/db/database';

const GetAppGuideInputSchema = z.object({
  topic: z.enum([
    'overview',
    'log_meal',
    'analyze_photo',
    'daily_review',
    'progress_review',
    'correct_meal',
    'privacy',
  ]),
});

const GUIDES: Record<string, object> = {
  overview: {
    description: 'NutriTrack is a local-first calorie and nutrition tracker. It does NOT include an AI model. You, as an external agent, provide analysis. The app stores data and exposes tools.',
    capabilities: [
      'Manual meal logging',
      'AI-assisted meal logging via draft workflow',
      'Hydration and weight tracking',
      'Progress charts and reports',
      'Food memory and repeat meals',
    ],
    key_tools: ['get_app_guide', 'get_workflow_status', 'get_user_context', 'get_daily_summary'],
  },
  log_meal: {
    steps: [
      'Call get_user_context to get the user\'s timezone and targets.',
      'Call create_meal_draft with item-level estimates (name, quantity, unit, nutrition).',
      'The meal is directly logged to the user\'s intake.',
      'Call get_daily_summary to show updated totals.',
    ],
    important: 'Provide accurate item-level nutrition estimates per entered quantity.',
  },
  analyze_photo: {
    steps: [
      'Have the user attach the meal photo directly in your conversation.',
      'Analyze the image using your visual capability.',
      'Call create_meal_draft with item-level estimates and confidence scores.',
      'The meal is directly logged to the user\'s intake.',
    ],
    note: 'Always add confidence: 0.0-1.0 per item and estimationNotes to explain assumptions.',
  },
  daily_review: {
    steps: [
      'Call get_daily_summary for today\'s totals.',
      'Call list_meals to see individual meals if needed.',
      'Use get_meal for specific meal details.',
      'Present facts; do not make medical recommendations.',
    ],
  },
  progress_review: {
    steps: [
      'Call get_user_context to get goal targets.',
      'Call get_progress_report with desired date range and metrics.',
      'Present facts with sample sizes; require 3+ data points before stating trends.',
    ],
  },
  correct_meal: {
    steps: [
      'Call get_meal with the meal ID to retrieve current data.',
      'Call update_meal with corrected data and userConfirmed: true.',
      'Call get_daily_summary to confirm updated totals.',
    ],
    note: 'Always show the user what changed before confirming correction.',
  },
  privacy: {
    data_location: 'All data is stored locally in IndexedDB on this device. Nothing is sent to servers by the app.',
    photo_policy: 'Photos never leave the device through app code. The user may separately share with you.',
    tool_scope: 'Tools are same-origin only by default. Not exposed to arbitrary websites.',
    agent_note: 'As an external agent, you receive only what tools return. Full history is not dumped to your context.',
  },
};

export const getAppGuideTool: RegisteredTool = {
  name: 'get_app_guide',
  title: 'Get App Guide',
  description: 'Returns workflow instructions and policies for this app. Call this first to understand how to use other tools.',
  inputSchema: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        enum: ['overview', 'log_meal', 'analyze_photo', 'daily_review', 'progress_review', 'correct_meal', 'privacy'],
        description: 'Which workflow or topic to get guidance for.',
      },
    },
    required: ['topic'],
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: withErrorHandling(async (input) => {
    const parsed = GetAppGuideInputSchema.safeParse(input);
    if (!parsed.success) {
      return toolError('VALIDATION_ERROR', 'Invalid topic.', {
        fieldErrors: { topic: 'Must be one of: overview, log_meal, analyze_photo, daily_review, progress_review, correct_meal, privacy' },
      });
    }
    return toolOk('describe_workflow', GUIDES[parsed.data.topic]);
  }),
};

// ── Workflow status tool ──────────────────────────────────────────────────

const GetWorkflowStatusSchema = z.object({
  workflow: z.enum(['log_meal', 'daily_review', 'progress_review']),
});

export const getWorkflowStatusTool: RegisteredTool = {
  name: 'get_workflow_status',
  title: 'Get Workflow Status',
  description: 'Returns the current state of a workflow — pending captures, draft IDs, and the recommended next tool to call.',
  inputSchema: {
    type: 'object',
    properties: {
      workflow: {
        type: 'string',
        enum: ['log_meal', 'daily_review', 'progress_review'],
        description: 'Which workflow to check.',
      },
    },
    required: ['workflow'],
  },
  annotations: { readOnlyHint: true },
  execute: withErrorHandling(async (input) => {
    const parsed = GetWorkflowStatusSchema.safeParse(input);
    if (!parsed.success) {
      return toolError('VALIDATION_ERROR', 'Invalid workflow.');
    }

    const { workflow } = parsed.data;

    if (workflow === 'log_meal') {
      // Check pending captures
      const pendingCapture = await db.captures
        .orderBy('createdAt')
        .last();

      const pendingDrafts = await mealService.getPendingDrafts();

      const status = {
        pendingCapture: pendingCapture
          ? {
              captureId: pendingCapture.id,
              createdAt: pendingCapture.createdAt,
              mimeType: pendingCapture.mimeType,
            }
          : null,
        pendingDrafts: pendingDrafts.map(d => ({
          id: d.id,
          title: d.proposedTitle,
          status: d.status,
          itemCount: d.items.length,
          createdAt: d.createdAt,
        })),
        nextAction: { tool: 'create_meal_draft', reason: 'Create and log a new meal with food information.' },
      };

      return toolOk('workflow_status', status);
    }

    return toolOk('workflow_status', { workflow, status: 'ready' });
  }),
};
