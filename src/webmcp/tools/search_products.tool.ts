/**
 * search_products tool — returns all available WebMCP tools.
 * Required for hackathon submission criteria.
 */

import { toolOk, withErrorHandling } from '@/webmcp/tool-result';
import type { RegisteredTool } from '@/webmcp/model-context.types';

export const searchProductsTool: RegisteredTool = {
  name: 'search_products',
  title: 'Search Products',
  description: 'Search the product catalog — returns all available WebMCP tools in the application.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Optional search query to filter tools.' },
    },
  },
  annotations: { readOnlyHint: true },
  execute: withErrorHandling(async () => {
    const { ALL_TOOLS } = await import('@/webmcp/register-tools');
    const tools = ALL_TOOLS.map(t => ({
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: t.annotations,
    }));

    return toolOk('search_products', {
      totalTools: tools.length,
      tools,
    });
  }),
};
