import { useEffect, useRef } from 'react';
import { useTelemetryStore } from '../store/telemetryStore';
import { useWebSocket } from './useWebSocket';

export const useTelemetryData = () => {
  const {
    addDataPoints,
    isPaused,
    setLoading,
    setError,
    pollingInterval,
    connectionMode,
    connectionStatus,
  } = useTelemetryStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTime = useRef<number>(0);

  // Determine if we should use WebSocket
  const shouldUseWebSocket =
    connectionMode === 'websocket' ||
    (connectionMode === 'auto' && (connectionStatus === 'connected' || connectionStatus === 'connecting'));

  // Use WebSocket when appropriate
  useWebSocket(shouldUseWebSocket);

  useEffect(() => {
    // Only use HTTP polling when:
    // 1. Connection mode is explicitly 'polling', OR
    // 2. In 'auto' mode and not connected via WebSocket
    const shouldPoll =
      connectionMode === 'polling' ||
      (connectionMode === 'auto' && connectionStatus !== 'connected');

    if (!shouldPoll) {
      // Clear any existing polling interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

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
          if (now - lastFetchTime.current > pollingInterval / 2) {
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
    intervalRef.current = setInterval(fetchData, pollingInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pollingInterval, isPaused, addDataPoints, setLoading, setError, connectionMode, connectionStatus]);
};
