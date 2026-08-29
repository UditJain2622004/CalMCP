import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Save, ArrowLeft } from 'lucide-react';
import { profileService } from '@/domain/profile/profile.service';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import type { Goal } from '@/domain/profile/profile.schema';
import { useTrackerData } from '@/hooks/useTrackerData';
import styles from './GoalsPage.module.css';

export default function GoalsPage() {
  const navigate = useNavigate();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    type: 'maintain_weight' as Goal['type'],
    calorieTargetKcal: '',
    proteinTargetG: '',
    carbsTargetG: '',
    fatTargetG: '',
    fiberTargetG: '',
    waterTargetMl: '2000',
    targetWeightKg: '',
  });

  const loadGoal = useCallback(() => {
    profileService.getActiveGoal().then(g => {
      if (g) {
        setGoal(g);
        setForm({
          type: g.type,
          calorieTargetKcal: String(g.calorieTargetKcal),
          proteinTargetG: String(g.proteinTargetG ?? ''),
          carbsTargetG: String(g.carbsTargetG ?? ''),
          fatTargetG: String(g.fatTargetG ?? ''),
          fiberTargetG: String(g.fiberTargetG ?? ''),
          waterTargetMl: String(g.waterTargetMl ?? 2000),
          targetWeightKg: String(g.targetWeightKg ?? ''),
        });
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadGoal();
  }, [loadGoal]);

  useTrackerData(loadGoal, [loadGoal]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const g = await profileService.setGoal({
        type: form.type,
        calorieTargetKcal: Number(form.calorieTargetKcal) || 0,
        proteinTargetG: Number(form.proteinTargetG) || 0,
        carbsTargetG: Number(form.carbsTargetG) || 0,
        fatTargetG: Number(form.fatTargetG) || 0,
        fiberTargetG: form.fiberTargetG ? Number(form.fiberTargetG) : undefined,
        waterTargetMl: Number(form.waterTargetMl) || 0,
        targetWeightKg: form.targetWeightKg ? Number(form.targetWeightKg) : undefined,
        targetSource: 'manual',
      });
      setGoal(g);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const GOAL_TYPES: Array<{ value: Goal['type']; label: string }> = [
    { value: 'lose_weight', label: 'Lose weight' },
    { value: 'maintain_weight', label: 'Maintain weight' },
    { value: 'build_muscle', label: 'Build muscle' },
    { value: 'eat_healthier', label: 'Eat healthier' },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          className={styles.back}
          onClick={() => navigate(-1)}
          aria-label="Go back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <Target size={24} color="var(--color-accent)" aria-hidden="true" />
        <h1 className={styles.title}>Goals</h1>
      </header>

      <form onSubmit={handleSave}>
        <Card padding="lg" className={styles.section}>
          <h2 className={styles.sectionTitle}>Goal Type</h2>
          <div className={styles.goalTypes}>
            {GOAL_TYPES.map(({ value, label }) => (
              <label key={value} className={`${styles.typeOption} ${form.type === value ? styles.typeSelected : ''}`}>
                <input type="radio" name="goalType" value={value} checked={form.type === value} onChange={update('type')} className={styles.radioInput} />
                {label}
              </label>
            ))}
          </div>
        </Card>

        <Card padding="lg" className={styles.section}>
          <h2 className={styles.sectionTitle}>Calorie Budget</h2>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="calories">Daily Calories (kcal)</label>
            <input
              id="calories"
              type="number"
              min="500"
              max="10000"
              value={form.calorieTargetKcal}
              onChange={update('calorieTargetKcal')}
              className={styles.input}
              // required
              placeholder="e.g. 2000"
            />
          </div>
        </Card>

        <Card padding="lg" className={styles.section}>
          <h2 className={styles.sectionTitle}>Macros (optional)</h2>
          {([
            { key: 'proteinTargetG' as const, label: 'Protein (g)', ph: '150' },
            { key: 'carbsTargetG' as const, label: 'Carbs (g)', ph: '200' },
            { key: 'fatTargetG' as const, label: 'Fat (g)', ph: '65' },
            { key: 'fiberTargetG' as const, label: 'Fiber (g)', ph: '30' },
          ]).map(({ key, label, ph }) => (
            <div key={key} className={styles.field}>
              <label className={styles.label} htmlFor={key}>{label}</label>
              <input
                id={key}
                type="number"
                min="0"
                max="1000"
                value={form[key]}
                onChange={update(key)}
                className={styles.input}
                placeholder={ph}
              />
            </div>
          ))}
        </Card>

        <Card padding="lg" className={styles.section}>
          <h2 className={styles.sectionTitle}>Hydration</h2>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="water">Daily Water (ml)</label>
            <input id="water" type="number" min="500" max="10000" value={form.waterTargetMl} onChange={update('waterTargetMl')} className={styles.input} placeholder="2000" />
          </div>
        </Card>

        {(form.type === 'lose_weight' || form.type === 'build_muscle') && (
          <Card padding="lg" className={styles.section}>
            <h2 className={styles.sectionTitle}>Target Weight</h2>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="targetWeight">Target Weight (kg)</label>
              <input id="targetWeight" type="number" step="0.1" min="20" max="500" value={form.targetWeightKg} onChange={update('targetWeightKg')} className={styles.input} placeholder="e.g. 70" />
            </div>
          </Card>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={saving}
          icon={<Save size={18} />}
        >
          {saved ? '✓ Saved!' : 'Save Goals'}
        </Button>
      </form>
    </div>
  );
}
