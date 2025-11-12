import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTelemetryStore } from '../store/telemetryStore';

const LatencyHistogram: React.FC = () => {
  const { data, darkMode } = useTelemetryStore();

  const histogramData = useMemo(() => {
    if (data.length === 0) return [];

    const latencies = data.map(d => d.lat_ms);
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const binCount = 10;
    const binSize = (max - min) / binCount;

    const bins = Array.from({ length: binCount }, (_, i) => ({
      range: `${(min + i * binSize).toFixed(1)}-${(min + (i + 1) * binSize).toFixed(1)}`,
      count: 0,
      rangeStart: min + i * binSize,
      rangeEnd: min + (i + 1) * binSize,
    }));

    latencies.forEach(latency => {
      const binIndex = Math.min(
        Math.floor((latency - min) / binSize),
        binCount - 1
      );
      bins[binIndex].count++;
    });

    return bins;
  }, [data]);

  const theme = {
    grid: darkMode ? '#333' : '#e5e7eb',
    text: darkMode ? '#9ca3af' : '#6b7280',
    barColors: [
      '#10b981', // green
      '#3b82f6', // blue
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#f59e0b', // orange
      '#ef4444', // red
    ],
  };

  const getBarColor = (index: number) => {
    return theme.barColors[index % theme.barColors.length];
  };

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold mb-2">Latency Distribution</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Performance consistency analysis
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={histogramData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />

          <XAxis
            dataKey="range"
            label={{
              value: 'Latency Range (ms)',
              position: 'insideBottom',
              offset: -5,
              style: { fill: theme.text },
            }}
            stroke={theme.text}
            style={{ fontSize: '11px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />

          <YAxis
            label={{
              value: 'Frequency',
              angle: -90,
              position: 'insideLeft',
              style: { fill: theme.text },
            }}
            stroke={theme.text}
            style={{ fontSize: '12px' }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: darkMode ? '#1a1a1a' : '#ffffff',
              border: `1px solid ${darkMode ? '#333' : '#e5e7eb'}`,
              borderRadius: '8px',
              color: darkMode ? '#fff' : '#000',
            }}
            formatter={(value: any) => [`${value} samples`, 'Count']}
          />

          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {histogramData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(LatencyHistogram);
