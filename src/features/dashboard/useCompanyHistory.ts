import { useMemo } from 'react';
import type { ChartSeries } from '../../components/PriceLineChart';
import { rebaseTo100 } from '../../domain/metrics';
import type { Company, PriceSeries, TimeWindow } from '../../domain/types';
import { useAsync } from '../../hooks/useAsync';
import type { MarketDataProvider } from '../../services/marketData';

export interface CompanyHistory {
  /** The user-selected company's history. Always present: without it there is nothing to show. */
  selected: PriceSeries;
  /** IBM (or whichever reference) for context; absent if it failed, which must not hide the graph. */
  reference?: PriceSeries;
}

/**
 * Loads history for the user-selected symbol plus a reference company.
 * Only the selected symbol is required: if it fails, the error (with its code) is surfaced so the UI
 * can tell "no data for that ticker" apart from "service unavailable". A reference failure is tolerated.
 */
export function useCompanyHistory(
  provider: MarketDataProvider,
  symbol: string,
  referenceSymbol: string,
  window: TimeWindow,
) {
  return useAsync<CompanyHistory>(async () => {
    const [selected, reference] = await Promise.allSettled([
      provider.getHistory(symbol, window),
      provider.getHistory(referenceSymbol, window),
    ]);
    if (selected.status === 'rejected') throw selected.reason;
    return { selected: selected.value, reference: reference.status === 'fulfilled' ? reference.value : undefined };
  }, [provider, symbol, referenceSymbol, window]);
}

/** Builds rebased chart series: the reference company (if loaded) and the selected one, emphasized by key. */
export function useCompanyChartSeries(
  data: CompanyHistory | undefined,
  symbol: string,
  reference: Company | undefined,
): ChartSeries[] {
  return useMemo(() => {
    if (!data) return [];
    const series: ChartSeries[] = [];
    if (data.reference && reference) {
      series.push({
        key: reference.symbol,
        label: reference.name,
        color: reference.color,
        points: rebaseTo100(data.reference.points),
      });
    }
    series.push({ key: symbol, label: symbol, color: '#ff7eb6', points: rebaseTo100(data.selected.points) });
    return series;
  }, [data, symbol, reference]);
}
