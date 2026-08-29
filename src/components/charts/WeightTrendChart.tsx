import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TrendDataPoint } from '../../domain/reports/report.schema';
import styles from './charts.module.css';

interface Props {
  data: TrendDataPoint[];
}

export default function WeightTrendChart({ data }: Props) {
  const chartData = data
    .filter(d => d.value !== null)
    .map(d => ({
      date: new Date(d.localDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      weight: d.value,
    }));

  const accessibleSummary = chartData.length > 0
    ? `Weight trend: ${chartData[0].weight} kg to ${chartData[chartData.length - 1].weight} kg over ${chartData.length} weigh-ins.`
    : 'No weight data logged in this period.';

  return (
    <div>
      <p className={styles.srSummary}>{accessibleSummary}</p>
      {chartData.length === 0 ? (
        <div className={styles.empty}>No weight data logged in this period</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} />
            <YAxis
              domain={['auto', 'auto']}
              tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
              tickLine={false}
              axisLine={false}
              unit="kg"
            />
            <Tooltip
              contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: 13 }}
              formatter={(value) => [`${Number(value).toFixed(1)} kg`, 'Weight']}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="var(--color-accent)"
              strokeWidth={2.5}
              dot={{ fill: 'var(--color-accent)', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
