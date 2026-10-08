// @vitest-environment node
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { MarketDataError } from '../src/services/errors';
import type { MarketDataProvider } from '../src/services/marketData/MarketDataProvider';
import { createApp } from './app';
import { withCache } from './cache';
import { createYahooProvider, type YahooClient } from './yahooProvider';

function fakeClient(overrides: Partial<YahooClient> = {}): YahooClient {
  return {
    quote: async () => [
      { symbol: 'IBM', shortName: 'IBM Corp', regularMarketPrice: 230, regularMarketChange: 2, regularMarketChangePercent: 0.88 },
      { symbol: 'BAD', regularMarketPrice: null },
    ],
    chart: async () => ({
      meta: { exchangeTimezoneName: 'America/New_York' },
      quotes: [
        { date: new Date(Date.now() - 3600_000), close: 100 },
        { date: new Date(), close: null },
        { date: new Date(Date.now() - 1800_000), close: 101 },
      ],
    }),
    ...overrides,
  };
}

describe('createYahooProvider', () => {
  it('normalizes quotes and drops ones without a price', async () => {
    const quotes = await createYahooProvider(fakeClient()).getQuotes(['ibm', 'bad']);
    expect(quotes).toHaveLength(1);
    expect(quotes[0]).toMatchObject({ symbol: 'IBM', name: 'IBM', price: 230 });
  });

  it('throws NO_DATA when no quote is usable', async () => {
    const p = createYahooProvider(fakeClient({ quote: async () => [{ symbol: 'X' }] }));
    await expect(p.getQuotes(['X'])).rejects.toMatchObject({ code: 'NO_DATA' });
  });

  it('maps upstream failures to UPSTREAM without leaking the raw message', async () => {
    const p = createYahooProvider(fakeClient({ quote: async () => Promise.reject(new Error('secret internal detail')) }));
    const err = await p.getQuotes(['IBM']).catch((e) => e);
    expect(err).toMatchObject({ code: 'UPSTREAM', message: 'Yahoo Finance is unavailable' });
  });

  it('returns a cleaned, ascending history series', async () => {
    const s = await createYahooProvider(fakeClient()).getHistory('IBM', 'week');
    expect(s.symbol).toBe('IBM');
    expect(s.points.map((x) => x.close)).toEqual([100, 101]);
  });

  it('requests the interval configured for the window', async () => {
    const chart = vi.fn(fakeClient().chart);
    await createYahooProvider(fakeClient({ chart })).getHistory('IBM', 'quarter');
    expect(chart).toHaveBeenCalledWith('IBM', expect.objectContaining({ interval: '1d' }));
  });

  it('maps Yahoo "not found" to NO_DATA and empty history to NO_DATA', async () => {
    const notFound = createYahooProvider(fakeClient({ chart: async () => Promise.reject(new Error('Not Found')) }));
    await expect(notFound.getHistory('ZZZZ', 'day')).rejects.toMatchObject({ code: 'NO_DATA' });

    const empty = createYahooProvider(fakeClient({ chart: async () => ({ quotes: [] }) }));
    await expect(empty.getHistory('IBM', 'day')).rejects.toMatchObject({ code: 'NO_DATA' });
  });
});

describe('API routes', () => {
  const provider: MarketDataProvider = {
    getQuotes: async (symbols) => symbols.map((symbol) => ({
      symbol, name: symbol, price: 1, change: 0, changePct: 0, currency: 'USD', asOf: '2025-01-15T00:00:00.000Z',
    })),
    getHistory: async (symbol, window) => ({ symbol, window, points: [{ t: 1, close: 1 }] }),
  };
  const app = createApp(provider);

  it('GET /api/quotes returns normalized quotes', async () => {
    const res = await request(app).get('/api/quotes?symbols=ibm,msft');
    expect(res.status).toBe(200);
    expect(res.body.quotes.map((q: { symbol: string }) => q.symbol)).toEqual(['IBM', 'MSFT']);
  });

  it.each(['/api/quotes', '/api/quotes?symbols=IBM;DROP', '/api/quotes?symbols=A,B,C,D,E,F,G,H,I,J,K'])(
    '400 for bad quote input: %s',
    async (url) => {
      const res = await request(app).get(url);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_SYMBOL');
    },
  );

  it('GET /api/history returns a series and validates window', async () => {
    const ok = await request(app).get('/api/history?symbol=IBM&window=day');
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ symbol: 'IBM', window: 'day' });

    expect((await request(app).get('/api/history?symbol=IBM&window=year')).status).toBe(400);
    expect((await request(app).get('/api/history?window=day')).status).toBe(400);
  });

  it('maps provider errors to status codes and a safe body', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const failing = createApp({
      getQuotes: async () => Promise.reject(new MarketDataError('No data', 'NO_DATA')),
      getHistory: async () => Promise.reject(new Error('boom: internal')),
    });
    expect((await request(failing).get('/api/quotes?symbols=IBM')).status).toBe(404);
    const res = await request(failing).get('/api/history?symbol=IBM&window=day');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('internal');
  });
});

describe('withCache', () => {
  it('serves repeat calls from cache until the TTL expires, and never caches failures', async () => {
    let t = 0;
    const getQuotes = vi.fn(async () => []);
    const cached = withCache({ getQuotes, getHistory: vi.fn() }, 1000, () => t);

    await cached.getQuotes(['B', 'A']);
    await cached.getQuotes(['A', 'B']); // same key regardless of order
    expect(getQuotes).toHaveBeenCalledTimes(1);

    t = 1500;
    await cached.getQuotes(['A', 'B']);
    expect(getQuotes).toHaveBeenCalledTimes(2);

    const flaky = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce([]);
    const c2 = withCache({ getQuotes: flaky, getHistory: vi.fn() }, 1000, () => t);
    await expect(c2.getQuotes(['A'])).rejects.toThrow();
    await c2.getQuotes(['A']);
    expect(flaky).toHaveBeenCalledTimes(2);
  });
});
