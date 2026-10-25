import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Reusable hook for making API requests with loading, error, and data states.
 */
export function useApi<T>(fetcher: (token?: string | null) => Promise<T>) {
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher(token);
      setData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'A network error occurred';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetcher, token]);

  return { data, loading, error, execute, setData };
}
