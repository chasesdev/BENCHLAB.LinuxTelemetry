import { useEffect } from 'react';
import Head from 'next/head';
import DashboardControls from '../components/DashboardControls';
import StatsCards from '../components/StatsCards';
import RealtimeChart from '../components/RealtimeChart';
import CorrelationScatter from '../components/CorrelationScatter';
import LatencyHistogram from '../components/LatencyHistogram';
import { useTelemetryStore } from '../store/telemetryStore';
import { useTelemetryData } from '../hooks/useTelemetryData';

export default function Home() {
  const { darkMode } = useTelemetryStore();

  // Initialize dark mode on mount
  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Fetch telemetry data every second
  useTelemetryData(1000);

  return (
    <>
      <Head>
        <title>BenchLab Telemetry Dashboard</title>
        <meta name="description" content="Real-time pipeline latency and power monitoring" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gray-50 dark:bg-telemetry-bg-dark p-4 md:p-6 lg:p-8 transition-colors">
        <div className="max-w-[1800px] mx-auto space-y-6">
          {/* Header Controls */}
          <DashboardControls />

          {/* Statistics Cards */}
          <StatsCards />

          {/* Main Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Large Chart - 2/3 width */}
            <div className="lg:col-span-2">
              <RealtimeChart height={500} />
            </div>

            {/* Side Panel - 1/3 width */}
            <div className="space-y-6">
              <CorrelationScatter />
              <LatencyHistogram />
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-6 border-t border-gray-200 dark:border-gray-800">
            <p>
              BenchLab Linux Telemetry v0.1.0 | Monitoring:{' '}
              <span className="font-mono text-blue-600 dark:text-blue-400">
                /api/live
              </span>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
