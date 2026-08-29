import { NavLink } from 'react-router-dom';
import { Home, BookOpen, TrendingUp, Settings } from 'lucide-react';
import styles from './BottomNav.module.css';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Today', end: true },
  { to: '/diary', icon: BookOpen, label: 'Diary', end: false },
  { to: '/progress', icon: TrendingUp, label: 'Progress', end: false },
  { to: '/settings', icon: Settings, label: 'Settings', end: false },
] as const;

export function BottomNav() {
  return (
    <nav
      className={styles.nav}
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `${styles.item} ${isActive ? styles['item--active'] : ''}`
          }
          aria-current={undefined}
        >
          {({ isActive }) => (
            <>
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.75}
                aria-hidden="true"
              />
              <span className={styles.label}>{label}</span>
              {isActive && <span className={styles.indicator} />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
