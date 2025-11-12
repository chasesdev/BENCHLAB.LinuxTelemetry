import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { HardDrive } from 'lucide-react';

export interface StorageNodeData {
  label: string;
  status: 'active' | 'inactive' | 'error';
  path?: string;
  size?: string;
}

export function StorageNode({ data }: NodeProps<StorageNodeData>) {
  const { label, status, path, size } = data;

  return (
    <div className={`glass-node node-storage status-${status}`}>
      <Handle type="target" position={Position.Top} id="input" />

      <div className="glass-node-header">
        <div className={`status-dot ${status}`} />
        <HardDrive size={16} />
        <div>{label}</div>
      </div>

      {path && (
        <div className="glass-node-metrics">
          <div className="text-xs font-mono opacity-70">{path}</div>
          {size && <div className="text-xs mt-1">Size: {size}</div>}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} id="output" />
    </div>
  );
}
