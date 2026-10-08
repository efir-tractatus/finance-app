import { getTimeWindow } from '../../config/timeWindows';
import { DEFAULT_COMPANIES } from '../../config/companies';
import type { PriceSeries, Quote, TimeWindow } from '../../domain/types';
import { MarketDataError } from '../errors';
import type { MarketDataProvider } from './MarketDataProvider';

/**
 * Extra tickers the offline demo can serve for the "user-selected company" graph.
 * They are deliberately NOT in DEFAULT_COMPANIES, so they never join the IBM comparison set.
 */
export const EXTRA_MOCK_PRICES: Record<string, number> = { AAPL: 190, GOOGL: 170 };

/** Base prices for deterministic demo data. Anything not listed behaves like a ticker Yahoo cannot find. */
const BASE_PRICES: Record<string, number> = {
  ...Object.fromEntries(
    DEFAULT_COMPANIES.filter((c) => c.mockBasePrice !== undefined).map((c) => [c.symbol, c.mockBasePrice as number]),
  ),
  ...EXTRA_MOCK_PRICES,
};

const FIXED_NOW = Date.UTC(2025, 0, 15, 21, 0, 0);

function seedFrom(symbol: string): number {
  return [...symbol].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

/** Deterministic pseudo-walk so tests and demos are repeatable. */
function priceAt(symbol: string, step: number): number {
  const base = BASE_PRICES[symbol];
  const seed = seedFrom(symbol);
  return +(base * (1 + Math.sin((step + seed) / 6) * 0.03 + step * 0.0004)).toFixed(2);
}

function pointCount(window: TimeWindow): number {
  return { day: 26, week: 35, quarter: 63 }[window];
}

export function createMockProvider(): MarketDataProvider {
  const assertKnown = (symbol: string) => {
    if (!(symbol in BASE_PRICES)) {
      // Mirrors the live server: a well-formed ticker with no data is NO_DATA (404), not INVALID_SYMBOL.
      throw new MarketDataError(`No data found for ${symbol}`, 'NO_DATA');
    }
  };

  return {
    async getQuotes(symbols) {
      return symbols.map((symbol): Quote => {
        assertKnown(symbol);
        const last = priceAt(symbol, pointCount('day') - 1);
        const prev = priceAt(symbol, 0);
        const name = DEFAULT_COMPANIES.find((c) => c.symbol === symbol)?.name ?? symbol;
        return {
          symbol,
          name,
          price: last,
          change: +(last - prev).toFixed(2),
          changePct: +(((last - prev) / prev) * 100).toFixed(2),
          currency: 'USD',
          asOf: new Date(FIXED_NOW).toISOString(),
        };
      });
    },

    async getHistory(symbol, window): Promise<PriceSeries> {
      assertKnown(symbol);
      const count = pointCount(window);
      const stepMs = getTimeWindow(window).intervalMinutes * 60_000;
      const points = Array.from({ length: count }, (_, i) => ({
        t: FIXED_NOW - (count - 1 - i) * stepMs,
        close: priceAt(symbol, i),
      }));
      return { symbol, window, points };
    },
  };
}
