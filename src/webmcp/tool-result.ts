/**
 * Tool result envelope — consistent format for all WebMCP tool responses.
 */

type ToolResult<T> =
  | {
      ok: true;
      action: string;
      data: T;
      warnings?: string[];
      nextActions?: Array<{ tool: string; reason: string }>;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string>;
        recoverable: boolean;
      };
      nextActions?: Array<{ tool: string; reason: string }>;
    };

export function toolOk<T>(
  action: string,
  data: T,
  opts?: {
    warnings?: string[];
    nextActions?: Array<{ tool: string; reason: string }>;
  },
): string {
  const result: ToolResult<T> = {
    ok: true,
    action,
    data,
    ...(opts?.warnings?.length ? { warnings: opts.warnings } : {}),
    ...(opts?.nextActions?.length ? { nextActions: opts.nextActions } : {}),
  };
  return JSON.stringify(result);
}

export function toolError(
  code: string,
  message: string,
  opts?: {
    fieldErrors?: Record<string, string>;
    recoverable?: boolean;
    nextActions?: Array<{ tool: string; reason: string }>;
  },
): string {
  const result: ToolResult<never> = {
    ok: false,
    error: {
      code,
      message,
      ...(opts?.fieldErrors ? { fieldErrors: opts.fieldErrors } : {}),
      recoverable: opts?.recoverable ?? true,
    },
    ...(opts?.nextActions?.length ? { nextActions: opts.nextActions } : {}),
  };
  return JSON.stringify(result);
}

/**
 * Wraps a tool handler with error handling.
 * Converts DomainErrors and unknown errors to toolError responses.
 */
export function withErrorHandling(
  handler: (input: unknown, context: { signal: AbortSignal }) => Promise<string>,
): (input: unknown, context: { signal: AbortSignal }) => Promise<string> {
  return async (input, context) => {
    try {
      return await handler(input, context);
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
        const domainErr = err as { code: string; message: string; fieldErrors?: Record<string, string>; recoverable?: boolean };
        return toolError(domainErr.code, domainErr.message, {
          fieldErrors: domainErr.fieldErrors,
          recoverable: domainErr.recoverable,
        });
      }
      const message = err instanceof Error ? err.message : String(err);
      return toolError('INTERNAL_ERROR', message, { recoverable: false });
    }
  };
}
