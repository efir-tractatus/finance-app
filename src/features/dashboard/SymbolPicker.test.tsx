import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SymbolPicker } from './SymbolPicker';

const SHOWN = ['IBM', 'MSFT', 'ORCL', 'SAP', 'CRM'];

function setup() {
  const onSubmit = vi.fn();
  render(<SymbolPicker shownSymbols={SHOWN} onSubmit={onSubmit} />);
  const input = screen.getByLabelText('Add a company');
  const submit = () => userEvent.click(screen.getByRole('button', { name: 'Show graph' }));
  return { onSubmit, input, submit };
}

describe('SymbolPicker', () => {
  it('trims and upper-cases a valid ticker before submitting it', async () => {
    const { onSubmit, input, submit } = setup();
    await userEvent.type(input, '  aapl ');
    await submit();
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('AAPL');
    expect(input).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('submits on Enter', async () => {
    const { onSubmit, input } = setup();
    await userEvent.type(input, 'googl{Enter}');
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('GOOGL');
  });

  it('asks for input when empty or blank, without submitting', async () => {
    const { onSubmit, input, submit } = setup();
    await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a ticker symbol');
    await userEvent.type(input, '   ');
    await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a ticker symbol');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each(['IBM;DROP', 'a b', 'TOOLONGSYMBOL', '-X', '<script>'])('rejects malformed "%s"', async (bad) => {
    const { onSubmit, input, submit } = setup();
    await userEvent.type(input, bad);
    await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('not a valid ticker');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveValue(bad); // keep the text so the user can fix it
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a company that is already on the dashboard, case-insensitively', async () => {
    const { onSubmit, input, submit } = setup();
    await userEvent.type(input, 'ibm');
    await submit();
    expect(screen.getByRole('alert')).toHaveTextContent('IBM is already on the dashboard');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears the error once a valid ticker is submitted', async () => {
    const { onSubmit, input, submit } = setup();
    await userEvent.type(input, 'bad one');
    await submit();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, 'AAPL');
    await submit();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith('AAPL');
  });
});
