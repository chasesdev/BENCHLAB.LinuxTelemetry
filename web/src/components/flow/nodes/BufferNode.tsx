import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Layers } from 'lucide-react';

export interface BufferNodeData {
  label: string;
  bufferName: 'bufA' | 'bufB';
  eventCount: number;
  capacity: number;
  events?: Array<{
    id: string;
    stage: string;
    timestamp: number;
  }>;
}

export function BufferNode({ data }: NodeProps<BufferNodeData>) {
  const { label, bufferName, eventCount, capacity, events } = data;

  const fillPercentage = (eventCount / capacity) * 100;
  const getFillColor = () => {
    if (fillPercentage > 80) return 'bg-red-500';
    if (fillPercentage > 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className="glass-node node-storage min-w-[200px]">
      <Handle type="target" position={Position.Top} id="input" />

      <div className="glass-node-header">
        <Layers size={16} />
        <div>{label}</div>
        <div className="ml-auto text-xs opacity-70">
          {eventCount}/{capacity}
        </div>
      </div>

      {/* Buffer fill indicator */}
      <div className="mt-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getFillColor()} transition-all duration-300`}
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
      </div>

      {/* Event list */}
      {events && events.length > 0 && (
        <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
          {events.slice(0, 5).map((event) => (
            <div
              key={event.id}
              className="text-xs p-1 bg-gray-100 dark:bg-gray-700 rounded flex justify-between"
            >
              <span className="font-mono">{event.stage}</span>
              <span className="opacity-60">{event.id.slice(0, 6)}</span>
            </div>
          ))}
          {events.length > 5 && (
            <div className="text-xs opacity-60 text-center">
              +{events.length - 5} more
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} id="output" />
    </div>
  );
}
