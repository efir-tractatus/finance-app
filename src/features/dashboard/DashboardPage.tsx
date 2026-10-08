import { useState } from 'react';
import { DEFAULT_COMPANIES, PRIMARY_SYMBOL } from '../../config/companies';
import { TIME_WINDOWS } from '../../config/timeWindows';
import type { TimeWindow } from '../../domain/types';
import { createMarketDataProvider, type MarketDataProvider } from '../../services/marketData';
import { DayView } from './DayView';
import { QuarterView } from './QuarterView';
import { WeekView } from './WeekView';

const defaultProvider = createMarketDataProvider();

const VIEWS = { day: DayView, week: WeekView, quarter: QuarterView } satisfies Record<TimeWindow, typeof DayView>;

interface DashboardPageProps {
  provider?: MarketDataProvider;
}

export function DashboardPage({ provider = defaultProvider }: DashboardPageProps) {
  const [window, setWindow] = useState<TimeWindow>('day');
  const View = VIEWS[window];

  return (
    <main className="dashboard">
      <h1>IBM Market Dashboard</h1>
      <p className="subtitle">
        IBM versus {DEFAULT_COMPANIES.filter((c) => c.symbol !== PRIMARY_SYMBOL).map((c) => c.name).join(', ')}
      </p>
      <div role="tablist" aria-label="Time window" className="tabs">
        {TIME_WINDOWS.map((w) => (
          <button
            key={w.id}
            type="button"
            role="tab"
            aria-selected={window === w.id}
            onClick={() => setWindow(w.id)}
          >
            {w.label}
          </button>
        ))}
      </div>
      <View key={window} provider={provider} companies={DEFAULT_COMPANIES} focusSymbol={PRIMARY_SYMBOL} />
    </main>
  );
}
