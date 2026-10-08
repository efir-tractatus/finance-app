import YahooFinance from 'yahoo-finance2';
import { getTimeWindow } from '../src/config/timeWindows';
import { DEFAULT_COMPANIES } from '../src/config/companies';
import { MarketDataError } from '../src/services/errors';
import type { MarketDataProvider } from '../src/services/marketData/MarketDataProvider';
import { normalizeHistory, normalizeQuote } from '../src/services/marketData/normalize';
import { assertValidSymbol } from '../src/services/marketData/symbols';

/** The slice of yahoo-finance2 we use; lets tests inject a fake. */
export interface YahooClient {
  quote(symbols: string[]): Promise<unknown[]>;
  chart(
    symbol: string,
    options: { period1: Date; period2: Date; interval: '15m' | '1h' | '1d' },
  ): Promise<{ meta?: { exchangeTimezoneName?: string }; quotes: unknown[] }>;
}

function createDefaultClient(): YahooClient {
  const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
  return {
    quote: (symbols) => yf.quote(symbols) as Promise<unknown[]>,
    chart: (symbol, options) => yf.chart(symbol, options) as ReturnType<YahooClient['chart']>,
  };
}

function toUpstreamError(err: unknown, symbol?: string): MarketDataError {
  if (err instanceof MarketDataError) return err;
  const message = err instanceof Error ? err.message : String(err);
  // yahoo-finance2 reports an unknown ticker as "Not Found" / "No data found".
  if (/not found|no data found/i.test(message)) {
    return new MarketDataError(`No data found${symbol ? ` for ${symbol}` : ''}`, 'NO_DATA');
  }
  return new MarketDataError('Yahoo Finance is unavailable', 'UPSTREAM');
}

/** Server-side provider backed by Yahoo Finance. Output is already normalized to domain types. */
export function createYahooProvider(client: YahooClient = createDefaultClient()): MarketDataProvider {
  const names = new Map(DEFAULT_COMPANIES.map((c) => [c.symbol, c.name]));

  return {
    async getQuotes(symbols) {
      const requested = symbols.map(assertValidSymbol);
      let raw: unknown[];
      try {
        raw = await client.quote(requested);
      } catch (err) {
        throw toUpstreamError(err);
      }

      // Per-symbol isolation: one bad/empty quote must not hide the others.
      const quotes = raw.flatMap((r) => {
        try {
          const q = r as Parameters<typeof normalizeQuote>[0];
          return [normalizeQuote(q, names.get(q.symbol))];
        } catch {
          return [];
        }
      });
      if (quotes.length === 0) throw new MarketDataError('No quote data available', 'NO_DATA');
      return quotes;
    },

    async getHistory(symbol, window) {
      const clean = assertValidSymbol(symbol);
      const cfg = getTimeWindow(window);
      const period2 = new Date();
      const period1 = new Date(period2.getTime() - cfg.lookbackDays * 86_400_000);
      try {
        const result = await client.chart(clean, { period1, period2, interval: cfg.yahooInterval });
        const series = normalizeHistory(clean, window, result.quotes as Parameters<typeof normalizeHistory>[2], {
          timeZone: result.meta?.exchangeTimezoneName,
        });
        if (series.points.length === 0) throw new MarketDataError(`No history for ${clean}`, 'NO_DATA');
        return series;
      } catch (err) {
        throw toUpstreamError(err, clean);
      }
    },
  };
}
