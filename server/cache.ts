import type { MarketDataProvider } from '../src/services/marketData/MarketDataProvider';

/** Memoizes successful results per key for `ttlMs`; failures are never cached. */
export function withCache(provider: MarketDataProvider, ttlMs: number, now: () => number = Date.now): MarketDataProvider {
  const store = new Map<string, { expires: number; value: Promise<unknown> }>();

  function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = store.get(key);
    if (hit && hit.expires > now()) return hit.value as Promise<T>;
    const value = load();
    store.set(key, { expires: now() + ttlMs, value });
    value.catch(() => store.delete(key));
    return value;
  }

  return {
    getQuotes: (symbols) => cached(`q:${[...symbols].sort().join(',')}`, () => provider.getQuotes(symbols)),
    getHistory: (symbol, window) => cached(`h:${symbol}:${window}`, () => provider.getHistory(symbol, window)),
  };
}
