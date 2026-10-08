import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PricePoint } from '../domain/types';

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  points: PricePoint[];
}

interface PriceLineChartProps {
  series: ChartSeries[];
  /** Series key drawn with a thicker line */
  emphasize?: string;
  /** Short label for the Y axis, e.g. "Index (start = 100)" */
  yLabel?: string;
  height?: number;
}

/** Thin wrapper around Recharts so the charting library can be swapped in one place. */
export function PriceLineChart({ series, emphasize, yLabel, height = 280 }: PriceLineChartProps) {
  // Merge series into rows keyed by timestamp: { t, IBM: 1, MSFT: 2, ... }
  const rows = new Map<number, Record<string, number>>();
  for (const s of series) {
    for (const p of s.points) {
      rows.set(p.t, { ...(rows.get(p.t) ?? { t: p.t }), [s.key]: p.close });
    }
  }
  const data = [...rows.values()].sort((a, b) => a.t - b.t);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(t: number) => new Date(t).toLocaleDateString()}
        />
        <YAxis domain={['auto', 'auto']} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined} />
        <Tooltip labelFormatter={(t) => new Date(Number(t)).toLocaleString()} />
        <Legend />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={s.key === emphasize ? 3 : 1.5}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
