import React, { useState, useMemo, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  MarkerType,
} from 'reactflow';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { EventNode } from './nodes/EventNode';
import { BufferNode } from './nodes/BufferNode';
import { useTelemetryStore } from '../../store/telemetryStore';

const nodeTypes = {
  event: EventNode,
  buffer: BufferNode,
};

interface PairingEvent {
  id: string;
  stage: string;
  timestamp: number;
  paired?: boolean;
  pairId?: string;
  latency_ms?: number;
}

export function PairingVisualizerFlow() {
  const { darkMode } = useTelemetryStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [timeWindow, setTimeWindow] = useState(5000); // 5 seconds in ms

  // Mock pairing events for demonstration
  // In production, this would come from real muxd pairing data
  const mockEvents: PairingEvent[] = useMemo(() => {
    const events: PairingEvent[] = [];
    const now = Date.now() * 1e6; // Convert to ns

    // Generate some mock events
    for (let i = 0; i < 20; i++) {
      const timestamp = now - (19 - i) * 200 * 1e6; // 200ms apart

      // Ingress events (bufA)
      events.push({
        id: `ingress-${i}`,
        stage: 'ingress',
        timestamp,
      });

      // Encoded events (bufB) - slightly delayed
      if (i > 2) {
        events.push({
          id: `encoded-${i - 2}`,
          stage: 'encoded',
          timestamp: timestamp + 50 * 1e6, // 50ms later
        });
      }
    }

    // Mark some as paired
    for (let i = 0; i < Math.min(15, events.length / 2); i++) {
      const ingressEvent = events.find((e) => e.id === `ingress-${i + 2}`);
      const encodedEvent = events.find((e) => e.id === `encoded-${i}`);

      if (ingressEvent && encodedEvent) {
        const latency = (encodedEvent.timestamp - ingressEvent.timestamp) / 1e6;
        ingressEvent.paired = true;
        ingressEvent.pairId = `pair-${i}`;
        ingressEvent.latency_ms = latency;
        encodedEvent.paired = true;
        encodedEvent.pairId = `pair-${i}`;
        encodedEvent.latency_ms = latency;
      }
    }

    return events;
  }, []);

  // Filter events based on current time
  const visibleEvents = useMemo(() => {
    const startTime = currentTime;
    const endTime = currentTime + timeWindow * 1e6;

    return mockEvents.filter(
      (event) => event.timestamp >= startTime && event.timestamp <= endTime
    );
  }, [mockEvents, currentTime, timeWindow]);

  // Generate nodes and edges
  const { nodes: generatedNodes, edges: generatedEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Buffer nodes
    const bufAEvents = visibleEvents.filter((e) => e.stage === 'ingress');
    const bufBEvents = visibleEvents.filter((e) => e.stage === 'encoded');

    nodes.push({
      id: 'bufA',
      type: 'buffer',
      position: { x: 50, y: 200 },
      data: {
        label: 'Buffer A (ingress)',
        bufferName: 'bufA',
        eventCount: bufAEvents.length,
        capacity: 20,
        events: bufAEvents.map((e) => ({
          id: e.id,
          stage: e.stage,
          timestamp: e.timestamp,
        })),
      },
    });

    nodes.push({
      id: 'bufB',
      type: 'buffer',
      position: { x: 550, y: 200 },
      data: {
        label: 'Buffer B (encoded)',
        bufferName: 'bufB',
        eventCount: bufBEvents.length,
        capacity: 20,
        events: bufBEvents.map((e) => ({
          id: e.id,
          stage: e.stage,
          timestamp: e.timestamp,
        })),
      },
    });

    // Event nodes
    visibleEvents.forEach((event, idx) => {
      const isBufferA = event.stage === 'ingress';
      const x = isBufferA ? 50 : 550;
      const y = 450 + idx * 80;

      nodes.push({
        id: event.id,
        type: 'event',
        position: { x, y },
        data: {
          eventId: event.id,
          stage: event.stage,
          timestamp: event.timestamp,
          latency_ms: event.latency_ms,
          isPaired: event.paired || false,
          isDropped: !event.paired && idx < visibleEvents.length - 5,
        },
      });

      // Connect events to buffers
      edges.push({
        id: `e-${event.id}-buffer`,
        source: isBufferA ? 'bufA' : 'bufB',
        target: event.id,
        animated: false,
        style: { stroke: '#9ca3af' },
      });

      // Connect paired events
      if (event.paired && event.pairId) {
        const pairedEvent = visibleEvents.find(
          (e) => e.pairId === event.pairId && e.id !== event.id
        );
        if (pairedEvent && isBufferA) {
          edges.push({
            id: `pair-${event.pairId}`,
            source: event.id,
            target: pairedEvent.id,
            animated: true,
            style: { stroke: '#10b981', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
            label: `${event.latency_ms?.toFixed(1)}ms`,
            labelStyle: { fill: '#10b981', fontWeight: 600 },
          });
        }
      }
    });

    return { nodes, edges };
  }, [visibleEvents]);

  const [nodes, setNodes, onNodesChange] = useNodesState(generatedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(generatedEdges);

  // Update nodes/edges when generated data changes
  React.useEffect(() => {
    setNodes(generatedNodes);
    setEdges(generatedEdges);
  }, [generatedNodes, generatedEdges, setNodes, setEdges]);

  // Playback control
  React.useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 100 * 1e6; // Advance 100ms
        const maxTime =
          mockEvents.length > 0
            ? mockEvents[mockEvents.length - 1].timestamp
            : 0;
        if (next > maxTime) {
          setIsPlaying(false);
          return maxTime;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, mockEvents]);

  const handleReset = useCallback(() => {
    setCurrentTime(mockEvents.length > 0 ? mockEvents[0].timestamp : 0);
    setIsPlaying(false);
  }, [mockEvents]);

  const pairedCount = visibleEvents.filter((e) => e.paired).length / 2;
  const droppedCount = visibleEvents.filter(
    (e) => !e.paired && e.timestamp < currentTime + timeWindow * 1e6 * 0.8
  ).length;
  const successRate =
    visibleEvents.length > 0
      ? ((pairedCount / (pairedCount + droppedCount)) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="w-full h-[700px] bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1}
          color={darkMode ? '#374151' : '#e5e7eb'}
        />
        <Controls />
      </ReactFlow>

      {/* Timeline controls */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 glass-node">
          <div className="flex items-center gap-4">
            {/* Playback controls */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button
                onClick={handleReset}
                className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <RotateCcw size={20} />
              </button>
            </div>

            {/* Stats */}
            <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs opacity-60">Pairing Window</div>
                <div className="font-semibold">2.0s</div>
              </div>
              <div>
                <div className="text-xs opacity-60">Pairs Created</div>
                <div className="font-semibold text-green-500">{pairedCount}</div>
              </div>
              <div>
                <div className="text-xs opacity-60">Dropped</div>
                <div className="font-semibold text-red-500">{droppedCount}</div>
              </div>
              <div>
                <div className="text-xs opacity-60">Success Rate</div>
                <div className="font-semibold">{successRate}%</div>
              </div>
            </div>

            {/* Time display */}
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} />
              <span className="font-mono">
                {((currentTime / 1e9) % 60).toFixed(1)}s
              </span>
            </div>
          </div>

          {/* Timeline slider */}
          <div className="mt-3">
            <input
              type="range"
              min={mockEvents.length > 0 ? mockEvents[0].timestamp : 0}
              max={
                mockEvents.length > 0
                  ? mockEvents[mockEvents.length - 1].timestamp
                  : 0
              }
              value={currentTime}
              onChange={(e) => setCurrentTime(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-3 glass-node">
          <div className="text-xs font-semibold mb-2">Legend</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Paired</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Buffered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Dropped</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
