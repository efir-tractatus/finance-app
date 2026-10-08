import { useMemo } from 'react';
import { ChartCard } from '../../components/ChartCard';
import { PriceLineChart } from '../../components/PriceLineChart';
import { RankingTable } from '../../components/RankingTable';
import { StatCard } from '../../components/StatCard';
import { useHistories } from '../../hooks/useMarketData';
import { buildComparison, formatPct, toneOf } from './comparison';
import type { ViewProps } from './viewTypes';

/** Last quarter: long-run trend comparison plus a ranking of who gained most. */
export function QuarterView({ provider, companies, focusSymbol }: ViewProps) {
  const history = useHistories(provider, companies, 'quarter');
  const comparison = useMemo(
    () => (history.status === 'success' ? buildComparison(history.data.series, companies, focusSymbol) : undefined),
    [history, companies, focusSymbol],
  );
  const failedMessage = history.status === 'error' ? `Could not load quarter history: ${history.error.message}` : undefined;
  const { focus, peerAverage } = comparison ?? {};

  return (
    <div>
      {focus && (
        <div className="stat-grid">
          <StatCard label={`${focus.name} quarter change`} value={formatPct(focus.changePct)} tone={toneOf(focus.changePct)} />
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
        title="Quarter trend comparison (start = 100)"
        loading={history.status === 'loading'}
        error={failedMessage}
        empty={comparison?.chartSeries.every((s) => s.points.length === 0)}
        onRetry={history.retry}
      >
        <PriceLineChart series={comparison?.chartSeries ?? []} emphasize={focusSymbol} yLabel="Index" height={320} />
      </ChartCard>

      {comparison && (
        <ChartCard title="Quarter ranking" empty={comparison.ranking.length === 0}>
          <RankingTable rows={comparison.ranking} highlight={focusSymbol} caption="Change over the last quarter, best first" />
        </ChartCard>
      )}
      {history.status === 'success' && history.data.failed.length > 0 && (
        <p className="note">No quarter data for: {history.data.failed.join(', ')}</p>
      )}
    </div>
  );
}
