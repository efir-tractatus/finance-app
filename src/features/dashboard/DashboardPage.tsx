import { useState } from 'react';
import { DEFAULT_COMPANIES, PRIMARY_SYMBOL } from '../../config/companies';
import { TIME_WINDOWS } from '../../config/timeWindows';
import type { TimeWindow } from '../../domain/types';
import { createMarketDataProvider, type MarketDataProvider } from '../../services/marketData';
import { isValidSymbol, normalizeSymbol } from '../../services/marketData/symbols';
import { CustomCompanyPanel } from './CustomCompanyPanel';
import { DayView } from './DayView';
import { QuarterView } from './QuarterView';
import { SymbolPicker } from './SymbolPicker';
import { WeekView } from './WeekView';

const defaultProvider = createMarketDataProvider();

const VIEWS = { day: DayView, week: WeekView, quarter: QuarterView } satisfies Record<TimeWindow, typeof DayView>;

const SYMBOL_PARAM = 'symbol';

/** Reads ?symbol= so a shared link reopens the same graph. Ignores anything invalid. */
function initialSymbol(): string | null {
  const raw = new URLSearchParams(globalThis.location?.search ?? '').get(SYMBOL_PARAM);
  return raw && isValidSymbol(raw) ? normalizeSymbol(raw) : null;
}

function writeSymbolToUrl(symbol: string | null) {
  const url = new URL(globalThis.location.href);
  if (symbol) url.searchParams.set(SYMBOL_PARAM, symbol);
  else url.searchParams.delete(SYMBOL_PARAM);
  globalThis.history.replaceState(null, '', url);
}

interface DashboardPageProps {
  provider?: MarketDataProvider;
}

export function DashboardPage({ provider = defaultProvider }: DashboardPageProps) {
  const [window, setWindow] = useState<TimeWindow>('day');
  // Lives here, not in a view: the active view remounts on every tab change and would lose it.
  // It is never added to DEFAULT_COMPANIES, so the IBM comparison (ranks, peer average) is unaffected.
  const [customSymbol, setCustomSymbol] = useState<string | null>(initialSymbol);
  const View = VIEWS[window];
  const reference = DEFAULT_COMPANIES.find((c) => c.symbol === PRIMARY_SYMBOL) ?? DEFAULT_COMPANIES[0];

  function selectSymbol(symbol: string | null) {
    setCustomSymbol(symbol);
    writeSymbolToUrl(symbol);
  }

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

      <SymbolPicker shownSymbols={DEFAULT_COMPANIES.map((c) => c.symbol)} onSubmit={selectSymbol} />
      {customSymbol && (
        <CustomCompanyPanel
          key={customSymbol}
          provider={provider}
          symbol={customSymbol}
          window={window}
          reference={reference}
          onClear={() => selectSymbol(null)}
        />
      )}
    </main>
  );
}
