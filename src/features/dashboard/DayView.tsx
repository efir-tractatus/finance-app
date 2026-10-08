import { useMemo } from 'react';
import { ChartCard } from '../../components/ChartCard';
import { PriceLineChart } from '../../components/PriceLineChart';
import { StatCard } from '../../components/StatCard';
import { SummaryCard } from '../../components/SummaryCard';
import { ErrorPanel, Loading } from '../../components/StatusStates';
import { useHistories, useQuotes } from '../../hooks/useMarketData';
import { buildComparison, formatPct, toneOf } from './comparison';
import type { ViewProps } from './viewTypes';

/** Current-day market summary: headline stats, one card per company, intraday comparison. */
export function DayView({ provider, companies, focusSymbol }: ViewProps) {
  const quotes = useQuotes(provider, companies);
  const history = useHistories(provider, companies, 'day');

  const comparison = useMemo(
    () => (history.status === 'success' ? buildComparison(history.data.series, companies, focusSymbol) : undefined),
    [history, companies, focusSymbol],
  );

  const focusQuote = quotes.status === 'success' ? quotes.data.find((q) => q.symbol === focusSymbol) : undefined;
  const leader =
    quotes.status === 'success' && quotes.data.length > 0
      ? [...quotes.data].sort((a, b) => b.changePct - a.changePct)[0]
      : undefined;

  return (
    <div>
      {quotes.status === 'loading' && <Loading label="Loading quotes…" />}
      {quotes.status === 'error' && (
        <ErrorPanel message={`Could not load quotes: ${quotes.error.message}`} onRetry={quotes.retry} />
      )}

      {quotes.status === 'success' && (
        <>
          <div className="stat-grid">
            {focusQuote && (
              <StatCard
                label={`${focusQuote.name} price`}
                value={`${focusQuote.price.toFixed(2)} ${focusQuote.currency}`}
                tone={toneOf(focusQuote.change)}
                hint={`${formatPct(focusQuote.changePct)} today`}
              />
            )}
            {leader && (
              <StatCard
                label="Top mover today"
                value={leader.name}
                tone={toneOf(leader.changePct)}
                hint={formatPct(leader.changePct)}
              />
            )}
          </div>
          <div className="summary-grid">
            {quotes.data.map((q) => (
              <SummaryCard key={q.symbol} {...q} />
            ))}
          </div>
        </>
      )}

      <ChartCard
        title="Intraday performance (start of session = 100)"
        loading={history.status === 'loading'}
        error={history.status === 'error' ? `Could not load intraday history: ${history.error.message}` : undefined}
        empty={comparison?.chartSeries.every((s) => s.points.length === 0)}
        onRetry={history.retry}
      >
        <PriceLineChart series={comparison?.chartSeries ?? []} emphasize={focusSymbol} yLabel="Index" />
      </ChartCard>
      {history.status === 'success' && history.data.failed.length > 0 && (
        <p className="note">No intraday data for: {history.data.failed.join(', ')}</p>
      )}
    </div>
  );
}
