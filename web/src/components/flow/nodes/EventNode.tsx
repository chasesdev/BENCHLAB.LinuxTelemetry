import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Circle, CheckCircle } from 'lucide-react';

export interface EventNodeData {
  eventId: string;
  stage: string;
  timestamp: number;
  latency_ms?: number;
  isPaired: boolean;
  isDropped: boolean;
}

export function EventNode({ data }: NodeProps<EventNodeData>) {
  const { eventId, stage, timestamp, latency_ms, isPaired, isDropped } = data;

  const getStatusColor = () => {
    if (isPaired) return 'border-green-500 bg-green-500/20';
    if (isDropped) return 'border-red-500 bg-red-500/20';
    return 'border-blue-500 bg-blue-500/20';
  };

  const getStatusIcon = () => {
    if (isPaired) return <CheckCircle size={14} className="text-green-500" />;
    if (isDropped) return <Circle size={14} className="text-red-500" />;
    return <Circle size={14} className="text-blue-500" />;
  };

  return (
    <div
      className={`glass-node ${getStatusColor()} min-w-[140px]`}
      style={{ borderWidth: '2px' }}
    >
      <Handle type="target" position={Position.Left} id="input" />

      <div className="flex items-start gap-2">
        {getStatusIcon()}
        <div className="flex-1">
          <div className="text-xs font-semibold">{stage}</div>
          <div className="text-xs font-mono opacity-70">
            {eventId.slice(0, 8)}
          </div>
          <div className="text-xs opacity-60 mt-1">
            {new Date(timestamp / 1e6).toLocaleTimeString()}
          </div>
          {latency_ms !== undefined && (
            <div className="text-xs font-bold text-green-500 mt-1">
              {latency_ms.toFixed(2)} ms
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="output" />
    </div>
  );
}
