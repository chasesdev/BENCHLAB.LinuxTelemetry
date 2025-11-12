import { create } from 'zustand';

export interface TelemetryDataPoint {
  t: number;
  lat_ms: number;
  power_w: number | null;
  timestamp: number; // Unix timestamp
}

export interface TelemetryStats {
  latency: {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
    current: number;
  };
  power: {
    min: number;
    max: number;
    avg: number;
    current: number;
  };
}

interface TelemetryState {
  // Data
  data: TelemetryDataPoint[];
  stats: TelemetryStats | null;

  // UI State
  isPaused: boolean;
  timeWindow: 30 | 60 | 300 | 900; // seconds
  darkMode: boolean;
  isLoading: boolean;
  error: string | null;

  // Zoom state
  zoomDomain: { start: number; end: number } | null;

  // Actions
  addDataPoint: (point: TelemetryDataPoint) => void;
  addDataPoints: (points: TelemetryDataPoint[]) => void;
  setTimeWindow: (window: 30 | 60 | 300 | 900) => void;
  togglePause: () => void;
  toggleDarkMode: () => void;
  setZoomDomain: (domain: { start: number; end: number } | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  calculateStats: () => void;
  clearData: () => void;
}

const calculatePercentile = (sorted: number[], percentile: number): number => {
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
};

const computeStats = (data: TelemetryDataPoint[]): TelemetryStats | null => {
  if (data.length === 0) return null;

  const latencies = data.map(d => d.lat_ms).filter(v => v !== null);
  const powers = data.map(d => d.power_w).filter(v => v !== null) as number[];

  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const sortedPowers = [...powers].sort((a, b) => a - b);

  return {
    latency: {
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p95: calculatePercentile(sortedLatencies, 95),
      p99: calculatePercentile(sortedLatencies, 99),
      current: latencies[latencies.length - 1] || 0,
    },
    power: {
      min: powers.length > 0 ? Math.min(...powers) : 0,
      max: powers.length > 0 ? Math.max(...powers) : 0,
      avg: powers.length > 0 ? powers.reduce((a, b) => a + b, 0) / powers.length : 0,
      current: powers[powers.length - 1] || 0,
    },
  };
};

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  // Initial state
  data: [],
  stats: null,
  isPaused: false,
  timeWindow: 60,
  darkMode: typeof window !== 'undefined' ?
    localStorage.getItem('darkMode') === 'true' :
    false,
  isLoading: false,
  error: null,
  zoomDomain: null,

  // Actions
  addDataPoint: (point) => {
    if (get().isPaused) return;

    set(state => {
      const now = Date.now() / 1000;
      const cutoff = now - state.timeWindow;
      const newData = [...state.data, point].filter(d => d.t >= cutoff);

      return {
        data: newData,
        stats: computeStats(newData),
      };
    });
  },

  addDataPoints: (points) => {
    if (get().isPaused) return;

    set(state => {
      const now = Date.now() / 1000;
      const cutoff = now - state.timeWindow;
      const newData = [...state.data, ...points].filter(d => d.t >= cutoff);

      return {
        data: newData,
        stats: computeStats(newData),
      };
    });
  },

  setTimeWindow: (window) => {
    set({ timeWindow: window });
    get().calculateStats();
  },

  togglePause: () => set(state => ({ isPaused: !state.isPaused })),

  toggleDarkMode: () => {
    const newMode = !get().darkMode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', String(newMode));
      if (newMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ darkMode: newMode });
  },

  setZoomDomain: (domain) => set({ zoomDomain: domain }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  calculateStats: () => {
    const data = get().data;
    set({ stats: computeStats(data) });
  },

  clearData: () => set({ data: [], stats: null }),
}));
