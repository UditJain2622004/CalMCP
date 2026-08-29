/**
 * WebMCP Provider — registers tools once on mount, handles cleanup.
 */

import { useEffect, useRef, createContext, useContext, type ReactNode } from 'react';
import { registerAllTools } from './register-tools';
import { modelContextAdapter } from './model-context.adapter';

interface WebMCPContextValue {
  isAvailable: boolean;
}

const WebMCPContext = createContext<WebMCPContextValue>({ isAvailable: false });

export function useWebMCP() {
  return useContext(WebMCPContext);
}

interface WebMCPProviderProps {
  children: ReactNode;
}

export function WebMCPProvider({ children }: WebMCPProviderProps) {
  const unregisterRef = useRef<(() => void) | null>(null);
  const registeredRef = useRef(false);

  useEffect(() => {
    // Prevent double registration in React Strict Mode
    if (registeredRef.current) return;
    registeredRef.current = true;

    let cancelled = false;

    registerAllTools().then(unregister => {
      if (cancelled) {
        unregister();
        return;
      }
      unregisterRef.current = unregister;
    });

    return () => {
      cancelled = true;
      registeredRef.current = false;
      unregisterRef.current?.();
      unregisterRef.current = null;
    };
  }, []);

  return (
    <WebMCPContext.Provider value={{ isAvailable: modelContextAdapter.isAvailable() }}>
      {children}
    </WebMCPContext.Provider>
  );
}
