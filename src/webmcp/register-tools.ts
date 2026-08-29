/**
 * Tool registration — registers all tools with the WebMCP adapter.
 * Called once from the WebMCPProvider.
 */

import { modelContextAdapter } from './model-context.adapter';
import { getAppGuideTool, getWorkflowStatusTool } from './tools/guide.tools';
import { getUserContextTool } from './tools/context.tools';
import {
  createMealDraftTool,
  updateMealDraftTool,
  getMealTool,
  listMealsTool,
  deleteMealTool,
  findFrequentMealsTool,
  repeatMealTool,
} from './tools/meal.tools';
import { getDailySummaryTool, getProgressReportTool } from './tools/report.tools';
import { logWeightTool, getWeightProgressTool } from './tools/body.tools';
import { logWaterTool, getHydrationSummaryTool } from './tools/hydration.tools';
import { searchProductsTool } from './tools/search_products.tool';

const ALL_TOOLS = [
  // Hackathon required tool
  searchProductsTool,
  // Meta / guide
  getAppGuideTool,
  getWorkflowStatusTool,
  // Context
  getUserContextTool,
  // Meal entry & updates
  createMealDraftTool,
  updateMealDraftTool,
  // Meal CRUD
  getMealTool,
  listMealsTool,
  deleteMealTool,
  findFrequentMealsTool,
  repeatMealTool,
  // Reports
  getDailySummaryTool,
  getProgressReportTool,
  // Body / weight
  logWeightTool,
  getWeightProgressTool,
  // Hydration
  logWaterTool,
  getHydrationSummaryTool,
];

/**
 * Registers all tools and returns an unregister function.
 */
export async function registerAllTools(): Promise<() => void> {
  if (!modelContextAdapter.isAvailable()) {
    console.info('[WebMCP] Model context not available. Tools not registered.');
    return () => {};
  }

  const unregisterFns: Array<() => void> = [];

  for (const tool of ALL_TOOLS) {
    try {
      const unregister = await modelContextAdapter.register(tool);
      unregisterFns.push(unregister);
    } catch (err) {
      console.error('[WebMCP] Failed to register tool:', tool.name, err);
    }
  }

  console.info(`[WebMCP] Registered ${unregisterFns.length} tools.`);

  return () => {
    for (const fn of unregisterFns) {
      try { fn(); } catch { /* ignore */ }
    }
  };
}

export { ALL_TOOLS };
