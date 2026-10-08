import type { PricePoint, PriceSeries, Quote, TimeWindow } from '../../domain/types';
import { MarketDataError } from '../errors';

/**
 * Minimal structural shapes of what Yahoo Finance returns. Only the fields we read are listed,
 * so a Yahoo schema change that leaves these alone cannot break normalization.
 */
type DateLike = Date | string | number;

export interface RawQuote {
  symbol: string;
  shortName?: string | null;
  longName?: string | null;
  currency?: string | null;
  regularMarketPrice?: number | null;
  regularMarketChange?: number | null;
  regularMarketChangePercent?: number | null;
  regularMarketPreviousClose?: number | null;
  regularMarketTime?: DateLike | null;
}

export interface RawBar {
  date: DateLike;
  close?: number | null;
}

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const round2 = (n: number) => Math.round(n * 100) / 100;

function toMillis(d: DateLike | null | undefined): number | undefined {
  if (d === null || d === undefined) return undefined;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : undefined;
}

/**
 * Turns a raw Yahoo quote into a domain Quote. Missing change fields are derived from the
 * previous close. Throws NO_DATA if there is no usable price.
 */
export function normalizeQuote(raw: RawQuote, displayName?: string): Quote {
  const price = raw.regularMarketPrice;
  if (!isNum(price)) {
    throw new MarketDataError(`No price available for ${raw.symbol}`, 'NO_DATA');
  }
  const prev = raw.regularMarketPreviousClose;
  const change = isNum(raw.regularMarketChange) ? raw.regularMarketChange : isNum(prev) ? price - prev : 0;
  const changePct = isNum(raw.regularMarketChangePercent)
    ? raw.regularMarketChangePercent
    : isNum(prev) && prev !== 0
      ? (change / prev) * 100
      : 0;

  return {
    symbol: raw.symbol,
    name: displayName ?? raw.shortName ?? raw.longName ?? raw.symbol,
    price: round2(price),
    change: round2(change),
    changePct: round2(changePct),
    currency: raw.currency ?? 'USD',
    asOf: new Date(toMillis(raw.regularMarketTime) ?? Date.now()).toISOString(),
  };
}

function sessionDay(t: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
}

/**
 * Turns raw Yahoo bars into a clean, ascending, de-duplicated series. Bars with a null close
 * (common for halted or partial sessions) are dropped. For the `day` window only the most
 * recent trading session is kept, so weekends and holidays still show the last session.
 */
export function normalizeHistory(
  symbol: string,
  window: TimeWindow,
  bars: RawBar[],
  options: { timeZone?: string } = {},
): PriceSeries {
  const byTime = new Map<number, PricePoint>();
  for (const bar of bars) {
    const t = toMillis(bar.date);
    if (t !== undefined && isNum(bar.close)) byTime.set(t, { t, close: round2(bar.close) });
  }
  let points = [...byTime.values()].sort((a, b) => a.t - b.t);

  if (window === 'day' && points.length > 0) {
    const tz = options.timeZone ?? 'UTC';
    const lastDay = sessionDay(points[points.length - 1].t, tz);
    points = points.filter((p) => sessionDay(p.t, tz) === lastDay);
  }
  return { symbol, window, points };
}
