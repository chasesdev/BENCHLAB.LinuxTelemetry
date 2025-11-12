import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Inbox } from 'lucide-react';

export interface CollectorNodeData {
  label: string;
  status: 'active' | 'inactive' | 'error';
  metrics?: {
    [key: string]: any;
  };
}

export function CollectorNode({ data }: NodeProps<CollectorNodeData>) {
  const { label, status, metrics } = data;

  return (
    <div className={`glass-node node-collector status-${status}`}>
      <Handle type="target" position={Position.Top} id="input" />

      <div className="glass-node-header">
        <div className={`status-dot ${status}`} />
        <Inbox size={16} />
        <div>{label}</div>
      </div>

      {metrics && (
        <div className="glass-node-metrics">
          {Object.entries(metrics).slice(0, 4).map(([key, value]) => (
            <div key={key} className="metric-row">
              <span className="metric-label">{key}:</span>
              <span className="metric-value">
                {typeof value === 'number' && value % 1 !== 0
                  ? value.toFixed(1)
                  : typeof value === 'number'
                  ? value.toLocaleString()
                  : value}
              </span>
            </div>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} id="output" />
    </div>
  );
}
