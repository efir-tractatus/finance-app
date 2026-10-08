import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface BarDatum {
  label: string;
  value: number;
  color: string;
}

/** Horizontal-axis bar chart of percent changes; negative bars are drawn in red. */
export function ChangeBarChart({ data, height = 220 }: { data: BarDatum[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" />
        <YAxis unit="%" />
        <Tooltip formatter={(v) => `${Number(v).toFixed(2)}%`} />
        <ReferenceLine y={0} stroke="#8d8d8d" />
        <Bar dataKey="value" name="Change">
          {data.map((d) => (
            <Cell key={d.label} fill={d.value >= 0 ? d.color : '#da1e28'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
