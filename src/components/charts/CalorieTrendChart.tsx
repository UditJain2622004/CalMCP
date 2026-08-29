import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useEffect, useState } from 'react';
import { profileService } from '../../domain/profile/profile.service';
import type { TrendDataPoint } from '../../domain/reports/report.schema';
import styles from './charts.module.css';

interface Props {
  data: TrendDataPoint[];
  granularity: 'day' | 'week';
}

export default function CalorieTrendChart({ data, granularity }: Props) {
  const [target, setTarget] = useState<number | null>(null);

  useEffect(() => {
    profileService.getActiveGoal().then(g => setTarget(g?.calorieTargetKcal ?? null));
  }, []);

  const chartData = data.map(d => ({
    date: granularity === 'week'
      ? new Date(d.localDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : new Date(d.localDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    calories: d.value,
  }));

  const nonNull = data.filter(d => d.value !== null);
  const accessibleSummary = nonNull.length > 0
    ? `Calorie data for ${data.length} days. Logged on ${nonNull.length} days. ${
        target ? `Target: ${target} kcal.` : ''
      }`
    : 'No calorie data logged in this period.';

  return (
    <div>
      <p className={styles.srSummary}>{accessibleSummary}</p>
      {nonNull.length === 0 ? (
        <div className={styles.empty}>No data logged in this period</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                fontSize: 13,
              }}
              formatter={(value) => [`${Math.round(Number(value))} kcal`, 'Calories']}
            />
            {target && (
              <ReferenceLine
                y={target}
                stroke="var(--color-accent)"
                strokeDasharray="4 2"
                label={{ value: 'Target', position: 'right', fontSize: 11, fill: 'var(--color-accent)' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="calories"
              stroke="#E8D87A"
              strokeWidth={2.5}
              dot={{ fill: '#E8D87A', r: 3 }}
              connectNulls={false}
              activeDot={{ r: 5, fill: '#E8D87A' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
