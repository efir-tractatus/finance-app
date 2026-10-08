import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChartCard } from './ChartCard';

describe('ChartCard', () => {
  it('shows the chart when there is nothing to report', () => {
    render(<ChartCard title="T">chart body</ChartCard>);
    expect(screen.getByRole('heading', { name: 'T' })).toBeInTheDocument();
    expect(screen.getByText('chart body')).toBeInTheDocument();
  });

  it('shows loading instead of the chart', () => {
    render(<ChartCard title="T" loading>chart body</ChartCard>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('chart body')).not.toBeInTheDocument();
  });

  it('shows an error with a working Retry button', async () => {
    const onRetry = vi.fn();
    render(<ChartCard title="T" error="Could not load" onRetry={onRetry}>chart body</ChartCard>);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows an empty state', () => {
    render(<ChartCard title="T" empty>chart body</ChartCard>);
    expect(screen.getByText('No data available.')).toBeInTheDocument();
    expect(screen.queryByText('chart body')).not.toBeInTheDocument();
  });

  it('prefers loading over error, and error over empty', () => {
    const { rerender } = render(<ChartCard title="T" loading error="x" empty>body</ChartCard>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<ChartCard title="T" error="x" empty>body</ChartCard>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
