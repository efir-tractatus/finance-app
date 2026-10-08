import { describe, expect, it } from 'vitest';
import type { Company, PriceSeries } from '../../domain/types';
import { buildComparison, formatPct } from './comparison';

const companies: Company[] = [
  { symbol: 'IBM', name: 'IBM', color: '#00f' },
  { symbol: 'MSFT', name: 'Microsoft', color: '#0f0' },
  { symbol: 'ORCL', name: 'Oracle', color: '#f00' },
];

const series = (symbol: string, ...closes: number[]): PriceSeries => ({
  symbol,
  window: 'week',
  points: closes.map((close, i) => ({ t: i, close })),
});

describe('buildComparison', () => {
  const data = [series('IBM', 100, 110), series('MSFT', 200, 200), series('ORCL', 50, 40)];
  const result = buildComparison(data, companies, 'IBM');

  it('rebases every series to 100', () => {
    expect(result.chartSeries.map((s) => s.points[0].close)).toEqual([100, 100, 100]);
    expect(result.chartSeries[2].points[1].close).toBe(80);
  });

  it('ranks by period change, best first', () => {
    expect(result.ranking.map((r) => [r.symbol, r.rank])).toEqual([['IBM', 1], ['MSFT', 2], ['ORCL', 3]]);
  });

  it('finds the focus company and averages only its peers', () => {
    expect(result.focus).toMatchObject({ symbol: 'IBM', rank: 1 });
    expect(result.peerAverage).toBeCloseTo(-10); // (0 + -20) / 2
  });

  it('copes with the focus company missing', () => {
    const r = buildComparison([series('MSFT', 1, 2)], companies, 'IBM');
    expect(r.focus).toBeUndefined();
    expect(r.peerAverage).toBeCloseTo(100);
  });

  it('has no peer average when only the focus company is present', () => {
    expect(buildComparison([series('IBM', 1, 2)], companies, 'IBM').peerAverage).toBeUndefined();
  });

  it('formats percentages with a sign', () => {
    expect(formatPct(1.234)).toBe('+1.23%');
    expect(formatPct(-0.5)).toBe('-0.50%');
  });
});
