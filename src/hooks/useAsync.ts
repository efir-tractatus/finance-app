import { useEffect, useState } from 'react';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: T };

interface Settled<T> {
  token: object;
  state: Exclude<AsyncState<T>, { status: 'loading' }>;
}

const sameDeps = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((d, i) => Object.is(d, b[i]));

/** Runs an async loader whenever `deps` change; ignores stale results. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  // A new token is issued whenever the inputs change; results tied to an older token count as "loading".
  const inputs = [...deps, attempt];
  const [tracked, setTracked] = useState({ inputs, token: {} as object });
  let token = tracked.token;
  if (!sameDeps(tracked.inputs, inputs)) {
    token = {};
    setTracked({ inputs, token });
  }

  useEffect(() => {
    let cancelled = false;
    loader().then(
      (data) => !cancelled && setSettled({ token, state: { status: 'success', data } }),
      (err) =>
        !cancelled &&
        setSettled({ token, state: { status: 'error', error: err instanceof Error ? err : new Error(String(err)) } }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const state: AsyncState<T> = settled && settled.token === token ? settled.state : { status: 'loading' };
  return { ...state, retry: () => setAttempt((n) => n + 1) };
}
