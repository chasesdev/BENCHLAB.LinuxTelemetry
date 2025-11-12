import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Cpu } from 'lucide-react';

export interface ProcessorNodeData {
  label: string;
  status: 'active' | 'inactive' | 'error';
  metrics?: {
    [key: string]: any;
  };
  onDoubleClick?: () => void;
}

export function ProcessorNode({ data }: NodeProps<ProcessorNodeData>) {
  const { label, status, metrics, onDoubleClick } = data;

  return (
    <div
      className={`glass-node node-processor status-${status} glow-green`}
      onDoubleClick={onDoubleClick}
      style={{ cursor: onDoubleClick ? 'pointer' : 'default' }}
    >
      <Handle type="target" position={Position.Top} id="input" />

      <div className="glass-node-header">
        <div className={`status-dot ${status}`} />
        <Cpu size={16} />
        <div>{label}</div>
      </div>

      {metrics && (
        <div className="glass-node-metrics">
          {Object.entries(metrics).slice(0, 5).map(([key, value]) => (
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

      {onDoubleClick && (
        <div className="text-xs text-center mt-2 opacity-60">
          Double-click to explore
        </div>
      )}

      <Handle type="source" position={Position.Bottom} id="output" />
    </div>
  );
}
