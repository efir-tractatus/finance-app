import { describe, expect, it } from 'vitest';
import { average, pctChange, rankByChange, rebaseTo100 } from './metrics';

const pts = (...closes: number[]) => closes.map((close, i) => ({ t: i, close }));

describe('metrics', () => {
  it('computes percent change first to last', () => {
    expect(pctChange(pts(100, 110))).toBeCloseTo(10);
  });

  it('returns 0 for empty or single-point input', () => {
    expect(pctChange([])).toBe(0);
    expect(pctChange(pts(5))).toBe(0);
  });

  it('rebases a series to 100', () => {
    expect(rebaseTo100(pts(50, 100)).map((p) => p.close)).toEqual([100, 200]);
  });

  it('returns an empty series when the base is zero', () => {
    expect(rebaseTo100(pts(0, 5))).toEqual([]);
  });

  it('averages values and returns 0 for none', () => {
    expect(average([1, 2, 6])).toBe(3);
    expect(average([])).toBe(0);
  });

  it('ranks best-first without mutating the input', () => {
    const input = [{ id: 'a', changePct: -1 }, { id: 'b', changePct: 5 }, { id: 'c', changePct: 2 }];
    const ranked = rankByChange(input);
    expect(ranked.map((r) => [r.id, r.rank])).toEqual([['b', 1], ['c', 2], ['a', 3]]);
    expect(input[0].id).toBe('a');
  });
});
