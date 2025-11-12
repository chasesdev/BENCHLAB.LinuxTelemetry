import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { useTelemetryStore } from '../store/telemetryStore';

const RAIL_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6'
];

export const PowerRailsChart: React.FC = React.memo(() => {
  const { dataPoints, darkMode } = useTelemetryStore();

  // Transform data for stacked area chart
  const chartData = dataPoints
    .filter(point => point.powerRails && point.powerRails.length > 0)
    .slice(-200)
    .map(point => {
      const entry: any = {
        timestamp: point.timestamp,
        time: format(new Date(point.timestamp), 'HH:mm:ss')
      };

      point.powerRails?.forEach((rail, idx) => {
        entry[`rail${idx}`] = rail.power;
      });

      return entry;
    });

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No power rail data available
      </div>
    );
  }

  const numRails = dataPoints[dataPoints.length - 1]?.powerRails?.length || 0;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={chartData}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={darkMode ? '#374151' : '#e5e7eb'}
        />
        <XAxis
          dataKey="time"
          stroke={darkMode ? '#9ca3af' : '#6b7280'}
          tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }}
        />
        <YAxis
          label={{
            value: 'Power (W)',
            angle: -90,
            position: 'insideLeft',
            fill: darkMode ? '#9ca3af' : '#6b7280'
          }}
          stroke={darkMode ? '#9ca3af' : '#6b7280'}
          tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: darkMode ? '#1f2937' : '#ffffff',
            border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
            borderRadius: '0.5rem',
            color: darkMode ? '#f3f4f6' : '#111827'
          }}
          labelFormatter={(value) => `Time: ${value}`}
          formatter={(value: number) => `${value.toFixed(2)} W`}
        />
        <Legend
          wrapperStyle={{ color: darkMode ? '#9ca3af' : '#6b7280' }}
        />

        {Array.from({ length: numRails }).map((_, idx) => (
          <Area
            key={`rail${idx}`}
            type="monotone"
            dataKey={`rail${idx}`}
            stackId="1"
            stroke={RAIL_COLORS[idx % RAIL_COLORS.length]}
            fill={RAIL_COLORS[idx % RAIL_COLORS.length]}
            fillOpacity={0.6}
            name={`Rail ${idx}`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
});
