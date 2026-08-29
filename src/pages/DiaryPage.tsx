import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { MealCard } from '@/components/meal/MealCard';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { mealService } from '@/domain/meals/meal.service';
import { getTodayLocalDate, addDaysToLocalDate, relativeDateLabel } from '@/domain/shared/dates';
import type { Meal } from '@/domain/meals/meal.schema';
import { useTrackerData } from '@/hooks/useTrackerData';
import styles from './DiaryPage.module.css';

export default function DiaryPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(getTodayLocalDate());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMeals = useCallback(async () => {
    setLoading(true);
    const result = await mealService.getMealsForDate(date);
    setMeals(result.sort((a, b) => a.eatenAt.localeCompare(b.eatenAt)));
    setLoading(false);
  }, [date]);

  useEffect(() => { loadMeals(); }, [loadMeals]);

  useTrackerData(loadMeals, [loadMeals]);

  const handleDeleteMeal = async (id: string) => {
    await mealService.deleteMeal(id);
    await loadMeals();
  };

  const totalCals = meals.reduce((s, m) => s + m.totals.caloriesKcal, 0);

  const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
  const grouped = MEAL_TYPES.reduce((acc, type) => {
    acc[type] = meals.filter(m => m.mealType === type);
    return acc;
  }, {} as Record<string, Meal[]>);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Diary</h1>
        <Button
          size="sm"
          variant="secondary"
          icon={<Plus size={14} />}
          onClick={() => navigate('/add')}
        >
          Add
        </Button>
      </header>

      {/* Date navigation */}
      <div className={styles.dateNav}>
        <button
          className={styles.navBtn}
          onClick={() => setDate(d => addDaysToLocalDate(d, -1))}
          aria-label="Previous day"
        >
          <ChevronLeft size={20} />
        </button>
        <div className={styles.dateInfo}>
          <span className={styles.dateLabel}>{relativeDateLabel(date)}</span>
          <span className={styles.dateSub}>
            {new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
              weekday: 'short', month: 'short', day: 'numeric',
            })}
          </span>
        </div>
        <button
          className={styles.navBtn}
          onClick={() => setDate(d => addDaysToLocalDate(d, 1))}
          aria-label="Next day"
          disabled={date >= getTodayLocalDate()}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Total */}
      {meals.length > 0 && (
        <div className={styles.dayTotal}>
          <span>{Math.round(totalCals)} kcal total</span>
          <span className={styles.mealCount}>{meals.length} meal{meals.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {loading ? (
        <div>
          {[0,1,2].map(i => <Skeleton key={i} style={{ height: 60, borderRadius: 10, marginBottom: 8 }} />)}
        </div>
      ) : meals.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={40} strokeWidth={1.5} />}
          title="Nothing logged yet"
          description="Add a meal manually, or use your AI agent to analyze a photo."
          action={
            <Button onClick={() => navigate('/add')} icon={<Plus size={16} />}>
              Add meal
            </Button>
          }
        />
      ) : (
        <div className={styles.mealGroups}>
          {MEAL_TYPES.map(type => {
            const typeMeals = grouped[type];
            if (typeMeals.length === 0) return null;
            return (
              <section key={type} className={styles.group}>
                <h2 className={styles.groupTitle}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                  <span className={styles.groupCals}>
                    {Math.round(typeMeals.reduce((s, m) => s + m.totals.caloriesKcal, 0))} kcal
                  </span>
                </h2>
                <div className={styles.groupMeals}>
                  {typeMeals.map(meal => (
                    <MealCard key={meal.id} meal={meal} onDelete={handleDeleteMeal} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
