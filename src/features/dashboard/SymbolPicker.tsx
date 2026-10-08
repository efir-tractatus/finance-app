import { useState, type FormEvent } from 'react';
import { MarketDataError } from '../../services/errors';
import { assertValidSymbol } from '../../services/marketData/symbols';

interface SymbolPickerProps {
  /** Symbols already on the dashboard; entering one of these is rejected with a friendly message. */
  shownSymbols: string[];
  /** Called with a normalized, valid, not-yet-shown symbol. */
  onSubmit: (symbol: string) => void;
}

/** Text input for a ticker. Validates locally so bad input never causes a network call. */
export function SymbolPicker({ shownSymbols, onSubmit }: SymbolPickerProps) {
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState<string>();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (draft.trim() === '') {
      setMessage('Enter a ticker symbol, for example AAPL.');
      return;
    }
    let symbol: string;
    try {
      symbol = assertValidSymbol(draft);
    } catch (err) {
      setMessage(
        err instanceof MarketDataError
          ? 'That is not a valid ticker. Use letters and digits, up to 10 characters (for example AAPL or BRK-B).'
          : 'Invalid ticker.',
      );
      return;
    }
    if (shownSymbols.includes(symbol)) {
      setMessage(`${symbol} is already on the dashboard. Try another company.`);
      return;
    }
    setMessage(undefined);
    setDraft('');
    onSubmit(symbol);
  }

  return (
    <form className="picker" onSubmit={handleSubmit} noValidate>
      <label htmlFor="company-symbol">Add a company</label>
      <div className="picker__row">
        <input
          id="company-symbol"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ticker, e.g. AAPL"
          autoComplete="off"
          spellCheck={false}
          aria-describedby={message ? 'company-symbol-message' : undefined}
          aria-invalid={message ? true : undefined}
        />
        <button type="submit">Show graph</button>
      </div>
      {message && (
        <p id="company-symbol-message" role="alert" className="picker__message">
          {message}
        </p>
      )}
    </form>
  );
}
