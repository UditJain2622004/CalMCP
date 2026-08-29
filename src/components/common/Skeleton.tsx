import type { CSSProperties } from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  style?: CSSProperties;
  className?: string;
  rounded?: boolean;
}

export function Skeleton({ style, className, rounded }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${rounded ? styles.rounded : ''} ${className ?? ''}`}
      style={style}
      aria-hidden="true"
    />
  );
}
