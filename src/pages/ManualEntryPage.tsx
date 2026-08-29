import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Trash2, CheckCircle, ArrowLeft } from 'lucide-react';
import { mealService } from '@/domain/meals/meal.service';
import { getTodayLocalDate, localDateAtHourToUtc, nowUtc } from '@/domain/shared/dates';
import { normalizeFoodName } from '@/domain/meals/meal.math';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import type { MealType } from '@/domain/meals/meal.schema';
import styles from './ManualEntryPage.module.css';

interface FoodItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  caloriesKcal: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
}

function emptyItem(): FoodItem {
  return {
    id: crypto.randomUUID(),
    name: '', quantity: '1', unit: 'serving',
    caloriesKcal: '', proteinG: '', carbsG: '', fatG: '',
  };
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const UNIT_OPTIONS = ['g', 'ml', 'piece', 'serving', 'cup', 'tbsp', 'tsp', 'oz'];

export default function ManualEntryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { mealType?: MealType } | null;

  const [mealType, setMealType] = useState<MealType>(state?.mealType ?? 'lunch');
  const [items, setItems] = useState<FoodItem[]>([emptyItem()]);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateItem = (id: string, field: keyof FoodItem, value: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const removeItem = (id: string) =>
    setItems(prev => prev.filter(i => i.id !== id));

  const totalCals = items.reduce((s, i) => s + (parseFloat(i.caloriesKcal) || 0), 0);
  const totalProtein = items.reduce((s, i) => s + (parseFloat(i.proteinG) || 0), 0);
  const totalCarbs = items.reduce((s, i) => s + (parseFloat(i.carbsG) || 0), 0);
  const totalFat = items.reduce((s, i) => s + (parseFloat(i.fatG) || 0), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validItems = items.filter(i => i.name.trim() && parseFloat(i.caloriesKcal) >= 0);
    if (validItems.length === 0) {
      setError('Add at least one food item with a name and calories.');
      return;
    }

    setSaving(true);
    const today = getTodayLocalDate();
    const now = nowUtc();

    const mealTitle = title.trim() || validItems.map(i => i.name).join(', ').slice(0, 80);

    try {
      await mealService.createManualMeal({
        localDate: today,
        eatenAt: localDateAtHourToUtc(today, mealType === 'breakfast' ? 8 : mealType === 'lunch' ? 13 : mealType === 'dinner' ? 19 : 15),
        mealType,
        title: mealTitle,
        items: validItems.map(i => ({
          name: i.name.trim(),
          quantity: parseFloat(i.quantity) || 1,
          unit: i.unit as any,
          nutrition: {
            caloriesKcal: parseFloat(i.caloriesKcal) || 0,
            proteinG: parseFloat(i.proteinG) || 0,
            carbsG: parseFloat(i.carbsG) || 0,
            fatG: parseFloat(i.fatG) || 0,
          },
        })),
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save meal.');
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/add')} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.title}>Manual Entry</h1>
      </header>

      <form onSubmit={handleSave}>
        {/* Meal type */}
        <div className={styles.mealTypeRow}>
          {MEAL_TYPES.map(type => (
            <button
              key={type}
              type="button"
              className={`${styles.mealTypeBtn} ${mealType === type ? styles.mealTypeBtnActive : ''}`}
              onClick={() => setMealType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Meal title */}
        <div className={styles.titleField}>
          <label htmlFor="mealTitle" className={styles.label}>Meal name (optional)</label>
          <input
            id="mealTitle"
            type="text"
            maxLength={80}
            value={title}
            onChange={e => setTitle(e.target.value)}
            className={styles.input}
            placeholder="e.g. Chicken salad"
          />
        </div>

        {/* Food items */}
        <div className={styles.items}>
          {items.map((item, idx) => (
            <Card key={item.id} padding="md" className={styles.itemCard}>
              <div className={styles.itemTopRow}>
                <span className={styles.itemNum}>Item {idx + 1}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove item ${idx + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor={`name-${item.id}`} className={styles.label}>Food name *</label>
                <input
                  id={`name-${item.id}`}
                  type="text"
                  required
                  maxLength={100}
                  value={item.name}
                  onChange={e => updateItem(item.id, 'name', e.target.value)}
                  className={styles.input}
                  placeholder="e.g. Brown rice"
                />
              </div>

              <div className={styles.qtyRow}>
                <div className={styles.field} style={{ flex: 1 }}>
                  <label htmlFor={`qty-${item.id}`} className={styles.label}>Qty</label>
                  <input
                    id={`qty-${item.id}`}
                    type="number"
                    min="0.1"
                    step="any"
                    value={item.quantity}
                    onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.field} style={{ flex: 1.2 }}>
                  <label htmlFor={`unit-${item.id}`} className={styles.label}>Unit</label>
                  <select
                    id={`unit-${item.id}`}
                    value={item.unit}
                    onChange={e => updateItem(item.id, 'unit', e.target.value)}
                    className={styles.input}
                  >
                    {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className={styles.nutritionGrid}>
                {([
                  { key: 'caloriesKcal' as const, label: 'Calories', unit: 'kcal', required: true },
                  { key: 'proteinG' as const, label: 'Protein', unit: 'g', required: false },
                  { key: 'carbsG' as const, label: 'Carbs', unit: 'g', required: false },
                  { key: 'fatG' as const, label: 'Fat', unit: 'g', required: false },
                ]).map(({ key, label, unit, required }) => (
                  <div key={key} className={styles.nutritionField}>
                    <label htmlFor={`${key}-${item.id}`} className={styles.label}>
                      {label} <span className={styles.unit}>{unit}</span>
                    </label>
                    <input
                      id={`${key}-${item.id}`}
                      type="number"
                      min="0"
                      step="any"
                      required={required}
                      value={item[key]}
                      onChange={e => updateItem(item.id, key, e.target.value)}
                      className={styles.input}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <button
          type="button"
          className={styles.addItemBtn}
          onClick={() => setItems(prev => [...prev, emptyItem()])}
        >
          <Plus size={16} />
          Add another item
        </button>

        {/* Totals */}
        {items.some(i => i.caloriesKcal) && (
          <div className={styles.totals}>
            <span className={styles.totalsLabel}>Total:</span>
            <span className={styles.totalsValue}>{Math.round(totalCals)} kcal</span>
            <span className={styles.totalsMacros}>
              P {Math.round(totalProtein)}g · C {Math.round(totalCarbs)}g · F {Math.round(totalFat)}g
            </span>
          </div>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={saving}
          icon={<CheckCircle size={18} />}
        >
          Save Meal
        </Button>
      </form>
    </div>
  );
}
