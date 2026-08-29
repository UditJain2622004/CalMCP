import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, Plus, ArrowLeft } from 'lucide-react';
import { hydrationService } from '@/domain/hydration/hydration.service';
import { profileService } from '@/domain/profile/profile.service';
import { displayWater, normalizeWaterToMl } from '@/domain/shared/units';
import { getTodayLocalDate, formatTime } from '@/domain/shared/dates';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import type { WaterEntry } from '@/domain/hydration/hydration.schema';
import { useTrackerData } from '@/hooks/useTrackerData';
import styles from './HydrationPage.module.css';

const QUICK_OPTIONS = [150, 250, 330, 500, 750];

export default function HydrationPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [adding, setAdding] = useState(false);

  const today = getTodayLocalDate();

  const refresh = useCallback(async () => {
    const [dayEntries, dayTotal, goal] = await Promise.all([
      hydrationService.getEntriesForDate(today),
      hydrationService.getDailyTotal(today),
      profileService.getActiveGoal(),
    ]);
    setEntries(dayEntries.reverse());
    setTotal(dayTotal);
    setTarget(goal?.waterTargetMl ?? null);
  }, [today]);

  useEffect(() => { refresh(); }, [refresh]);

  useTrackerData(refresh, [refresh]);

  const addWater = async (ml: number) => {
    setAdding(true);
    await hydrationService.addWater({ amountMl: ml, localDate: today, source: 'manual' });
    await refresh();
    setAdding(false);
  };

  const handleCustomAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const ml = parseFloat(customAmount);
    if (isNaN(ml) || ml < 1) return;
    await addWater(Math.round(ml));
    setCustomAmount('');
  };

  const handleDelete = async (id: string) => {
    await hydrationService.deleteEntry(id);
    await refresh();
  };

  const percent = target ? Math.min(100, (total / target) * 100) : 0;

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
        <h1 className={styles.title}>Hydration</h1>
        <span className={styles.date}>
          {new Date(today + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </header>

      {/* Progress card */}
      <Card padding="lg" className={styles.progressCard}>
        <div className={styles.totalDisplay}>
          <Droplets size={24} color="var(--color-fat)" aria-hidden="true" />
          <span className={styles.totalAmount} style={{ color: 'var(--color-fat)' }}>
            {displayWater(total)}
          </span>
          {target && <span className={styles.totalTarget}>/ {displayWater(target)}</span>}
        </div>
        {target && (
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={total}
            aria-valuemax={target}
            aria-label={`${displayWater(total)} of ${displayWater(target)} consumed`}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
        {target && (
          <p className={styles.remaining}>
            {total >= target
              ? 'Daily goal reached!'
              : `${displayWater(target - total)} remaining`}
          </p>
        )}
      </Card>

      {/* Quick add */}
      <Card padding="md" className={styles.quickCard}>
        <h2 className={styles.cardTitle}>Quick Add</h2>
        <div className={styles.quickBtns}>
          {QUICK_OPTIONS.map(ml => (
            <button
              key={ml}
              className={styles.quickBtn}
              onClick={() => addWater(ml)}
              disabled={adding}
              aria-label={`Add ${displayWater(ml)}`}
            >
              +{displayWater(ml)}
            </button>
          ))}
        </div>
        <form onSubmit={handleCustomAdd} className={styles.customForm}>
          <input
            type="number"
            min="1"
            max="5000"
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
            placeholder="Custom amount (ml)"
            className={styles.customInput}
            aria-label="Custom water amount in milliliters"
          />
          <Button type="submit" variant="secondary" size="sm" disabled={!customAmount || adding}>
            Add
          </Button>
        </form>
      </Card>

      {/* Today's entries */}
      <section className={styles.history}>
        <h2 className={styles.sectionTitle}>Today's Entries</h2>
        {entries.length === 0 ? (
          <p className={styles.noEntries}>No water logged yet today.</p>
        ) : (
          <div className={styles.entryList}>
            {entries.map(entry => (
              <div key={entry.id} className={styles.entry}>
                <span className={styles.entryAmount}>{displayWater(entry.amountMl)}</span>
                <span className={styles.entryTime}>{formatTime(entry.recordedAt)}</span>
                <button
                  className={styles.deleteEntry}
                  onClick={() => handleDelete(entry.id)}
                  aria-label={`Remove ${displayWater(entry.amountMl)} entry`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
