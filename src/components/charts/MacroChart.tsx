import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { ProgressReport } from '../../domain/reports/report.schema';
import styles from './charts.module.css';

interface Props {
  report: ProgressReport;
}

export default function MacroChart({ report }: Props) {
  const dates = report.series.protein?.map(d => d.localDate) ?? [];
  const chartData = dates.map(date => {
    const find = (series?: typeof report.series.protein) =>
      series?.find(d => d.localDate === date)?.value ?? null;
    return {
      date: new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      protein: find(report.series.protein),
      carbs: find(report.series.carbs),
      fat: find(report.series.fat),
    };
  });

  return (
    <div>
      <p className={styles.srSummary}>Macro nutrient breakdown over the selected period.</p>
      {chartData.length === 0 ? (
        <div className={styles.empty}>No data logged in this period</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} unit="g" />
            <Tooltip
              contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', fontSize: 13 }}
              formatter={(value, name) => [`${Math.round(Number(value))}g`, String(name)]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="protein" name="Protein" fill="#df6468" radius={[3, 3, 0, 0]} maxBarSize={20} />
            <Bar dataKey="carbs" name="Carbs" fill="#c98c49" radius={[3, 3, 0, 0]} maxBarSize={20} />
            <Bar dataKey="fat" name="Fat" fill="#5d88d6" radius={[3, 3, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
