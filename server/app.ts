import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { TimeWindow } from '../src/domain/types';
import { MarketDataError } from '../src/services/errors';
import type { MarketDataProvider } from '../src/services/marketData/MarketDataProvider';
import { MAX_SYMBOLS_PER_REQUEST, assertValidSymbol } from '../src/services/marketData/symbols';

const WINDOWS: TimeWindow[] = ['day', 'week', 'quarter'];
const STATUS: Record<MarketDataError['code'], number> = { INVALID_SYMBOL: 400, NO_DATA: 404, UPSTREAM: 502 };

const first = (v: unknown): string => (typeof v === 'string' ? v : '');

export function createApp(provider: MarketDataProvider): Express {
  const app = express();

  app.get('/api/quotes', async (req, res, next) => {
    try {
      const symbols = first(req.query.symbols).split(',').filter(Boolean);
      if (symbols.length === 0 || symbols.length > MAX_SYMBOLS_PER_REQUEST) {
        throw new MarketDataError(`Provide 1-${MAX_SYMBOLS_PER_REQUEST} symbols`, 'INVALID_SYMBOL');
      }
      const quotes = await provider.getQuotes(symbols.map(assertValidSymbol));
      res.json({ quotes });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/history', async (req, res, next) => {
    try {
      const symbol = assertValidSymbol(first(req.query.symbol));
      const window = first(req.query.window) as TimeWindow;
      if (!WINDOWS.includes(window)) {
        throw new MarketDataError(`Invalid window; use one of ${WINDOWS.join(', ')}`, 'INVALID_SYMBOL');
      }
      res.json(await provider.getHistory(symbol, window));
    } catch (err) {
      next(err);
    }
  });

  // Never forward raw upstream errors; clients only see our typed error shape.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next;
    if (err instanceof MarketDataError) {
      res.status(STATUS[err.code]).json({ error: { code: err.code, message: err.message } });
      return;
    }
    console.error(err);
    res.status(500).json({ error: { code: 'UPSTREAM', message: 'Unexpected server error' } });
  });

  return app;
}
