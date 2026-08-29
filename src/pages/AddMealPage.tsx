import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, PenLine, RotateCcw, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/common/Card';
import styles from './AddMealPage.module.css';

export default function AddMealPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { mealType?: string } | null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.back}
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className={styles.title}>Add Meal</h1>
      </header>

      <div className={styles.options}>
        <Card
          className={styles.option}
          onClick={() => navigate('/add/photo')}
          padding="lg"
        >
          <div className={styles.optionIcon} style={{ background: 'rgba(50, 166, 106, 0.1)', color: 'var(--color-accent)' }}>
            <Camera size={24} aria-hidden="true" />
          </div>
          <div>
            <h2 className={styles.optionTitle}>Use your agent to analyze</h2>
            <p className={styles.optionDesc}>
              Take or select a photo, then let your AI agent identify the food and estimate nutrition.
            </p>
          </div>
        </Card>

        <Card
          className={styles.option}
          onClick={() => navigate('/add/manual', { state: { mealType: state?.mealType } })}
          padding="lg"
        >
          <div className={styles.optionIcon} style={{ background: 'rgba(93, 136, 214, 0.1)', color: 'var(--color-fat)' }}>
            <PenLine size={24} aria-hidden="true" />
          </div>
          <div>
            <h2 className={styles.optionTitle}>Enter manually</h2>
            <p className={styles.optionDesc}>
              Type in food items and their nutrition information directly.
            </p>
          </div>
        </Card>

        <Card
          className={styles.option}
          onClick={() => navigate('/diary?repeat=true')}
          padding="lg"
        >
          <div className={styles.optionIcon} style={{ background: 'rgba(201, 140, 73, 0.1)', color: 'var(--color-carbs)' }}>
            <RotateCcw size={24} aria-hidden="true" />
          </div>
          <div>
            <h2 className={styles.optionTitle}>Repeat frequent meal</h2>
            <p className={styles.optionDesc}>
              Copy a meal you've logged before — great for regular meals.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
