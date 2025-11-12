import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Upload, ExternalLink } from 'lucide-react';

export interface ExporterNodeData {
  label: string;
  status: 'active' | 'inactive' | 'error';
  metrics?: {
    [key: string]: any;
  };
  url?: string;
}

export function ExporterNode({ data }: NodeProps<ExporterNodeData>) {
  const { label, status, metrics, url } = data;

  return (
    <div className={`glass-node node-exporter status-${status}`}>
      <Handle type="target" position={Position.Top} id="input" />

      <div className="glass-node-header">
        <div className={`status-dot ${status}`} />
        <Upload size={16} />
        <div>{label}</div>
        {url && <ExternalLink size={12} className="ml-auto opacity-60" />}
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

      {url && (
        <div className="text-xs font-mono opacity-60 mt-2 truncate">{url}</div>
      )}
    </div>
  );
}
