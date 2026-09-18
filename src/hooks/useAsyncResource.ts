import { useCallback, useEffect, useState } from 'react';

export function useAsyncResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    setFailure(null);
    try {
      setData(await loader());
    } catch (caught) {
      setError(true);
      setFailure(caught);
    } finally {
      setLoading(false);
    }
  }, [loader]);
  useEffect(() => {
    let active = true;
    void loader().then(
      (value) => {
        if (!active) return;
        setData(value);
        setFailure(null);
        setLoading(false);
      },
      (caught) => {
        if (!active) return;
        setError(true);
        setFailure(caught);
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [loader]);
  return { data, loading, error, failure, refresh };
}
