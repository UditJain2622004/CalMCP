import { NavLink } from 'react-router-dom';
import { Home, BookOpen, TrendingUp, Settings, Bot, Target, Droplets, Scale } from 'lucide-react';
import styles from './DesktopRail.module.css';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Today', end: true },
  { to: '/diary', icon: BookOpen, label: 'Diary', end: false },
  { to: '/progress', icon: TrendingUp, label: 'Progress', end: false },
] as const;

const SECONDARY_ITEMS = [
  { to: '/weight', icon: Scale, label: 'Weight', end: false },
  { to: '/hydration', icon: Droplets, label: 'Hydration', end: false },
  { to: '/goals', icon: Target, label: 'Goals', end: false },
  { to: '/agent-tools', icon: Bot, label: 'Agent Tools', end: false },
  { to: '/settings', icon: Settings, label: 'Settings', end: false },
] as const;

export function DesktopRail() {
  return (
    <nav
      className={styles.rail}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className={styles.logo}>
        <span className={styles.logoIcon}>🥗</span>
        <span className={styles.logoText}>NutriTrack</span>
      </div>

      {/* Primary nav */}
      <div className={styles.group}>
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `${styles.item} ${isActive ? styles['item--active'] : ''}`
            }
          >
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      <hr className={styles.divider} />

      {/* Secondary nav */}
      <div className={styles.group}>
        {SECONDARY_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `${styles.item} ${isActive ? styles['item--active'] : ''}`
            }
          >
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
