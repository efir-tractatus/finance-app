import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_COMPANIES } from '../../config/companies';
import { MarketDataError } from '../../services/errors';
import type { MarketDataProvider } from '../../services/marketData';
import { createMockProvider } from '../../services/marketData/mockProvider';
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

describe('DashboardPage', () => {
  it('current day view shows headline stats, a card per company and the intraday chart', async () => {
    render(<DashboardPage provider={createMockProvider()} />);

    for (const c of DEFAULT_COMPANIES) {
      expect(await screen.findByLabelText(`${c.name} summary`)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('IBM price')).toBeInTheDocument();
    expect(screen.getByLabelText('Top mover today')).toBeInTheDocument();
    expect(await screen.findByLabelText('Intraday performance (start of session = 100)')).toBeInTheDocument();
  });

  it('7-day view shows IBM versus peers, the trend chart and a change bar chart', async () => {
    render(<DashboardPage provider={createMockProvider()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Last 7 days' }));

    expect(screen.getByRole('tab', { name: 'Last 7 days' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByLabelText('IBM summary')).not.toBeInTheDocument();
    expect(await screen.findByLabelText('7-day trend comparison (start = 100)')).toBeInTheDocument();
    expect(await screen.findByLabelText('7-day change by company')).toBeInTheDocument();
    expect(await screen.findByLabelText('IBM 7-day change')).toBeInTheDocument();
    expect(screen.getByLabelText('Versus peer average')).toBeInTheDocument();
    expect(screen.getByLabelText('IBM rank')).toHaveTextContent(/#\d of 5/);
  });

  it('quarter view shows the trend chart and a ranking table covering every company', async () => {
    render(<DashboardPage provider={createMockProvider()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Last quarter' }));

    expect(await screen.findByLabelText('Quarter trend comparison (start = 100)')).toBeInTheDocument();
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1); // skip header
    expect(rows).toHaveLength(DEFAULT_COMPANIES.length);
    expect(screen.getByLabelText('IBM quarter change')).toBeInTheDocument();
  });

  it('one failing company degrades gracefully instead of blanking the view', async () => {
    const base = createMockProvider();
    const partial: MarketDataProvider = {
      getQuotes: base.getQuotes,
      getHistory: (symbol, window) =>
        symbol === 'SAP' ? Promise.reject(new MarketDataError('no data', 'NO_DATA')) : base.getHistory(symbol, window),
    };
    render(<DashboardPage provider={partial} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Last quarter' }));

    expect(await screen.findByText(/No quarter data for: SAP/)).toBeInTheDocument();
    expect(within(await screen.findByRole('table')).getAllByRole('row')).toHaveLength(1 + DEFAULT_COMPANIES.length - 1);
  });

  it('shows error states with retry when the provider fails entirely', async () => {
    const failing: MarketDataProvider = {
      getQuotes: () => Promise.reject(new MarketDataError('boom', 'UPSTREAM')),
      getHistory: () => Promise.reject(new MarketDataError('boom', 'UPSTREAM')),
    };
    render(<DashboardPage provider={failing} />);
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0);
    expect((await screen.findAllByRole('button', { name: 'Retry' })).length).toBeGreaterThan(0);
  });
});
