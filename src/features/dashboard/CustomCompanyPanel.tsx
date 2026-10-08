import { ChartCard } from '../../components/ChartCard';
import { PriceLineChart } from '../../components/PriceLineChart';
import type { Company, TimeWindow } from '../../domain/types';
import { MarketDataError } from '../../services/errors';
import { useCompanyChartSeries, useCompanyHistory } from './useCompanyHistory';
import type { MarketDataProvider } from '../../services/marketData';

interface CustomCompanyPanelProps {
  provider: MarketDataProvider;
  symbol: string;
  window: TimeWindow;
  /** Company drawn alongside for context (IBM). Its failure never hides the selected graph. */
  reference: Company;
  onClear: () => void;
}

function describeError(symbol: string, error: Error): string {
  if (error instanceof MarketDataError) {
    if (error.code === 'NO_DATA') return `No data found for ${symbol}. Check the ticker and try again.`;
    if (error.code === 'INVALID_SYMBOL') return `${symbol} is not a valid ticker.`;
  }
  return `Could not load ${symbol}: the market data service is unavailable. Try again shortly.`;
}

/**
 * Independent panel for the user-selected company. It owns its own fetch and error handling,
 * so nothing here can affect the IBM-versus-competitor views rendered above it.
 */
export function CustomCompanyPanel({ provider, symbol, window, reference, onClear }: CustomCompanyPanelProps) {
  const history = useCompanyHistory(provider, symbol, reference.symbol, window);
  const series = useCompanyChartSeries(history.status === 'success' ? history.data : undefined, symbol, reference);

  return (
    <section className="custom-company" aria-label={`${symbol} graph`}>
      <div className="custom-company__header">
        <h2>{symbol} versus {reference.name}</h2>
        <button type="button" className="link-button" onClick={onClear}>
          Remove {symbol}
        </button>
      </div>
      <ChartCard
        title={`${symbol} performance (start = 100)`}
        loading={history.status === 'loading'}
        error={history.status === 'error' ? describeError(symbol, history.error) : undefined}
        empty={history.status === 'success' && history.data.selected.points.length === 0}
        onRetry={history.retry}
      >
        <PriceLineChart series={series} emphasize={symbol} yLabel="Index" />
      </ChartCard>
      {history.status === 'success' && !history.data.reference && (
        <p className="note">{reference.name} could not be loaded, so only {symbol} is shown.</p>
      )}
    </section>
  );
}
