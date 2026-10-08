interface StatCardProps {
  label: string;
  value: string;
  /** Optional colour cue for the value */
  tone?: 'up' | 'down' | 'neutral';
  hint?: string;
}

/** Single headline number with a label. */
export function StatCard({ label, value, tone = 'neutral', hint }: StatCardProps) {
  return (
    <article className="card stat" aria-label={label}>
      <p className="stat__label">{label}</p>
      <p className={`stat__value stat__value--${tone}`}>{value}</p>
      {hint && <p className="stat__hint">{hint}</p>}
    </article>
  );
}
