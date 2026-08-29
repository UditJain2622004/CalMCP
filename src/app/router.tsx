import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AppShell from '../components/layout/AppShell';
import { Skeleton } from '../components/common/Skeleton';

// Lazy load pages for performance
const TodayPage = lazy(() => import('../pages/TodayPage'));
const DiaryPage = lazy(() => import('../pages/DiaryPage'));
const ProgressPage = lazy(() => import('../pages/ProgressPage'));
const AddMealPage = lazy(() => import('../pages/AddMealPage'));
const PhotoCapturePage = lazy(() => import('../pages/PhotoCapturePage'));
const MealReviewPage = lazy(() => import('../pages/MealReviewPage'));
const WeightPage = lazy(() => import('../pages/WeightPage'));
const HydrationPage = lazy(() => import('../pages/HydrationPage'));
const GoalsPage = lazy(() => import('../pages/GoalsPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const AgentToolsPage = lazy(() => import('../pages/AgentToolsPage'));
const ManualEntryPage = lazy(() => import('../pages/ManualEntryPage'));

function PageLoader() {
  return (
    <div style={{ padding: '24px' }}>
      <Skeleton style={{ height: 40, marginBottom: 16 }} />
      <Skeleton style={{ height: 120, marginBottom: 12 }} />
      <Skeleton style={{ height: 80, marginBottom: 12 }} />
      <Skeleton style={{ height: 80 }} />
    </div>
  );
}

function withSuspense(element: React.ReactElement) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: withSuspense(<TodayPage />),
      },
      {
        path: 'diary',
        element: withSuspense(<DiaryPage />),
      },
      {
        path: 'progress',
        element: withSuspense(<ProgressPage />),
      },
      {
        path: 'add',
        element: withSuspense(<AddMealPage />),
      },
      {
        path: 'add/photo',
        element: withSuspense(<PhotoCapturePage />),
      },
      {
        path: 'add/manual',
        element: withSuspense(<ManualEntryPage />),
      },
      {
        path: 'meals/drafts/:id',
        element: withSuspense(<MealReviewPage />),
      },
      {
        path: 'weight',
        element: withSuspense(<WeightPage />),
      },
      {
        path: 'hydration',
        element: withSuspense(<HydrationPage />),
      },
      {
        path: 'goals',
        element: withSuspense(<GoalsPage />),
      },
      {
        path: 'settings',
        element: withSuspense(<SettingsPage />),
      },
      {
        path: 'agent-tools',
        element: withSuspense(<AgentToolsPage />),
      },
    ],
  },
]);
