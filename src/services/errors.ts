export class MarketDataError extends Error {
  constructor(
    message: string,
    readonly code: 'INVALID_SYMBOL' | 'NO_DATA' | 'UPSTREAM',
  ) {
    super(message);
    this.name = 'MarketDataError';
  }
}
