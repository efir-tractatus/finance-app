import { MarketDataError } from '../errors';

export const MAX_SYMBOLS_PER_REQUEST = 10;

// Letters/digits plus the punctuation Yahoo uses in tickers (BRK-B, BF.B, ^GSPC, EURUSD=X).
const SYMBOL_PATTERN = /^[A-Z0-9^][A-Z0-9.^=-]{0,9}$/;

export function normalizeSymbol(input: string): string {
  return input.trim().toUpperCase();
}

export function isValidSymbol(input: string): boolean {
  return SYMBOL_PATTERN.test(normalizeSymbol(input));
}

/** Returns the normalized symbol, or throws INVALID_SYMBOL. Shared by client and server. */
export function assertValidSymbol(input: string): string {
  const symbol = normalizeSymbol(input);
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new MarketDataError(`Invalid symbol: "${input}"`, 'INVALID_SYMBOL');
  }
  return symbol;
}
