import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Droplets, Flame, TrendingUp } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ProgressRing } from '../components/common/ProgressRing';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/Skeleton';
import { MealCard } from '../components/meal/MealCard';
import { reportService } from '../domain/reports/report.service';
import { profileService } from '../domain/profile/profile.service';
import { hydrationService } from '../domain/hydration/hydration.service';
import { mealService } from '../domain/meals/meal.service';
import { getTodayLocalDate, relativeDateLabel } from '../domain/shared/dates';
import { displayWater } from '../domain/shared/units';
import { consumedPercent, remainingBudget } from '../domain/meals/meal.math';
import type { DailySummary } from '../domain/reports/report.schema';
import type { Meal } from '../domain/meals/meal.schema';
import type { Profile } from '../domain/profile/profile.schema';
import { useTrackerData } from '../hooks/useTrackerData';
import styles from './TodayPage.module.css';

const QUICK_WATER_OPTIONS = [150, 250, 330, 500];

function announce(msg: string) {
  const region = document.getElementById('live-region');
  if (region) { region.textContent = ''; setTimeout(() => { region.textContent = msg; }, 10); }
}

export default function TodayPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [date, setDate] = useState(getTodayLocalDate());
  const [addingWater, setAddingWater] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [prof, sum, dayMeals] = await Promise.all([
        profileService.getProfile(),
        reportService.getDailySummary(date),
        mealService.getMealsForDate(date),
      ]);
      setProfile(prof);
      setSummary(sum);
      setMeals(dayMeals.sort((a, b) => a.eatenAt.localeCompare(b.eatenAt)));
    } catch (err) {
      console.error('Failed to load today data:', err);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Re-fetch data automatically on IndexedDB changes
  useTrackerData(loadData, [loadData]);

  const handleQuickAddWater = async (ml: number) => {
    if (!profile) return;
    setAddingWater(true);
    try {
      await hydrationService.addWater({
        amountMl: ml,
        localDate: date,
        source: 'manual',
      });
      announce(`Added ${displayWater(ml)} of water`);
      await loadData();
    } catch (err) {
      console.error('Failed to add water:', err);
    } finally {
      setAddingWater(false);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    try {
      await mealService.deleteMeal(id);
      announce('Meal deleted');
      await loadData();
    } catch (err) {
      console.error('Failed to delete meal:', err);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Skeleton style={{ height: 24, width: 120 }} />
          <Skeleton style={{ height: 16, width: 80 }} />
        </div>
        <Skeleton style={{ height: 200, borderRadius: 16, marginBottom: 12 }} />
        <div className={styles.macroGrid}>
          {[0, 1, 2].map(i => <Skeleton key={i} style={{ height: 100, borderRadius: 16 }} />)}
        </div>
      </div>
    );
  }

  const caloriePercent = summary
    ? (summary.caloriesTarget ? consumedPercent(summary.caloriesConsumed, summary.caloriesTarget) : 0)
    : 0;
  const isOverCalorie = summary?.caloriesRemaining !== null && (summary?.caloriesRemaining ?? 0) < 0;

  const groupedMeals: Record<string, Meal[]> = {};
  for (const meal of meals) {
    if (!groupedMeals[meal.mealType]) groupedMeals[meal.mealType] = [];
    groupedMeals[meal.mealType].push(meal);
  }

  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
  const mealLabels: Record<string, string> = {
    breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks',
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{relativeDateLabel(date, profile?.timeZone)}</h1>
          <p className={styles.dateSubtitle}>
            {new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
      </header>

      {/* Calorie budget card */}
      <Card className={styles.calorieCard} padding="lg">
        <div className={styles.calorieContent}>
          <div onClick={() => navigate('/goals')} style={{ cursor: 'pointer' }} title="Edit Goals">
            <ProgressRing
              percent={caloriePercent}
              size={120}
              strokeWidth={10}
              label={String(summary?.caloriesConsumed ?? 0)}
              sublabel="eaten"
              overTarget={isOverCalorie}
            />
          </div>
          <div className={styles.calorieMeta}>
            <div className={styles.calorieRow}>
              <Flame size={16} color="var(--color-accent)" aria-hidden="true" />
              <span className={styles.calorieLabel}>Calories</span>
              <button
                className={styles.setGoalLink}
                onClick={() => navigate('/goals')}
                style={{ marginLeft: 'auto', fontSize: '0.8rem' }}
              >
                {summary?.caloriesTarget ? 'Edit goal ⚙️' : 'Set goal →'}
              </button>
            </div>
            {summary?.caloriesTarget ? (
              <>
                <div className={styles.calorieTarget}>
                  <span className={styles.bigNum}>{summary.caloriesConsumed}</span>
                  <span className={styles.calorieOf}>/ {summary.caloriesTarget} kcal</span>
                </div>
                <div className={`${styles.remaining} ${isOverCalorie ? styles.overTarget : ''}`}>
                  {isOverCalorie
                    ? `${Math.abs(summary.caloriesRemaining!)} over`
                    : `${summary.caloriesRemaining} remaining`}
                </div>
              </>
            ) : (
              <div className={styles.calorieTarget}>
                <span className={styles.bigNum}>{summary?.caloriesConsumed ?? 0}</span>
                <span className={styles.calorieOf}>kcal today</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Quick Access Bar for Mobile */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => navigate('/hydration')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            color: 'var(--color-text)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Droplets size={16} color="var(--color-fat)" /> Hydration
        </button>
        <button
          onClick={() => navigate('/weight')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            color: 'var(--color-text)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <TrendingUp size={16} color="var(--color-protein)" /> Weight
        </button>
        <button
          onClick={() => navigate('/goals')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            color: 'var(--color-text)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ⚙️ Goals
        </button>
      </div>

      {/* Macro cards */}
      <div className={styles.macroGrid} role="group" aria-label="Macro nutrients">
        <MacroCard
          label="Protein"
          consumed={summary?.proteinConsumed ?? 0}
          target={summary?.proteinTarget ?? null}
          unit="g"
          color="var(--color-protein)"
        />
        <MacroCard
          label="Carbs"
          consumed={summary?.carbsConsumed ?? 0}
          target={summary?.carbsTarget ?? null}
          unit="g"
          color="var(--color-carbs)"
        />
        <MacroCard
          label="Fat"
          consumed={summary?.fatConsumed ?? 0}
          target={summary?.fatTarget ?? null}
          unit="g"
          color="var(--color-fat)"
        />
      </div>

      {/* Water card */}
      <Card className={styles.waterCard} padding="md">
        <div className={styles.waterHeader} onClick={() => navigate('/hydration')} style={{ cursor: 'pointer' }}>
          <div className={styles.waterInfo}>
            <div className={styles.waterIconRow}>
              <Droplets size={18} color="var(--color-fat)" aria-hidden="true" />
              <span className={styles.waterLabel}>Hydration</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-accent)' }}>View log →</span>
            </div>
            <div className={styles.waterAmount}>
              <span className={styles.waterConsumed}>
                {displayWater(summary?.waterConsumedMl ?? 0)}
              </span>
              {summary?.waterTargetMl && (
                <span className={styles.waterTarget}>
                  {' '}/ {displayWater(summary.waterTargetMl)}
                </span>
              )}
            </div>
            {summary?.waterTargetMl && (
              <div className={styles.waterBar}>
                <div
                  className={styles.waterBarFill}
                  style={{
                    width: `${Math.min(100, (summary.waterConsumedMl / summary.waterTargetMl) * 100)}%`,
                  }}
                  role="progressbar"
                  aria-valuenow={summary.waterConsumedMl}
                  aria-valuemax={summary.waterTargetMl}
                  aria-label={`Water: ${displayWater(summary.waterConsumedMl)} of ${displayWater(summary.waterTargetMl)}`}
                />
              </div>
            )}
          </div>
        </div>
        <div className={styles.waterButtons}>
          {QUICK_WATER_OPTIONS.map(ml => (
            <button
              key={ml}
              className={styles.waterBtn}
              onClick={() => handleQuickAddWater(ml)}
              disabled={addingWater}
              aria-label={`Add ${displayWater(ml)}`}
            >
              +{displayWater(ml)}
            </button>
          ))}
        </div>
      </Card>

      {/* Meals by type */}
      <div className={styles.meals}>
        {mealOrder.map(type => {
          const typeMeals = groupedMeals[type] ?? [];
          const totalCals = typeMeals.reduce((s, m) => s + m.totals.caloriesKcal, 0);
          return (
            <section key={type} className={styles.mealSection}>
              <div className={styles.mealSectionHeader}>
                <h2 className={styles.mealSectionTitle}>{mealLabels[type]}</h2>
                {typeMeals.length > 0 && (
                  <span className={styles.mealSectionCals}>{Math.round(totalCals)} kcal</span>
                )}
                <button
                  className={styles.addMealBtn}
                  onClick={() => navigate('/add', { state: { mealType: type } })}
                  aria-label={`Add ${mealLabels[type]}`}
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>
              {typeMeals.length > 0 ? (
                <div className={styles.mealList}>
                  {typeMeals.map(meal => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      onDelete={handleDeleteMeal}
                    />
                  ))}
                </div>
              ) : (
                <div className={styles.mealEmpty}>
                  <span className={styles.mealEmptyText}>Nothing logged yet</span>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Floating add button */}
      <button
        className={styles.fabAdd}
        onClick={() => navigate('/add')}
        aria-label="Add meal"
      >
        <Plus size={24} aria-hidden="true" />
      </button>
    </div>
  );
}

interface MacroCardProps {
  label: string;
  consumed: number;
  target: number | null;
  unit: string;
  color: string;
}

function MacroCard({ label, consumed, target, unit, color }: MacroCardProps) {
  const percent = target ? consumedPercent(consumed, target) : 0;
  return (
    <Card padding="sm" className={styles.macroCard}>
      <div className={styles.macroTop}>
        <span className={styles.macroLabel}>{label}</span>
        {/* <span className={styles.macroConsumed} style={{ color }}>
          {Math.round(consumed * 10) / 10}{unit}
        </span> */}
      </div>
      {target ? (
        <>
          <div className={styles.macroBar}>
            <div
              className={styles.macroBarFill}
              style={{ width: `${Math.min(100, percent)}%`, background: color }}
              role="progressbar"
              aria-valuenow={consumed}
              aria-valuemax={target}
              aria-label={`${label}: ${Math.round(consumed)}${unit} of ${target}${unit}`}
            />
          </div>
          <span className={styles.macroTarget}><span className={styles.macroConsumed} style={{ color }}>
          {Math.round(consumed * 10) / 10}{unit}
        </span>/ {target}{unit}</span>
        </>
      ) : (
        <div className={styles.macroTarget}>
          <span className={styles.macroConsumed} style={{ color }}>
            {Math.round(consumed * 10) / 10}{unit}
          </span>
        </div>
      )}
    </Card>
  );
}
