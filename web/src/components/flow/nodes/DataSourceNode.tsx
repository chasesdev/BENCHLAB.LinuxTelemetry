import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Database, Activity } from 'lucide-react';

export interface DataSourceNodeData {
  label: string;
  status: 'active' | 'inactive' | 'error';
  metrics?: {
    [key: string]: any;
  };
}

export function DataSourceNode({ data }: NodeProps<DataSourceNodeData>) {
  const { label, status, metrics } = data;

  return (
    <div className={`glass-node node-data-source status-${status}`}>
      <div className="glass-node-header">
        <div className={`status-dot ${status}`} />
        <Database size={16} />
        <div>{label}</div>
      </div>

      {metrics && (
        <div className="glass-node-metrics">
          {Object.entries(metrics).slice(0, 3).map(([key, value]) => (
            <div key={key} className="metric-row">
              <span className="metric-label">{key}:</span>
              <span className="metric-value">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
            </div>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} id="output" />
    </div>
  );
}
