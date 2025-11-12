import React from 'react';
import { TrendingUp, TrendingDown, Activity, Zap, Gauge, AlertTriangle } from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';

const StatsCards: React.FC = () => {
  const { stats } = useTelemetryStore();

  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-card animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
        ))}
      </div>
    );
  }

  const getLatencyColor = (value: number) => {
    if (value < 10) return 'text-telemetry-latency-good';
    if (value < 20) return 'text-telemetry-latency-warning';
    return 'text-telemetry-latency-critical';
  };

  const cards = [
    {
      label: 'Current Latency',
      value: stats.latency.current.toFixed(2),
      unit: 'ms',
      icon: Activity,
      color: getLatencyColor(stats.latency.current),
      trend: stats.latency.current > stats.latency.avg ? 'up' : 'down',
    },
    {
      label: 'Avg Latency',
      value: stats.latency.avg.toFixed(2),
      unit: 'ms',
      icon: Gauge,
      color: 'text-blue-500',
    },
    {
      label: 'P95 Latency',
      value: stats.latency.p95.toFixed(2),
      unit: 'ms',
      icon: TrendingUp,
      color: getLatencyColor(stats.latency.p95),
    },
    {
      label: 'Current Power',
      value: stats.power.current.toFixed(1),
      unit: 'W',
      icon: Zap,
      color: 'text-pink-500',
      trend: stats.power.current > stats.power.avg ? 'up' : 'down',
    },
    {
      label: 'Min Latency',
      value: stats.latency.min.toFixed(2),
      unit: 'ms',
      icon: TrendingDown,
      color: 'text-green-500',
    },
    {
      label: 'Max Latency',
      value: stats.latency.max.toFixed(2),
      unit: 'ms',
      icon: AlertTriangle,
      color: getLatencyColor(stats.latency.max),
    },
    {
      label: 'Avg Power',
      value: stats.power.avg.toFixed(1),
      unit: 'W',
      icon: Zap,
      color: 'text-purple-500',
    },
    {
      label: 'P99 Latency',
      value: stats.latency.p99.toFixed(2),
      unit: 'ms',
      icon: TrendingUp,
      color: getLatencyColor(stats.latency.p99),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="stat-card hover:scale-105 transition-transform duration-200 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="stat-label">{card.label}</span>
              <Icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`stat-value ${card.color}`}>
                {card.value}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {card.unit}
              </span>
            </div>
            {card.trend && (
              <div className="mt-1 flex items-center gap-1">
                {card.trend === 'up' ? (
                  <TrendingUp className="w-3 h-3 text-red-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-green-500" />
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  vs avg
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(StatsCards);
