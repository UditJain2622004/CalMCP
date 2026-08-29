import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { DesktopRail } from './DesktopRail';
import { ErrorBoundary } from '../common/ErrorBoundary';
import styles from './AppShell.module.css';

export default function AppShell() {
  const location = useLocation();

  // Pages without bottom nav (full-screen flows)
  const hideNav = location.pathname.startsWith('/add/') ||
    location.pathname.startsWith('/meals/drafts/');

  return (
    <div className={styles.shell}>
      {/* Desktop left rail — shown at 1024px+ */}
      <DesktopRail />

      {/* Main content area */}
      <main className={styles.main} id="main-content">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Mobile bottom navigation */}
      {!hideNav && <BottomNav />}

      {/* Accessible live region for screen reader announcements */}
      <div
        id="live-region"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </div>
  );
}
