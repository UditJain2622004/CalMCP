import type { ReactNode, CSSProperties } from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  variant?: 'default' | 'muted' | 'accent';
}

export function Card({ children, className, style, onClick, padding = 'md', variant = 'default' }: CardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={[
        styles.card,
        styles[`card--${variant}`],
        styles[`card--pad-${padding}`],
        onClick ? styles['card--clickable'] : '',
        className ?? '',
      ].join(' ')}
      style={style}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {children}
    </Tag>
  );
}
