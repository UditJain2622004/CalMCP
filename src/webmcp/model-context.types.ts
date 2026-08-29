/**
 * WebMCP type definitions.
 * document.modelContext is experimental — guard all usage.
 */

export interface RegisteredTool {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (
    input: unknown,
    context: { signal: AbortSignal },
  ) => Promise<string> | string;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
}

export interface ModelContextAdapter {
  isAvailable(): boolean;
  register(tool: RegisteredTool): Promise<() => void>;
}

// Extend window/document types for TypeScript
declare global {
  interface Document {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modelContext?: any;
  }
  interface Navigator {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modelContext?: any;
  }
}
