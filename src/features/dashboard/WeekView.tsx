import { useMemo } from 'react';
import { ChangeBarChart } from '../../components/ChangeBarChart';
import { ChartCard } from '../../components/ChartCard';
import { PriceLineChart } from '../../components/PriceLineChart';
import { StatCard } from '../../components/StatCard';
import { useHistories } from '../../hooks/useMarketData';
import { buildComparison, formatPct, toneOf } from './comparison';
import type { ViewProps } from './viewTypes';

/** Last 7 days: how IBM moved against peers, as a line comparison plus a per-company change bar chart. */
export function WeekView({ provider, companies, focusSymbol }: ViewProps) {
  const history = useHistories(provider, companies, 'week');
  const comparison = useMemo(
    () => (history.status === 'success' ? buildComparison(history.data.series, companies, focusSymbol) : undefined),
    [history, companies, focusSymbol],
  );
  const failedMessage = history.status === 'error' ? `Could not load 7-day history: ${history.error.message}` : undefined;
  const { focus, peerAverage } = comparison ?? {};

  return (
    <div>
      {focus && (
        <div className="stat-grid">
          <StatCard label={`${focus.name} 7-day change`} value={formatPct(focus.changePct)} tone={toneOf(focus.changePct)} />
          {peerAverage !== undefined && (
            <StatCard
              label="Versus peer average"
              value={formatPct(focus.changePct - peerAverage)}
              tone={toneOf(focus.changePct - peerAverage)}
              hint={`Peers averaged ${formatPct(peerAverage)}`}
            />
          )}
          <StatCard label={`${focus.name} rank`} value={`#${focus.rank} of ${comparison?.ranking.length}`} />
        </div>
      )}

      <ChartCard
        title="7-day trend comparison (start = 100)"
        loading={history.status === 'loading'}
        error={failedMessage}
        empty={comparison?.chartSeries.every((s) => s.points.length === 0)}
        onRetry={history.retry}
      >
        <PriceLineChart series={comparison?.chartSeries ?? []} emphasize={focusSymbol} yLabel="Index" />
      </ChartCard>

      {comparison && (
        <ChartCard title="7-day change by company" empty={comparison.ranking.length === 0}>
          <ChangeBarChart
            data={comparison.ranking.map((r) => ({ label: r.symbol, value: r.changePct, color: r.color }))}
          />
        </ChartCard>
      )}
      {history.status === 'success' && history.data.failed.length > 0 && (
        <p className="note">No 7-day data for: {history.data.failed.join(', ')}</p>
      )}
    </div>
  );
}
