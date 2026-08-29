import type { CSSProperties } from 'react';
import styles from './ProgressRing.module.css';

interface ProgressRingProps {
  percent: number;          // 0–100 (or beyond for over-target)
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  overTarget?: boolean;     // whether value exceeds target
}

export function ProgressRing({
  percent,
  size = 120,
  strokeWidth = 10,
  color = 'var(--color-accent)',
  trackColor = 'var(--color-border)',
  label,
  sublabel,
  overTarget = false,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(percent, 100);
  const offset = circumference - (clampedPercent / 100) * circumference;

  const ringColor = overTarget ? 'var(--color-warning)' : color;

  return (
    <div
      className={styles.ring}
      style={{ width: size, height: size } as CSSProperties}
      role="img"
      aria-label={label ? `${label}: ${Math.round(percent)}%` : `${Math.round(percent)}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {(label || sublabel) && (
        <div className={styles.labels} aria-hidden="true">
          {label && <span className={styles.label}>{label}</span>}
          {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
