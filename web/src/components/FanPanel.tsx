import React from 'react';
import { Fan, Activity } from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';

interface FanGaugeProps {
  fanIndex: number;
  enabled: boolean;
  duty: number;
  rpm: number;
  darkMode: boolean;
}

const FanGauge: React.FC<FanGaugeProps> = ({ fanIndex, enabled, duty, rpm, darkMode }) => {
  const dutyPercent = (duty / 255) * 100;
  const rpmPercent = Math.min((rpm / 3000) * 100, 100);

  return (
    <div
      className={`p-4 rounded-lg border ${
        darkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Fan
            size={20}
            className={enabled ? 'text-green-500 animate-spin' : 'text-gray-400'}
          />
          <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            Fan {fanIndex}
          </span>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            enabled
              ? 'bg-green-500/20 text-green-500'
              : 'bg-gray-500/20 text-gray-500'
          }`}
        >
          {enabled ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* RPM Gauge */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>RPM</span>
          <span className={`font-mono ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {rpm.toLocaleString()}
          </span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${rpmPercent}%` }}
          />
        </div>
      </div>

      {/* Duty Cycle Bar */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Duty</span>
          <span className={`font-mono ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {dutyPercent.toFixed(0)}%
          </span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-300"
            style={{ width: `${dutyPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export const FanPanel: React.FC = () => {
  const { dataPoints, darkMode } = useTelemetryStore();

  const latestData = dataPoints[dataPoints.length - 1];
  const fans = latestData?.fans || [];

  if (fans.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No fan data available
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Activity size={20} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
        <h3 className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          Fan Status
        </h3>
        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          ({fans.filter(f => f.enabled).length}/{fans.length} active)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fans.map((fan) => (
          <FanGauge
            key={fan.fan}
            fanIndex={fan.fan}
            enabled={fan.enabled}
            duty={fan.duty}
            rpm={fan.rpm}
            darkMode={darkMode}
          />
        ))}
      </div>
    </div>
  );
};
