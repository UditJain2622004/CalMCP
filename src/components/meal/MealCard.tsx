import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit, RotateCcw, ChevronDown } from 'lucide-react';
import type { Meal } from '../../domain/meals/meal.schema';
import { formatTime } from '../../domain/shared/dates';
import styles from './MealCard.module.css';

interface MealCardProps {
  meal: Meal;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

export function MealCard({ meal, onDelete, compact }: MealCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    onDelete?.(meal.id);
    setConfirmDelete(false);
  };

  return (
    <article className={styles.card}>
      <button
        className={styles.main}
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <div className={styles.info}>
          <span className={styles.name}>{meal.title}</span>
          <span className={styles.time}>{formatTime(meal.eatenAt)}</span>
        </div>
        <div className={styles.cals}>
          <span className={styles.calNum}>{Math.round(meal.totals.caloriesKcal)}</span>
          <span className={styles.calUnit}>kcal</span>
        </div>
        <ChevronDown
          size={16}
          className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className={styles.expanded}>
          {/* Macro pills */}
          <div className={styles.macros}>
            <span className={styles.macroPill} style={{ background: 'rgba(223, 100, 104, 0.1)', color: 'var(--color-protein)' }}>
              P {Math.round(meal.totals.proteinG)}g
            </span>
            <span className={styles.macroPill} style={{ background: 'rgba(201, 140, 73, 0.1)', color: 'var(--color-carbs)' }}>
              C {Math.round(meal.totals.carbsG)}g
            </span>
            <span className={styles.macroPill} style={{ background: 'rgba(93, 136, 214, 0.1)', color: 'var(--color-fat)' }}>
              F {Math.round(meal.totals.fatG)}g
            </span>
            {meal.totals.fiberG !== undefined && (
              <span className={styles.macroPill} style={{ background: 'rgba(124, 186, 110, 0.1)', color: 'var(--color-fiber)' }}>
                Fiber {Math.round(meal.totals.fiberG)}g
              </span>
            )}
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              className={styles.actionBtn}
              onClick={() => navigate(`/add`, { state: { editMealId: meal.id } })}
              aria-label={`Edit ${meal.title}`}
            >
              <Edit size={14} aria-hidden="true" />
              Edit
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => navigate('/add', { state: { repeatMealId: meal.id } })}
              aria-label={`Repeat ${meal.title}`}
            >
              <RotateCcw size={14} aria-hidden="true" />
              Repeat
            </button>
            {onDelete && (
              <button
                className={`${styles.actionBtn} ${confirmDelete ? styles.confirmDelete : styles.deleteBtn}`}
                onClick={handleDelete}
                aria-label={confirmDelete ? 'Confirm delete' : `Delete ${meal.title}`}
              >
                <Trash2 size={14} aria-hidden="true" />
                {confirmDelete ? 'Confirm?' : 'Delete'}
              </button>
            )}
          </div>

          {/* Source badge */}
          {meal.source !== 'manual' && (
            <span className={styles.sourceBadge}>
              {meal.source === 'webmcp' ? 'AI assisted' : 'Repeated'}
            </span>
          )}
        </div>
      )}
    </article>
  );
}
