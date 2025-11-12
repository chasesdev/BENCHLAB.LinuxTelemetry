import { useEffect, useState } from 'react';
import type { ArchitectureData } from '../pages/api/architecture';

export function useArchitectureData(intervalMs: number = 2000) {
  const [data, setData] = useState<ArchitectureData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const response = await fetch('/api/architecture');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();

        if (isMounted) {
          setData(jsonData);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval
    const interval = setInterval(fetchData, intervalMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [intervalMs]);

  return { data, isLoading, error };
}
