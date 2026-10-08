import type { ReactNode } from 'react';
import { EmptyState, ErrorPanel, Loading } from './StatusStates';

interface ChartCardProps {
  title: string;
  loading?: boolean;
  error?: string;
  empty?: boolean;
  onRetry?: () => void;
  children: ReactNode;
}

/** Frame for any chart: title plus loading / error / empty slots. */
export function ChartCard({ title, loading, error, empty, onRetry, children }: ChartCardProps) {
  let body: ReactNode = children;
  if (loading) body = <Loading />;
  else if (error) body = <ErrorPanel message={error} onRetry={onRetry} />;
  else if (empty) body = <EmptyState>No data available.</EmptyState>;

  return (
    <section className="card" aria-label={title}>
      <h3 className="card__title">{title}</h3>
      {body}
    </section>
  );
}
