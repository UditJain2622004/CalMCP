/**
 * WebMCP model context adapter.
 * Wraps document.modelContext with a clean interface.
 * All WebMCP-specific code stays in this module.
 */

import type { RegisteredTool, ModelContextAdapter } from './model-context.types';

/**
 * Gets the native model context object.
 * Uses document.modelContext first (current spec), then navigator.modelContext (compat fallback).
 */
function getNativeContext(): unknown {
  return document.modelContext ?? navigator.modelContext ?? null;
}

/**
 * Creates the WebMCP adapter.
 */
export function createModelContextAdapter(): ModelContextAdapter {
  return {
    isAvailable(): boolean {
      return getNativeContext() !== null;
    },

    async register(tool: RegisteredTool): Promise<() => void> {
      const ctx = getNativeContext();
      if (!ctx) {
        console.warn('[WebMCP] document.modelContext not available. Tool not registered:', tool.name);
        return () => {};
      }

      try {
        let isUnregistered = false;
        const activeControllers = new Set<AbortController>();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const context = ctx as any;
        if (typeof context.registerTool === 'function') {
          await context.registerTool({
            name: tool.name,
            title: tool.title,
            description: tool.description,
            inputSchema: tool.inputSchema,
            execute: (input: unknown, opts?: { signal?: AbortSignal }) => {
              if (isUnregistered) {
                const abortedController = new AbortController();
                abortedController.abort();
                return tool.execute(input, { signal: abortedController.signal });
              }

              const callController = new AbortController();
              activeControllers.add(callController);

              const onCallerAbort = () => {
                callController.abort();
              };

              if (opts?.signal) {
                if (opts.signal.aborted) {
                  callController.abort();
                } else {
                  opts.signal.addEventListener('abort', onCallerAbort, { once: true });
                }
              }

              return Promise.resolve(tool.execute(input, { signal: callController.signal })).finally(() => {
                activeControllers.delete(callController);
                if (opts?.signal) {
                  opts.signal.removeEventListener('abort', onCallerAbort);
                }
              });
            },
            annotations: tool.annotations,
          });
        }

        return () => {
          isUnregistered = true;
          for (const ctrl of activeControllers) {
            ctrl.abort();
          }
          activeControllers.clear();

          if (typeof context.unregisterTool === 'function') {
            context.unregisterTool(tool.name);
          }
        };
      } catch (err) {
        console.error('[WebMCP] Failed to register tool:', tool.name, err);
        return () => {};
      }
    },
  };
}

export const modelContextAdapter = createModelContextAdapter();
