/**
 * App-wide providers composition.
 * All context providers and initialization are composed here.
 */

import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { WebMCPProvider } from '../webmcp/WebMCPProvider';
import { router } from './router';

export function Providers() {
  return (
    <ErrorBoundary>
      <WebMCPProvider>
        <RouterProvider router={router} />
      </WebMCPProvider>
    </ErrorBoundary>
  );
}
