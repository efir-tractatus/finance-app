import { describe, expect, it } from 'vitest';
import { isValidSymbol } from '../services/marketData/symbols';
import { DEFAULT_COMPANIES, MAX_COMPETITORS, PRIMARY_SYMBOL } from './companies';
import { TIME_WINDOWS, getTimeWindow } from './timeWindows';

// Guards for the two places contributors edit most when extending the app.
describe('company config', () => {
  it('includes the primary company and at most the allowed number of competitors', () => {
    expect(DEFAULT_COMPANIES.some((c) => c.symbol === PRIMARY_SYMBOL)).toBe(true);
    expect(DEFAULT_COMPANIES.length - 1).toBeLessThanOrEqual(MAX_COMPETITORS);
  });

  it('has unique, valid, upper-case symbols and distinct colours', () => {
    const symbols = DEFAULT_COMPANIES.map((c) => c.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
    for (const s of symbols) {
      expect(isValidSymbol(s)).toBe(true);
      expect(s).toBe(s.toUpperCase());
    }
    const colors = DEFAULT_COMPANIES.map((c) => c.color);
    expect(new Set(colors).size).toBe(colors.length);
    expect(colors.every((c) => /^#[0-9a-f]{6}$/i.test(c))).toBe(true);
  });
});

describe('time window config', () => {
  it('defines day, week and quarter exactly once, in display order', () => {
    expect(TIME_WINDOWS.map((w) => w.id)).toEqual(['day', 'week', 'quarter']);
  });

  it('looks back at least as far as the window it displays', () => {
    for (const w of TIME_WINDOWS) {
      expect(w.lookbackDays).toBeGreaterThanOrEqual(w.days);
      expect(w.intervalMinutes).toBeGreaterThan(0);
    }
  });

  it('looks up by id and fails loudly for an unknown id', () => {
    expect(getTimeWindow('week').label).toBe('Last 7 days');
    expect(() => getTimeWindow('year' as never)).toThrowError(/Unknown time window/);
  });
});
