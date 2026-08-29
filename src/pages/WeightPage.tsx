import { useState, useEffect, useCallback } from 'react';
import { Scale, Plus } from 'lucide-react';
import { weightService } from '@/domain/weight/weight.service';
import { profileService } from '@/domain/profile/profile.service';
import { AddWeightInputSchema } from '@/domain/weight/weight.schema';
import { normalizeWeightToKg, kgToLb, computeBmi, bmiCategory, displayWeight } from '@/domain/shared/units';
import { getTodayLocalDate } from '@/domain/shared/dates';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import type { WeightEntry } from '@/domain/weight/weight.schema';
import type { Profile, Goal } from '@/domain/profile/profile.schema';
import { useTrackerData } from '@/hooks/useTrackerData';
import styles from './WeightPage.module.css';

export default function WeightPage() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [weightInput, setWeightInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refreshData = useCallback(() => {
    const today = getTodayLocalDate();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const from = thirtyDaysAgo.toISOString().split('T')[0];

    Promise.all([
      weightService.listEntries({ from, to: today }),
      profileService.getProfile(),
      profileService.getActiveGoal(),
    ]).then(([e, p, g]) => {
      setEntries(e.reverse());
      setProfile(p);
      setGoal(g);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useTrackerData(refreshData, [refreshData]);

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const value = parseFloat(weightInput);
    if (isNaN(value) || value <= 0) {
      setError('Please enter a valid weight.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const weightKg = normalizeWeightToKg(value, profile.preferredWeightUnit);
      const entry = await weightService.addEntry({
        weightKg,
        localDate: getTodayLocalDate(),
        source: 'manual',
      });
      setEntries(prev => [entry, ...prev]);
      setWeightInput('');

      // Update profile's current weight
      await profileService.updateProfile({ currentWeightKg: weightKg });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save weight.');
    } finally {
      setSaving(false);
    }
  };

  const latest = entries[0];
  const bmi = latest && profile?.heightCm
    ? computeBmi(latest.weightKg, profile.heightCm)
    : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Weight</h1>
      </header>

      {/* Log weight form */}
      <Card padding="lg" className={styles.logCard}>
        <h2 className={styles.cardTitle}>Log Today's Weight</h2>
        <form onSubmit={handleLog} className={styles.form}>
          <div className={styles.inputRow}>
            <input
              type="number"
              step="0.1"
              min="20"
              max="500"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              placeholder={`e.g. ${profile?.preferredWeightUnit === 'lb' ? '160' : '72'}`}
              className={styles.input}
              aria-label={`Weight in ${profile?.preferredWeightUnit ?? 'kg'}`}
            />
            <span className={styles.unit}>{profile?.preferredWeightUnit ?? 'kg'}</span>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <Button type="submit" loading={saving} fullWidth icon={<Plus size={16} />}>
            Log weight
          </Button>
        </form>
      </Card>

      {/* Current stats */}
      {latest && (
        <div className={styles.stats}>
          <Card padding="md" className={styles.statCard}>
            <span className={styles.statLabel}>Current</span>
            <span className={styles.statValue}>
              {displayWeight(latest.weightKg, profile?.preferredWeightUnit ?? 'kg')}
            </span>
          </Card>
          {goal?.targetWeightKg && (
            <Card padding="md" className={styles.statCard}>
              <span className={styles.statLabel}>Goal</span>
              <span className={styles.statValue}>
                {displayWeight(goal.targetWeightKg, profile?.preferredWeightUnit ?? 'kg')}
              </span>
            </Card>
          )}
          {bmi && (
            <Card padding="md" className={styles.statCard}>
              <span className={styles.statLabel}>BMI</span>
              <span className={styles.statValue}>{bmi.toFixed(1)}</span>
              <span className={styles.statSub}>{bmiCategory(bmi)}</span>
            </Card>
          )}
        </div>
      )}
      {bmi && (
        <p className={styles.bmiNote}>
          BMI is a limited screening measure and does not account for muscle mass, age, or individual health status.
        </p>
      )}

      {/* History */}
      <section className={styles.history}>
        <h2 className={styles.sectionTitle}>Recent Entries</h2>
        {entries.length === 0 ? (
          <EmptyState
            icon={<Scale size={40} strokeWidth={1.5} />}
            title="No weigh-ins yet"
            description="Log your weight above to start tracking your progress."
          />
        ) : (
          <div className={styles.entryList}>
            {entries.slice(0, 20).map(entry => (
              <div key={entry.id} className={styles.entry}>
                <div>
                  <span className={styles.entryDate}>
                    {new Date(entry.localDate + 'T00:00:00').toLocaleDateString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}
                  </span>
                  {entry.note && <span className={styles.entryNote}>{entry.note}</span>}
                </div>
                <span className={styles.entryWeight}>
                  {displayWeight(entry.weightKg, profile?.preferredWeightUnit ?? 'kg')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
