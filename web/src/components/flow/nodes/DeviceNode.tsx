import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Cpu, CheckCircle, XCircle, Zap } from 'lucide-react';

export interface DeviceNodeData {
  uid: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  calibrationValid: boolean;
  metrics?: {
    powerW?: number;
    tempC?: number;
    sampleRate?: number;
    [key: string]: any;
  };
}

export function DeviceNode({ data }: NodeProps<DeviceNodeData>) {
  const { uid, name, status, calibrationValid, metrics } = data;

  return (
    <div className={`glass-node status-${status} min-w-[220px]`}>
      <Handle type="target" position={Position.Top} id="input" />

      <div className="glass-node-header">
        <div className={`status-dot ${status}`} />
        <Cpu size={18} />
        <div className="flex-1">
          <div className="font-semibold">{name}</div>
          <div className="text-xs font-mono opacity-70">{uid.slice(0, 12)}</div>
        </div>
        {calibrationValid ? (
          <CheckCircle size={16} className="text-green-500" />
        ) : (
          <XCircle size={16} className="text-red-500" />
        )}
      </div>

      {metrics && (
        <div className="glass-node-metrics mt-3">
          {metrics.powerW !== undefined && (
            <div className="metric-row">
              <span className="metric-label flex items-center gap-1">
                <Zap size={12} />
                Power:
              </span>
              <span className="metric-value">{metrics.powerW.toFixed(1)}W</span>
            </div>
          )}
          {metrics.tempC !== undefined && (
            <div className="metric-row">
              <span className="metric-label">Temp:</span>
              <span className="metric-value">{metrics.tempC.toFixed(1)}°C</span>
            </div>
          )}
          {metrics.sampleRate !== undefined && (
            <div className="metric-row">
              <span className="metric-label">Rate:</span>
              <span className="metric-value">{metrics.sampleRate} Hz</span>
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} id="output" />
    </div>
  );
}
