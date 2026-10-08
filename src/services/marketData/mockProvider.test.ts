import { describe, expect, it } from 'vitest';
import { DEFAULT_COMPANIES } from '../../config/companies';
import { TIME_WINDOWS } from '../../config/timeWindows';
import { EXTRA_MOCK_PRICES, createMockProvider } from './mockProvider';

// The mock provider is the offline/demo data source, so it must honour the same contract as the live one.
describe('mockProvider', () => {
  const provider = createMockProvider();
  const symbols = DEFAULT_COMPANIES.map((c) => c.symbol);

  it('returns a valid quote for every configured company', async () => {
    const quotes = await provider.getQuotes(symbols);
    expect(quotes.map((q) => q.symbol)).toEqual(symbols);
    for (const q of quotes) {
      expect(q.price).toBeGreaterThan(0);
      expect(Number.isFinite(q.change)).toBe(true);
      expect(Number.isFinite(q.changePct)).toBe(true);
      expect(q.currency).toBe('USD');
      expect(Number.isNaN(Date.parse(q.asOf))).toBe(false);
    }
    expect(quotes.find((q) => q.symbol === 'CRM')?.name).toBe('Salesforce');
  });

  it.each(TIME_WINDOWS.map((w) => w.id))('returns ascending, finite history for the %s window', async (window) => {
    for (const symbol of symbols) {
      const series = await provider.getHistory(symbol, window);
      expect(series).toMatchObject({ symbol, window });
      expect(series.points.length).toBeGreaterThan(1);
      expect(series.points.every((p) => Number.isFinite(p.close) && p.close > 0)).toBe(true);
      const times = series.points.map((p) => p.t);
      expect(times).toEqual([...times].sort((a, b) => a - b));
    }
  });

  it('is deterministic so tests and demos are repeatable', async () => {
    expect(await provider.getHistory('IBM', 'week')).toEqual(await createMockProvider().getHistory('IBM', 'week'));
  });

  it('rejects unknown symbols with NO_DATA, like the live server does', async () => {
    await expect(provider.getQuotes(['IBM', 'ZZZZ'])).rejects.toMatchObject({ code: 'NO_DATA' });
    await expect(provider.getHistory('ZZZZ', 'day')).rejects.toMatchObject({ code: 'NO_DATA' });
  });

  it('serves the extra demo tickers without adding them to the dashboard company list', async () => {
    for (const symbol of Object.keys(EXTRA_MOCK_PRICES)) {
      const series = await provider.getHistory(symbol, 'week');
      expect(series.points.length).toBeGreaterThan(1);
      expect(DEFAULT_COMPANIES.some((c) => c.symbol === symbol)).toBe(false);
    }
  });
});
