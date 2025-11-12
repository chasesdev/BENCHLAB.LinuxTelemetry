import React from 'react';
import {
  Moon,
  Sun,
  Pause,
  Play,
  Download,
  RotateCcw,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
  Radio,
} from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';

const DashboardControls: React.FC = () => {
  const {
    isPaused,
    timeWindow,
    darkMode,
    data,
    zoomDomain,
    pollingInterval,
    connectionMode,
    connectionStatus,
    togglePause,
    toggleDarkMode,
    setTimeWindow,
    setZoomDomain,
    setPollingInterval,
    setConnectionMode,
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

  const pollingIntervalOptions: Array<{ label: string; value: 500 | 1000 | 2000 | 5000 }> = [
    { label: '500ms', value: 500 },
    { label: '1s', value: 1000 },
    { label: '2s', value: 2000 },
    { label: '5s', value: 5000 },
  ];

  const connectionModeOptions: Array<{ label: string; value: 'auto' | 'websocket' | 'polling'; icon: any }> = [
    { label: 'Auto', value: 'auto', icon: Radio },
    { label: 'WebSocket', value: 'websocket', icon: Wifi },
    { label: 'Polling', value: 'polling', icon: RefreshCw },
  ];

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'connecting':
        return <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'error':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      case 'disconnected':
      default:
        return <WifiOff className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return connectionMode === 'websocket' || (connectionMode === 'auto' && connectionStatus === 'connected')
          ? 'WebSocket'
          : 'Polling';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="glass p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gradient">
          BenchLab Telemetry
        </h1>
        <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium ${
          connectionStatus === 'connected'
            ? 'bg-green-500/20 text-green-600 dark:text-green-400'
            : connectionStatus === 'connecting'
            ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
            : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
        }`}>
          {getConnectionStatusIcon()}
          {getConnectionStatusText()}
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

        {/* Polling Interval Selector (only show when not using WebSocket) */}
        {(connectionMode === 'polling' || (connectionMode === 'auto' && connectionStatus !== 'connected')) && (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-gray-500" />
            <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
              {pollingIntervalOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setPollingInterval(option.value)}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    pollingInterval === option.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Connection Mode Selector */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
            {connectionModeOptions.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setConnectionMode(option.value)}
                  className={`flex items-center gap-1 px-3 py-1 text-sm font-medium transition-colors ${
                    connectionMode === option.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  title={option.label}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              );
            })}
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

export default React.memo(DashboardControls);
