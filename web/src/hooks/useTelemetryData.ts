import { useEffect, useRef } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';

export const useTelemetryData = (interval: number = 1000) => {
  const { addDataPoints, isPaused, setLoading, setError } = useTelemetryStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTime = useRef<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      if (isPaused) return;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/live');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.rows && Array.isArray(data.rows)) {
          const now = Date.now();
          const points = data.rows.map((row: any) => ({
            t: row.t,
            lat_ms: row.lat_ms,
            power_w: row.power_w,
            timestamp: now,
          }));

          // Only add new points (avoid duplicates)
          if (now - lastFetchTime.current > interval / 2) {
            addDataPoints(points);
            lastFetchTime.current = now;
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch telemetry data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling
    intervalRef.current = setInterval(fetchData, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [interval, isPaused, addDataPoints, setLoading, setError]);
};
