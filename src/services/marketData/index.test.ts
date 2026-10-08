import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMarketDataProvider } from './index';

describe('createMarketDataProvider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('"mock" serves data offline without touching the network', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const quotes = await createMarketDataProvider('mock').getQuotes(['IBM']);
    expect(quotes[0].symbol).toBe('IBM');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('"live" calls the /api proxy', async () => {
    const fetchSpy = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ quotes: [] }), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchSpy);
    await createMarketDataProvider('live').getQuotes(['IBM']);
    expect(fetchSpy).toHaveBeenCalledWith('/api/quotes?symbols=IBM', undefined);
  });

  it('treats any other value as live, so a typo never silently serves fake data', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ quotes: [] }))));
    vi.stubGlobal('fetch', fetchSpy);
    await createMarketDataProvider('mokc').getQuotes(['IBM']);
    expect(fetchSpy).toHaveBeenCalled();
  });
});
