import { useCallback, useEffect, useState } from 'react';

export function useAsyncResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setData(await loader());
    } catch {
      setError(true);
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
        setLoading(false);
      },
      () => {
        if (!active) return;
        setError(true);
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [loader]);
  return { data, loading, error, refresh };
}
