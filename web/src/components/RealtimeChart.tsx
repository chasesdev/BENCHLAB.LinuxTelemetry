import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { format } from 'date-fns';
import { useTelemetryStore } from '../store/telemetryStore';

interface RealtimeChartProps {
  height?: number;
}

const RealtimeChart: React.FC<RealtimeChartProps> = ({ height = 400 }) => {
  const { data, darkMode, zoomDomain } = useTelemetryStore();

  const chartData = useMemo(() => {
    return data.map(point => ({
      time: point.t,
      latency: point.lat_ms,
      power: point.power_w,
    }));
  }, [data]);

  const domain = zoomDomain || {
    start: data.length > 0 ? data[0].t : 0,
    end: data.length > 0 ? data[data.length - 1].t : 60,
  };

  const theme = {
    grid: darkMode ? '#333' : '#e5e7eb',
    text: darkMode ? '#9ca3af' : '#6b7280',
    latencyColor: '#3b82f6',
    powerColor: '#ec4899',
  };

  return (
    <div className="card p-4">
      <h3 className="text-lg font-semibold mb-4">Real-Time Latency & Power</h3>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={theme.latencyColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={theme.latencyColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={theme.powerColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={theme.powerColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />

          <XAxis
            dataKey="time"
            type="number"
            domain={[domain.start, domain.end]}
            tickFormatter={(value) => `${value.toFixed(1)}s`}
            stroke={theme.text}
            style={{ fontSize: '12px' }}
          />

          <YAxis
            yAxisId="left"
            label={{
              value: 'Latency (ms)',
              angle: -90,
              position: 'insideLeft',
              style: { fill: theme.text },
            }}
            stroke={theme.text}
            style={{ fontSize: '12px' }}
          />

          <YAxis
            yAxisId="right"
            orientation="right"
            label={{
              value: 'Power (W)',
              angle: 90,
              position: 'insideRight',
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
            labelFormatter={(value) => `Time: ${Number(value).toFixed(2)}s`}
            formatter={(value: any, name: string) => {
              if (name === 'latency') return [`${value.toFixed(2)} ms`, 'Latency'];
              if (name === 'power') return [`${value.toFixed(1)} W`, 'Power'];
              return [value, name];
            }}
          />

          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="line"
          />

          <Area
            yAxisId="left"
            type="monotone"
            dataKey="latency"
            fill="url(#latencyGradient)"
            stroke={theme.latencyColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="power"
            stroke={theme.powerColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(RealtimeChart);
