import type { PriceSeries, Quote, TimeWindow } from '../../domain/types';
import { MarketDataError } from '../errors';
import type { MarketDataProvider } from './MarketDataProvider';
import { assertValidSymbol } from './symbols';

interface ApiErrorBody {
  error?: { code?: MarketDataError['code']; message?: string };
}

/** Browser-side provider that talks to the server proxy (`/api/quotes`, `/api/history`). */
export function createHttpProvider(
  baseUrl = '/api',
  fetchImpl: typeof fetch = (input, init) => fetch(input, init),
): MarketDataProvider {
  async function get<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = `${baseUrl}${path}?${new URLSearchParams(params)}`;
    let res: Response;
    try {
      res = await fetchImpl(url);
    } catch {
      throw new MarketDataError('Market data service is unreachable', 'UPSTREAM');
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
      throw new MarketDataError(
        body.error?.message ?? `Market data request failed (${res.status})`,
        body.error?.code ?? 'UPSTREAM',
      );
    }
    return (await res.json()) as T;
  }

  return {
    async getQuotes(symbols: string[]): Promise<Quote[]> {
      const normalized = symbols.map(assertValidSymbol);
      const body = await get<{ quotes: Quote[] }>('/quotes', { symbols: normalized.join(',') });
      return body.quotes;
    },
    async getHistory(symbol: string, window: TimeWindow): Promise<PriceSeries> {
      return get<PriceSeries>('/history', { symbol: assertValidSymbol(symbol), window });
    },
  };
}
