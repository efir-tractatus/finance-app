import type { Company, PriceSeries, Quote, TimeWindow } from '../domain/types';
import type { MarketDataProvider } from '../services/marketData';
import { useAsync } from './useAsync';

/** Quotes for the given companies, in the same order as `companies`. */
export function useQuotes(provider: MarketDataProvider, companies: Company[]) {
  const symbols = companies.map((c) => c.symbol);
  return useAsync<Quote[]>(async () => {
    const quotes = await provider.getQuotes(symbols);
    return symbols.flatMap((s) => quotes.filter((q) => q.symbol === s));
  }, [provider, symbols.join(',')]);
}

export interface Histories {
  series: PriceSeries[];
  /** Symbols whose history could not be loaded; the rest still render. */
  failed: string[];
}

/** One history request per company. A single failure only drops that company. */
export function useHistories(provider: MarketDataProvider, companies: Company[], window: TimeWindow) {
  const symbols = companies.map((c) => c.symbol);
  return useAsync<Histories>(async () => {
    const results = await Promise.allSettled(symbols.map((s) => provider.getHistory(s, window)));
    const series = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    if (series.length === 0) {
      const firstFailure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      throw firstFailure?.reason ?? new Error('No history available');
    }
    return { series, failed: symbols.filter((_, i) => results[i].status === 'rejected') };
  }, [provider, symbols.join(','), window]);
}
