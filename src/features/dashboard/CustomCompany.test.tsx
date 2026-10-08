import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_COMPANIES, PRIMARY_SYMBOL } from '../../config/companies';
import { MarketDataError } from '../../services/errors';
import type { MarketDataProvider } from '../../services/marketData';
import { createMockProvider } from '../../services/marketData/mockProvider';
import { CustomCompanyPanel } from './CustomCompanyPanel';
import { DashboardPage } from './DashboardPage';

// jsdom has no layout, so render the chart container as a plain box.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 600, height: 300 }}>{children}</div>
    ),
  };
});

const ibm = DEFAULT_COMPANIES.find((c) => c.symbol === PRIMARY_SYMBOL)!;

function panel(provider: MarketDataProvider, symbol = 'AAPL') {
  return render(
    <CustomCompanyPanel provider={provider} symbol={symbol} window="week" reference={ibm} onClear={vi.fn()} />,
  );
}

describe('CustomCompanyPanel', () => {
  it('shows a loading state, then the graph for a valid ticker', async () => {
    panel(createMockProvider());
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await screen.findByLabelText('AAPL performance (start = 100)')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AAPL versus IBM' })).toBeInTheDocument();
  });

  it('explains "no data" for an unknown ticker and offers Retry', async () => {
    panel(createMockProvider(), 'ZZZZ');
    expect(await screen.findByRole('alert')).toHaveTextContent('No data found for ZZZZ');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('distinguishes a service outage from a bad ticker', async () => {
    const down: MarketDataProvider = {
      getQuotes: () => Promise.reject(new MarketDataError('x', 'UPSTREAM')),
      getHistory: () => Promise.reject(new MarketDataError('x', 'UPSTREAM')),
    };
    panel(down);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('market data service is unavailable');
    expect(alert).not.toHaveTextContent('No data found');
  });

  it('still shows the selected company when the reference (IBM) fails', async () => {
    const base = createMockProvider();
    const noIbm: MarketDataProvider = {
      getQuotes: base.getQuotes,
      getHistory: (symbol, window) =>
        symbol === 'IBM' ? Promise.reject(new MarketDataError('x', 'UPSTREAM')) : base.getHistory(symbol, window),
    };
    panel(noIbm);
    expect(await screen.findByLabelText('AAPL performance (start = 100)')).toBeInTheDocument();
    expect(await screen.findByText(/IBM could not be loaded, so only AAPL is shown/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('Retry reloads and recovers after a transient failure', async () => {
    const base = createMockProvider();
    let calls = 0;
    const flaky: MarketDataProvider = {
      getQuotes: base.getQuotes,
      getHistory: (symbol, window) =>
        symbol === 'AAPL' && ++calls === 1
          ? Promise.reject(new MarketDataError('x', 'UPSTREAM'))
          : base.getHistory(symbol, window),
    };
    panel(flaky);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByLabelText('AAPL performance (start = 100)')).toBeInTheDocument();
  });
});

describe('DashboardPage with a user-selected company', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'));
  afterEach(() => window.history.replaceState(null, '', '/'));

  async function addSymbol(symbol: string) {
    await userEvent.type(screen.getByLabelText('Add a company'), symbol);
    await userEvent.click(screen.getByRole('button', { name: 'Show graph' }));
  }

  it('shows no custom graph until a ticker is submitted', async () => {
    render(<DashboardPage provider={createMockProvider()} />);
    await screen.findByLabelText('IBM summary');
    expect(screen.queryByLabelText('AAPL graph')).not.toBeInTheDocument();
  });

  it('adds a graph for the ticker and keeps the original IBM dashboards intact', async () => {
    render(<DashboardPage provider={createMockProvider()} />);
    await addSymbol('aapl');

    expect(await screen.findByLabelText('AAPL performance (start = 100)')).toBeInTheDocument();
    // Original day view is still there, unchanged: one card per default company and no AAPL card.
    for (const c of DEFAULT_COMPANIES) expect(await screen.findByLabelText(`${c.name} summary`)).toBeInTheDocument();
    expect(screen.queryByLabelText('AAPL summary')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Intraday performance (start of session = 100)')).toBeInTheDocument();
  });

  it('does not change the IBM comparison on the other tabs: still "of 5" and five ranking rows', async () => {
    render(<DashboardPage provider={createMockProvider()} />);
    await addSymbol('AAPL');
    await screen.findByLabelText('AAPL performance (start = 100)');

    await userEvent.click(screen.getByRole('tab', { name: 'Last 7 days' }));
    expect(await screen.findByLabelText('IBM rank')).toHaveTextContent(/#\d of 5\b/);

    await userEvent.click(screen.getByRole('tab', { name: 'Last quarter' }));
    const table = await screen.findByRole('table');
    expect(table.querySelectorAll('tbody tr')).toHaveLength(DEFAULT_COMPANIES.length);
    expect(table).not.toHaveTextContent('AAPL');
  });

  it('keeps the selected company when switching tabs', async () => {
    render(<DashboardPage provider={createMockProvider()} />);
    await addSymbol('GOOGL');
    await screen.findByLabelText('GOOGL performance (start = 100)');

    await userEvent.click(screen.getByRole('tab', { name: 'Last quarter' }));
    expect(await screen.findByLabelText('GOOGL performance (start = 100)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'GOOGL versus IBM' })).toBeInTheDocument();
  });

  it('shows an error for an unavailable ticker without disturbing the original views', async () => {
    render(<DashboardPage provider={createMockProvider()} />);
    await addSymbol('ZZZZ');

    const panelEl = await screen.findByLabelText('ZZZZ graph');
    expect(panelEl).toHaveTextContent('No data found for ZZZZ');
    expect(await screen.findByLabelText('IBM summary')).toBeInTheDocument(); // original view unaffected
  });

  it('rejects a malformed ticker with no graph and no network call', async () => {
    const provider = createMockProvider();
    const history = vi.spyOn(provider, 'getHistory');
    render(<DashboardPage provider={provider} />);
    await screen.findByLabelText('IBM summary');
    history.mockClear();

    await addSymbol('IBM;DROP');
    expect(screen.getByRole('alert')).toHaveTextContent('not a valid ticker');
    expect(screen.queryByLabelText('IBM;DROP graph')).not.toBeInTheDocument();
    expect(history).not.toHaveBeenCalled();
  });

  it('rejects a company that is already shown, with no duplicate graph', async () => {
    render(<DashboardPage provider={createMockProvider()} />);
    await addSymbol('msft');
    expect(screen.getByRole('alert')).toHaveTextContent('MSFT is already on the dashboard');
    expect(screen.queryByLabelText('MSFT graph')).not.toBeInTheDocument();
  });

  it('removes the graph and URL parameter with the Remove button', async () => {
    render(<DashboardPage provider={createMockProvider()} />);
    await addSymbol('AAPL');
    await screen.findByLabelText('AAPL graph');
    expect(window.location.search).toBe('?symbol=AAPL');

    await userEvent.click(screen.getByRole('button', { name: 'Remove AAPL' }));
    expect(screen.queryByLabelText('AAPL graph')).not.toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('replaces the graph when another ticker is submitted', async () => {
    render(<DashboardPage provider={createMockProvider()} />);
    await addSymbol('AAPL');
    await screen.findByLabelText('AAPL graph');
    await addSymbol('GOOGL');
    expect(await screen.findByLabelText('GOOGL graph')).toBeInTheDocument();
    expect(screen.queryByLabelText('AAPL graph')).not.toBeInTheDocument();
  });

  it('reopens the graph from a shared ?symbol= link, ignoring invalid values', async () => {
    window.history.replaceState(null, '', '/?symbol=googl');
    const { unmount } = render(<DashboardPage provider={createMockProvider()} />);
    expect(await screen.findByLabelText('GOOGL graph')).toBeInTheDocument();
    unmount();

    window.history.replaceState(null, '', '/?symbol=IBM%3BDROP');
    render(<DashboardPage provider={createMockProvider()} />);
    await screen.findByLabelText('IBM summary');
    expect(document.querySelector('.custom-company')).toBeNull();
  });
});
