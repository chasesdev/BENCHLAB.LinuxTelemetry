import React from 'react';
import { Thermometer, Droplets } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { useTelemetryStore } from '../store/telemetryStore';

const TEMP_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6'  // teal
];

export const EnvironmentalPanel: React.FC = React.memo(() => {
  const { dataPoints, darkMode } = useTelemetryStore();

  const latestData = dataPoints[dataPoints.length - 1];
  const temps = latestData?.temps || {};
  const humidity = latestData?.humidity;

  // Prepare chart data for temperature trends
  const chartData = dataPoints
    .filter(point => point.temps && Object.keys(point.temps).length > 0)
    .slice(-100)
    .map(point => ({
      timestamp: point.timestamp,
      time: format(new Date(point.timestamp), 'HH:mm:ss'),
      ...point.temps
    }));

  const getHumidityColor = (h: number | undefined) => {
    if (!h) return 'text-gray-500';
    if (h < 30) return 'text-yellow-500';
    if (h > 70) return 'text-blue-500';
    return 'text-green-500';
  };

  const getHumidityBg = (h: number | undefined) => {
    if (!h) return 'bg-gray-500/20';
    if (h < 30) return 'bg-yellow-500/20';
    if (h > 70) return 'bg-blue-500/20';
    return 'bg-green-500/20';
  };

  const getTempColor = (temp: number) => {
    if (temp < 40) return 'text-blue-500';
    if (temp < 60) return 'text-green-500';
    if (temp < 75) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Temperature Sensors Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Thermometer size={20} className={darkMode ? 'text-red-400' : 'text-red-600'} />
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            Temperature Sensors
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {Object.entries(temps).map(([sensor, temp]) => (
            <div
              key={sensor}
              className={`p-4 rounded-lg border ${
                darkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className={`text-xs uppercase ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                {sensor}
              </div>
              <div className={`text-2xl font-bold ${getTempColor(temp)}`}>
                {temp.toFixed(1)}°C
              </div>
            </div>
          ))}
        </div>

        {/* Temperature Trends Chart */}
        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={darkMode ? '#374151' : '#e5e7eb'}
              />
              <XAxis
                dataKey="time"
                stroke={darkMode ? '#9ca3af' : '#6b7280'}
                tick={{ fill: darkMode ? '#9ca3af' : '#6b7280', fontSize: 12 }}
              />
              <YAxis
                label={{
                  value: 'Temperature (°C)',
                  angle: -90,
                  position: 'insideLeft',
                  fill: darkMode ? '#9ca3af' : '#6b7280'
                }}
                stroke={darkMode ? '#9ca3af' : '#6b7280'}
                tick={{ fill: darkMode ? '#9ca3af' : '#6b7280' }}
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                  border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                  borderRadius: '0.5rem',
                  color: darkMode ? '#f3f4f6' : '#111827'
                }}
                labelFormatter={(value) => `Time: ${value}`}
                formatter={(value: number) => `${value.toFixed(1)}°C`}
              />
              <Legend wrapperStyle={{ color: darkMode ? '#9ca3af' : '#6b7280' }} />

              {Object.keys(temps).map((sensor, idx) => (
                <Line
                  key={sensor}
                  type="monotone"
                  dataKey={sensor}
                  stroke={TEMP_COLORS[idx % TEMP_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  name={sensor.toUpperCase()}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Humidity */}
      {humidity !== undefined && (
        <div
          className={`p-6 rounded-lg border ${
            darkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Droplets size={20} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                Relative Humidity
              </h3>
            </div>
            <span
              className={`px-3 py-1 rounded text-sm font-medium ${getHumidityBg(humidity)} ${getHumidityColor(humidity)}`}
            >
              {humidity < 30 ? 'Low' : humidity > 70 ? 'High' : 'Optimal'}
            </span>
          </div>

          <div className="flex items-end gap-4">
            <div className={`text-5xl font-bold ${getHumidityColor(humidity)}`}>
              {humidity.toFixed(1)}%
            </div>
            <div className="flex-1 mb-3">
              <div className={`h-4 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className={`h-full transition-all duration-300 ${
                    humidity < 30
                      ? 'bg-yellow-500'
                      : humidity > 70
                      ? 'bg-blue-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${humidity}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>0%</span>
                <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>50%</span>
                <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>100%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
