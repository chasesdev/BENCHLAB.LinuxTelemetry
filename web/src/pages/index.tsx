import { useEffect, useState } from 'react';
import Head from 'next/head';
import DashboardControls from '../components/DashboardControls';
import StatsCards from '../components/StatsCards';
import RealtimeChart from '../components/RealtimeChart';
import CorrelationScatter from '../components/CorrelationScatter';
import LatencyHistogram from '../components/LatencyHistogram';
import { PowerRailsChart } from '../components/PowerRailsChart';
import { FanPanel } from '../components/FanPanel';
import { DeviceInfoPanel } from '../components/DeviceInfoPanel';
import { EnvironmentalPanel } from '../components/EnvironmentalPanel';
import { SystemArchitectureFlow } from '../components/flow/SystemArchitectureFlow';
import { useTelemetryStore } from '../store/telemetryStore';
import { useTelemetryData } from '../hooks/useTelemetryData';
import { BarChart3, Zap, Fan, Thermometer, Info, Network } from 'lucide-react';

type TabType = 'overview' | 'architecture' | 'power' | 'thermal' | 'device';

export default function Home() {
  const { darkMode } = useTelemetryStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Initialize dark mode on mount
  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Fetch telemetry data every second
  useTelemetryData(1000);

  const tabs: Array<{ id: TabType; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'architecture', label: 'Architecture', icon: Network },
    { id: 'power', label: 'Power', icon: Zap },
    { id: 'thermal', label: 'Thermal', icon: Thermometer },
    { id: 'device', label: 'Device', icon: Info },
  ];

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

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
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
            </>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Network size={24} />
                  System Architecture & Data Flow
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Real-time visualization of the BenchLab telemetry pipeline. Double-click the muxd node to explore pairing logic.
                </p>
                <SystemArchitectureFlow />
              </div>
            </div>
          )}

          {activeTab === 'power' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  Power Rails (All Channels)
                </h2>
                <PowerRailsChart />
              </div>

              {/* Power Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Total System Power
                  </h3>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    --.- W
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Efficiency (ms/W)
                  </h3>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    --.-
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Peak Power
                  </h3>
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    --.- W
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'thermal' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <EnvironmentalPanel />
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                <FanPanel />
              </div>
            </div>
          )}

          {activeTab === 'device' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <DeviceInfoPanel />
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    Connection Status
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">API Endpoint:</span>
                      <span className="font-mono text-gray-900 dark:text-gray-100">
                        http://localhost:8080
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Device Path:</span>
                      <span className="font-mono text-gray-900 dark:text-gray-100">
                        /dev/ttyACM0
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Sample Rate:</span>
                      <span className="font-mono text-gray-900 dark:text-gray-100">
                        10 Hz
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                    Sensor Capabilities
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600 dark:text-gray-400 mb-1">Voltage Channels</div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">13</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400 mb-1">Power Rails</div>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">11</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400 mb-1">Fan Channels</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">9</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400 mb-1">Temperature Sensors</div>
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">6</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-6 border-t border-gray-200 dark:border-gray-800">
            <p>
              BenchLab Linux Telemetry v0.2.0 | LinuxSupportKit SDK Integration | Monitoring:{' '}
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
