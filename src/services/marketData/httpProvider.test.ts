import { describe, expect, it, vi } from 'vitest';
import { MarketDataError } from '../errors';
import { createHttpProvider } from './httpProvider';

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

describe('httpProvider', () => {
  it('requests normalized, comma-joined symbols and unwraps quotes', async () => {
    const fetchImpl = vi.fn(() => json({ quotes: [{ symbol: 'IBM' }] }));
    const provider = createHttpProvider('/api', fetchImpl as unknown as typeof fetch);
    const quotes = await provider.getQuotes(['ibm', 'msft']);
    expect(fetchImpl).toHaveBeenCalledWith('/api/quotes?symbols=IBM%2CMSFT');
    expect(quotes).toEqual([{ symbol: 'IBM' }]);
  });

  it('requests history with symbol and window', async () => {
    const series = { symbol: 'IBM', window: 'week', points: [] };
    const fetchImpl = vi.fn(() => json(series));
    const provider = createHttpProvider('/api', fetchImpl as unknown as typeof fetch);
    expect(await provider.getHistory('ibm', 'week')).toEqual(series);
    expect(fetchImpl).toHaveBeenCalledWith('/api/history?symbol=IBM&window=week');
  });

  it('rejects invalid symbols without calling the network', async () => {
    const fetchImpl = vi.fn();
    const provider = createHttpProvider('/api', fetchImpl as unknown as typeof fetch);
    await expect(provider.getHistory('bad symbol', 'day')).rejects.toMatchObject({ code: 'INVALID_SYMBOL' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('maps API error bodies to MarketDataError', async () => {
    const fetchImpl = vi.fn(() => json({ error: { code: 'NO_DATA', message: 'No data found for ZZZZ' } }, 404));
    const provider = createHttpProvider('/api', fetchImpl as unknown as typeof fetch);
    const err = await provider.getHistory('ZZZZ', 'day').catch((e) => e);
    expect(err).toBeInstanceOf(MarketDataError);
    expect(err).toMatchObject({ code: 'NO_DATA', message: 'No data found for ZZZZ' });
  });

  it('maps network failures and non-JSON errors to UPSTREAM', async () => {
    const down = createHttpProvider('/api', (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch);
    await expect(down.getQuotes(['IBM'])).rejects.toMatchObject({ code: 'UPSTREAM' });

    const html = createHttpProvider('/api', (() =>
      Promise.resolve(new Response('<html>', { status: 502 }))) as unknown as typeof fetch);
    await expect(html.getQuotes(['IBM'])).rejects.toMatchObject({ code: 'UPSTREAM' });
  });
});
