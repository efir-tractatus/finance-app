import { describe, expect, it } from 'vitest';
import { MarketDataError } from '../errors';
import { normalizeHistory, normalizeQuote } from './normalize';
import { assertValidSymbol, isValidSymbol } from './symbols';

describe('normalizeQuote', () => {
  it('maps a complete Yahoo quote and rounds values', () => {
    const q = normalizeQuote({
      symbol: 'IBM',
      shortName: 'Intl Business Machines',
      currency: 'USD',
      regularMarketPrice: 230.456,
      regularMarketChange: 1.234,
      regularMarketChangePercent: 0.5391,
      regularMarketTime: new Date('2025-01-15T21:00:00Z'),
    });
    expect(q).toEqual({
      symbol: 'IBM',
      name: 'Intl Business Machines',
      price: 230.46,
      change: 1.23,
      changePct: 0.54,
      currency: 'USD',
      asOf: '2025-01-15T21:00:00.000Z',
    });
  });

  it('prefers the configured display name', () => {
    expect(normalizeQuote({ symbol: 'CRM', shortName: 'SALESFORCE, INC.', regularMarketPrice: 1 }, 'Salesforce').name).toBe(
      'Salesforce',
    );
  });

  it('derives change and percent from the previous close when missing', () => {
    const q = normalizeQuote({ symbol: 'SAP', regularMarketPrice: 110, regularMarketPreviousClose: 100 });
    expect(q.change).toBe(10);
    expect(q.changePct).toBe(10);
  });

  it('defaults safely when optional fields are absent', () => {
    const q = normalizeQuote({ symbol: 'ORCL', regularMarketPrice: 50 });
    expect(q).toMatchObject({ name: 'ORCL', currency: 'USD', change: 0, changePct: 0 });
  });

  it('throws NO_DATA when there is no price', () => {
    expect(() => normalizeQuote({ symbol: 'X', regularMarketPrice: null })).toThrowError(MarketDataError);
  });
});

describe('normalizeHistory', () => {
  const d = (iso: string) => new Date(iso);

  it('drops null closes, sorts ascending and de-duplicates timestamps', () => {
    const s = normalizeHistory('IBM', 'week', [
      { date: d('2025-01-14T15:00:00Z'), close: 12 },
      { date: d('2025-01-13T15:00:00Z'), close: 10 },
      { date: d('2025-01-14T15:00:00Z'), close: 11 },
      { date: d('2025-01-15T15:00:00Z'), close: null },
    ]);
    expect(s.points).toEqual([
      { t: d('2025-01-13T15:00:00Z').getTime(), close: 10 },
      { t: d('2025-01-14T15:00:00Z').getTime(), close: 11 },
    ]);
  });

  it('returns an empty series for empty input', () => {
    expect(normalizeHistory('IBM', 'quarter', []).points).toEqual([]);
  });

  it('keeps only the latest trading session for the day window', () => {
    const s = normalizeHistory(
      'IBM',
      'day',
      [
        { date: d('2025-01-16T15:00:00Z'), close: 1 }, // Thursday
        { date: d('2025-01-17T15:00:00Z'), close: 2 }, // Friday
        { date: d('2025-01-17T15:15:00Z'), close: 3 },
      ],
      { timeZone: 'America/New_York' },
    );
    expect(s.points.map((p) => p.close)).toEqual([2, 3]);
  });

  it('does not filter by session for week and quarter', () => {
    const s = normalizeHistory('IBM', 'week', [
      { date: d('2025-01-16T15:00:00Z'), close: 1 },
      { date: d('2025-01-17T15:00:00Z'), close: 2 },
    ]);
    expect(s.points).toHaveLength(2);
  });
});

describe('symbols', () => {
  it('normalizes case and whitespace', () => {
    expect(assertValidSymbol(' ibm ')).toBe('IBM');
  });

  it.each(['BRK-B', 'BF.B', '^GSPC', 'EURUSD=X', 'A'])('accepts %s', (s) => {
    expect(isValidSymbol(s)).toBe(true);
  });

  it.each(['', '   ', 'TOOLONGSYMBOL', 'IBM;DROP', 'a b', '-X'])('rejects "%s"', (s) => {
    expect(isValidSymbol(s)).toBe(false);
    expect(() => assertValidSymbol(s)).toThrowError(MarketDataError);
  });
});
