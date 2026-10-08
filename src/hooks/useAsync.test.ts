import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAsync } from './useAsync';

describe('useAsync', () => {
  it('goes from loading to success', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.resolve('ok'), []));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current).toMatchObject({ status: 'success', data: 'ok' }));
  });

  it('reports errors, wrapping non-Error rejections', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.reject('plain string'), []));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.status === 'error' && result.current.error.message).toBe('plain string');
  });

  it('ignores a stale response after the inputs change', async () => {
    const resolvers: Record<string, (v: string) => void> = {};
    const loaderFor = (key: string) => () => new Promise<string>((resolve) => (resolvers[key] = resolve));

    const { result, rerender } = renderHook(({ key }) => useAsync(loaderFor(key), [key]), {
      initialProps: { key: 'a' },
    });
    rerender({ key: 'b' });

    await act(async () => resolvers.a('stale'));
    expect(result.current.status).toBe('loading'); // the old answer must not be shown for the new inputs

    await act(async () => resolvers.b('fresh'));
    expect(result.current).toMatchObject({ status: 'success', data: 'fresh' });
  });

  it('retry reloads after a failure', async () => {
    let calls = 0;
    const { result } = renderHook(() =>
      useAsync(() => (++calls === 1 ? Promise.reject(new Error('first try fails')) : Promise.resolve('recovered')), []),
    );
    await waitFor(() => expect(result.current.status).toBe('error'));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current).toMatchObject({ status: 'success', data: 'recovered' }));
    expect(calls).toBe(2);
  });
});
