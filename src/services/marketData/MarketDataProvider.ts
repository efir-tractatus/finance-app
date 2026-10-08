import type { PriceSeries, Quote, TimeWindow } from '../../domain/types';

/**
 * Contract between the UI and any market data source
 * (mock fixtures today; Yahoo Finance via a proxy later).
 */
export interface MarketDataProvider {
  getQuotes(symbols: string[]): Promise<Quote[]>;
  getHistory(symbol: string, window: TimeWindow): Promise<PriceSeries>;
}
