import React from 'react';
import { Cpu, CheckCircle, XCircle, AlertCircle, Activity } from 'lucide-react';
import { useTelemetryStore } from '../store/telemetryStore';

export const DeviceInfoPanel: React.FC = () => {
  const { dataPoints, darkMode } = useTelemetryStore();

  const latestData = dataPoints[dataPoints.length - 1];
  const deviceInfo = latestData?.deviceInfo;
  const calibration = latestData?.calibration;

  if (!deviceInfo) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No device information available
      </div>
    );
  }

  const getCalibrationBadge = () => {
    if (!calibration) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-500">
          <AlertCircle size={14} />
          Unknown
        </span>
      );
    }

    if (calibration.status === 'valid') {
      return (
        <span className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-500">
          <CheckCircle size={14} />
          Valid
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-500">
        <XCircle size={14} />
        Invalid
      </span>
    );
  };

  const isConnected = dataPoints.length > 0 && Date.now() - latestData.timestamp < 5000;

  return (
    <div
      className={`p-6 rounded-lg border ${
        darkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-lg ${
              darkMode ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}
          >
            <Cpu size={24} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              BENCHLAB Device
            </h3>
            <span
              className={`flex items-center gap-1 text-sm ${
                isConnected
                  ? 'text-green-500'
                  : 'text-red-500'
              }`}
            >
              <Activity size={14} />
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {getCalibrationBadge()}
      </div>

      <div className="space-y-4">
        <div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
            Device UID
          </div>
          <div className={`font-mono text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {deviceInfo.uid}
          </div>
        </div>

        <div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
            Device Name
          </div>
          <div className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {deviceInfo.name}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
              Firmware
            </div>
            <div className={`font-mono text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              {deviceInfo.firmware}
            </div>
          </div>

          <div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
              Vendor ID
            </div>
            <div className={`font-mono text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              0x{deviceInfo.vendor_id?.toString(16).padStart(4, '0')}
            </div>
          </div>
        </div>

        <div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
            Product ID
          </div>
          <div className={`font-mono text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            0x{deviceInfo.product_id?.toString(16).padStart(4, '0')}
          </div>
        </div>

        {calibration && calibration.loaded && (
          <div className="pt-4 border-t border-gray-700">
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
              Calibration Details
            </div>
            <div className={`text-xs font-mono ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              {Object.keys(calibration.data || {}).length} calibration values loaded
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
