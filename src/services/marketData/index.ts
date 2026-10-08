import { createHttpProvider } from './httpProvider';
import { createMockProvider } from './mockProvider';
import type { MarketDataProvider } from './MarketDataProvider';

export type { MarketDataProvider } from './MarketDataProvider';

/**
 * Single place to choose the data source.
 * `VITE_DATA_SOURCE=live` (default) calls the Yahoo-backed proxy at /api; `mock` uses offline fixtures.
 */
export function createMarketDataProvider(source: string = import.meta.env.VITE_DATA_SOURCE ?? 'live'): MarketDataProvider {
  return source === 'mock' ? createMockProvider() : createHttpProvider();
}
