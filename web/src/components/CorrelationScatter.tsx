import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { useTelemetryStore } from '../store/telemetryStore';

const CorrelationScatter: React.FC = () => {
  const { data, darkMode } = useTelemetryStore();

  const scatterData = useMemo(() => {
    return data
      .filter(point => point.power_w !== null)
      .map(point => ({
        latency: point.lat_ms,
        power: point.power_w,
        z: 1, // Size of dots
      }));
  }, [data]);

  const theme = {
    grid: darkMode ? '#333' : '#e5e7eb',
    text: darkMode ? '#9ca3af' : '#6b7280',
    scatterColor: '#8b5cf6',
  };

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold mb-2">Latency vs Power Correlation</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Analyze power efficiency and performance patterns
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />

          <XAxis
            type="number"
            dataKey="latency"
            name="Latency"
            unit=" ms"
            label={{
              value: 'Latency (ms)',
              position: 'insideBottom',
              offset: -5,
              style: { fill: theme.text },
            }}
            stroke={theme.text}
            style={{ fontSize: '12px' }}
          />

          <YAxis
            type="number"
            dataKey="power"
            name="Power"
            unit=" W"
            label={{
              value: 'Power (W)',
              angle: -90,
              position: 'insideLeft',
              style: { fill: theme.text },
            }}
            stroke={theme.text}
            style={{ fontSize: '12px' }}
          />

          <ZAxis type="number" dataKey="z" range={[50, 50]} />

          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              backgroundColor: darkMode ? '#1a1a1a' : '#ffffff',
              border: `1px solid ${darkMode ? '#333' : '#e5e7eb'}`,
              borderRadius: '8px',
              color: darkMode ? '#fff' : '#000',
            }}
            formatter={(value: any, name: string) => {
              if (name === 'Latency') return [`${value.toFixed(2)} ms`, 'Latency'];
              if (name === 'Power') return [`${value.toFixed(1)} W`, 'Power'];
              return [value, name];
            }}
          />

          <Scatter
            name="Data Points"
            data={scatterData}
            fill={theme.scatterColor}
            fillOpacity={0.6}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(CorrelationScatter);
