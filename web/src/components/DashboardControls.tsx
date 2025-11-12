import React from 'react';
import {
  Moon,
  Sun,
  Pause,
  Play,
  Download,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';

const DashboardControls: React.FC = () => {
  const {
    isPaused,
    timeWindow,
    darkMode,
    data,
    zoomDomain,
    togglePause,
    toggleDarkMode,
    setTimeWindow,
    setZoomDomain,
  } = useTelemetryStore();

  const handleExportCSV = () => {
    const csv = [
      ['Time (s)', 'Latency (ms)', 'Power (W)'].join(','),
      ...data.map(point =>
        [point.t, point.lat_ms, point.power_w || ''].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetZoom = () => {
    setZoomDomain(null);
  };

  const timeWindowOptions: Array<{ label: string; value: 30 | 60 | 300 | 900 }> = [
    { label: '30s', value: 30 },
    { label: '1m', value: 60 },
    { label: '5m', value: 300 },
    { label: '15m', value: 900 },
  ];

  return (
    <div className="glass p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gradient">
          BenchLab Telemetry
        </h1>
        <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-600 dark:text-green-400 font-medium">
          Live
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Time Window Selector */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
            {timeWindowOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setTimeWindow(option.value)}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  timeWindow === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pause/Resume */}
        <button
          onClick={togglePause}
          className={`btn-icon ${
            isPaused
              ? 'bg-yellow-500/20 text-yellow-600'
              : 'bg-green-500/20 text-green-600'
          }`}
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </button>

        {/* Reset Zoom */}
        {zoomDomain && (
          <button
            onClick={handleResetZoom}
            className="btn-secondary text-sm"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          className="btn-secondary text-sm"
          title="Export CSV"
          disabled={data.length === 0}
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="btn-icon"
          title={darkMode ? 'Light Mode' : 'Dark Mode'}
        >
          {darkMode ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default DashboardControls;
