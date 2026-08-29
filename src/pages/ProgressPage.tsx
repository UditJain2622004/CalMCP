import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { TrendingUp, BarChart2, Droplets, Scale } from 'lucide-react';
import { reportService } from '@/domain/reports/report.service';
import { profileService } from '@/domain/profile/profile.service';
import { getTodayLocalDate, addDaysToLocalDate } from '@/domain/shared/dates';
import { Skeleton } from '@/components/common/Skeleton';
import { Card } from '@/components/common/Card';
import type { ProgressReport } from '@/domain/reports/report.schema';
import { useTrackerData } from '@/hooks/useTrackerData';
import styles from './ProgressPage.module.css';

const CalorieTrendChart = lazy(() => import('@/components/charts/CalorieTrendChart'));
const MacroChart = lazy(() => import('@/components/charts/MacroChart'));
const WeightTrendChart = lazy(() => import('@/components/charts/WeightTrendChart'));

type RangeOption = '7D' | '30D' | '90D' | '6M' | '1Y';

const RANGE_OPTIONS: RangeOption[] = ['7D', '30D', '90D', '6M', '1Y'];

function rangeToDays(range: RangeOption): number {
  switch (range) {
    case '7D': return 7;
    case '30D': return 30;
    case '90D': return 90;
    case '6M': return 180;
    case '1Y': return 365;
  }
}

export default function ProgressPage() {
  const [range, setRange] = useState<RangeOption>('30D');
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(() => {
    // Check for agent-configured filters
    const savedFilter = sessionStorage.getItem('progress-view-filter');
    if (savedFilter) {
      sessionStorage.removeItem('progress-view-filter');
    }

    const today = getTodayLocalDate();
    const from = addDaysToLocalDate(today, -rangeToDays(range) + 1);

    setLoading(true);
    reportService.getProgressReport({
      from,
      to: today,
      metrics: ['calories', 'protein', 'carbs', 'fat', 'water', 'weight'],
      granularity: rangeToDays(range) > 90 ? 'week' : 'day',
    }).then(r => {
      setReport(r);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [range]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useTrackerData(loadReport, [loadReport]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Progress</h1>
      </header>

      {/* Range selector */}
      <div className={styles.rangeBar} role="group" aria-label="Time range">
        {RANGE_OPTIONS.map(opt => (
          <button
            key={opt}
            className={`${styles.rangeBtn} ${range === opt ? styles.rangeBtnActive : ''}`}
            onClick={() => setRange(opt)}
            aria-pressed={range === opt}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Summary facts */}
      {!loading && report && (
        <div className={styles.facts}>
          <FactCard label="Days logged" value={`${report.facts.loggedDays} / ${report.facts.calendarDays}`} />
          <FactCard
            label="Avg calories"
            value={report.facts.averageCaloriesPerLoggedDay
              ? `${report.facts.averageCaloriesPerLoggedDay} kcal`
              : '—'
            }
            sub="per logged day"
          />
          {report.facts.weightChange !== null && (
            <FactCard
              label="Weight change"
              value={`${report.facts.weightChange > 0 ? '+' : ''}${report.facts.weightChange} kg`}
              sub={`${report.facts.firstWeight?.toFixed(1)} → ${report.facts.lastWeight?.toFixed(1)} kg`}
            />
          )}
          <FactCard label="Target days" value={String(report.facts.targetHitCount)} sub="within ±10% of goal" />
        </div>
      )}

      {loading ? (
        <div className={styles.chartLoading}>
          <Skeleton style={{ height: 220, borderRadius: 16, marginBottom: 16 }} />
          <Skeleton style={{ height: 180, borderRadius: 16, marginBottom: 16 }} />
          <Skeleton style={{ height: 180, borderRadius: 16 }} />
        </div>
      ) : report && (
        <Suspense fallback={<Skeleton style={{ height: 220 }} />}>
          <div className={styles.charts}>
            {/* Calorie chart */}
            {report.series.calories && (
              <section className={styles.chartSection}>
                <h2 className={styles.chartTitle}>
                  <TrendingUp size={16} aria-hidden="true" /> Calories
                </h2>
                <Card padding="md" className={styles.chartCard}>
                  <CalorieTrendChart
                    data={report.series.calories}
                    granularity={report.granularity}
                  />
                </Card>
              </section>
            )}

            {/* Macro chart */}
            {(report.series.protein || report.series.carbs || report.series.fat) && (
              <section className={styles.chartSection}>
                <h2 className={styles.chartTitle}>
                  <BarChart2 size={16} aria-hidden="true" /> Macros
                </h2>
                <Card padding="md" className={styles.chartCard}>
                  <MacroChart report={report} />
                </Card>
              </section>
            )}

            {/* Weight chart */}
            {report.series.weight && (
              <section className={styles.chartSection}>
                <h2 className={styles.chartTitle}>
                  <Scale size={16} aria-hidden="true" /> Weight
                </h2>
                <Card padding="md" className={styles.chartCard}>
                  <WeightTrendChart data={report.series.weight} />
                </Card>
              </section>
            )}
          </div>
        </Suspense>
      )}
    </div>
  );
}

interface FactCardProps {
  label: string;
  value: string;
  sub?: string;
}
function FactCard({ label, value, sub }: FactCardProps) {
  return (
    <div className={styles.fact}>
      <span className={styles.factValue}>{value}</span>
      <span className={styles.factLabel}>{label}</span>
      {sub && <span className={styles.factSub}>{sub}</span>}
    </div>
  );
}
