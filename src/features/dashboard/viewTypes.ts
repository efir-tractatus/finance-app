import type { Company } from '../../domain/types';
import type { MarketDataProvider } from '../../services/marketData';

export interface ViewProps {
  provider: MarketDataProvider;
  companies: Company[];
  /** Symbol the dashboard is centred on (IBM) */
  focusSymbol: string;
}
