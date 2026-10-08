import type { PricePoint } from './types';

/** Percent change from the first to the last point. Returns 0 for empty or zero-based input. */
export function pctChange(points: PricePoint[]): number {
  if (points.length < 2 || points[0].close === 0) return 0;
  const first = points[0].close;
  const last = points[points.length - 1].close;
  return ((last - first) / first) * 100;
}

/** Mean of a list; 0 when empty. */
export function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

/** Sorts best-first by `changePct` and assigns rank 1..n. Does not mutate the input. */
export function rankByChange<T extends { changePct: number }>(items: T[]): Array<T & { rank: number }> {
  return [...items].sort((a, b) => b.changePct - a.changePct).map((item, i) => ({ ...item, rank: i + 1 }));
}

/** Rebase a series to an index starting at 100 so different price levels are comparable. */
export function rebaseTo100(points: PricePoint[]): PricePoint[] {
  if (points.length === 0 || points[0].close === 0) return [];
  const base = points[0].close;
  return points.map((p) => ({ t: p.t, close: (p.close / base) * 100 }));
}
