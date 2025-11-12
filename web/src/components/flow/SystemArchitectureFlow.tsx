import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '../../styles/flow.css';

import { DataSourceNode } from './nodes/DataSourceNode';
import { CollectorNode } from './nodes/CollectorNode';
import { ProcessorNode } from './nodes/ProcessorNode';
import { StorageNode } from './nodes/StorageNode';
import { ExporterNode } from './nodes/ExporterNode';
import { getLayoutedElements } from './layouts/pipelineLayout';
import { useArchitectureData } from '../../hooks/useArchitectureData';
import { useTelemetryStore } from '../../store/telemetryStore';

const nodeTypes = {
  dataSource: DataSourceNode,
  collector: CollectorNode,
  processor: ProcessorNode,
  storage: StorageNode,
  exporter: ExporterNode,
};

interface SystemArchitectureFlowProps {
  onPairingVisualizerOpen?: () => void;
}

export function SystemArchitectureFlow({
  onPairingVisualizerOpen,
}: SystemArchitectureFlowProps) {
  const { darkMode } = useTelemetryStore();
  const { data: archData, isLoading, error } = useArchitectureData(2000);
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');

  // Define initial nodes based on architecture
  const initialNodes: Node[] = useMemo(() => {
    if (!archData) return [];

    const nodes: Node[] = [
      // Data Sources
      {
        id: 'benchlab-usb',
        type: 'dataSource',
        position: { x: 0, y: 0 },
        data: {
          label: 'BENCHLAB USB',
          status: archData.components.benchlabd?.status || 'inactive',
          metrics: {
            'Device': archData.components.benchlabd?.metrics.deviceUID?.slice(0, 8) || 'N/A',
            'Power': `${archData.components.benchlabd?.metrics.powerW || 0}W`,
            'Sensors': archData.components.benchlabd?.metrics.sensorsActive || 0,
          },
        },
      },
      {
        id: 'gpu-cpu',
        type: 'dataSource',
        position: { x: 250, y: 0 },
        data: {
          label: 'GPU/CPU/NIC',
          status: archData.components.telemetryd?.status || 'inactive',
          metrics: {
            'GPU Temp': `${archData.components.telemetryd?.metrics.gpuTemp || 0}°C`,
            'GPU Power': `${archData.components.telemetryd?.metrics.gpuPower || 0}W`,
            'CPU': `${archData.components.telemetryd?.metrics.cpuUsage || 0}%`,
          },
        },
      },
      {
        id: 'pipeline',
        type: 'dataSource',
        position: { x: 500, y: 0 },
        data: {
          label: 'Pipeline Probes',
          status: archData.components.pipeline_probes?.status || 'inactive',
          metrics: {
            'Events/sec': archData.components.pipeline_probes?.metrics.eventsPerSec || 0,
            'Streams': archData.components.pipeline_probes?.metrics.activeStreams || 0,
          },
        },
      },

      // Collectors
      {
        id: 'benchlabd',
        type: 'collector',
        position: { x: 0, y: 200 },
        data: {
          label: 'benchlabd',
          status: archData.components.benchlabd?.status || 'inactive',
          metrics: {
            'Rate': `${archData.components.benchlabd?.metrics.sampleRate || 0} Hz`,
            'Calibration': archData.components.benchlabd?.metrics.calibrationValid ? '✓ Valid' : '✗ Invalid',
          },
        },
      },
      {
        id: 'telemetryd',
        type: 'collector',
        position: { x: 250, y: 200 },
        data: {
          label: 'telemetryd',
          status: archData.components.telemetryd?.status || 'inactive',
          metrics: {
            'Rate': `${archData.components.telemetryd?.metrics.sampleRate || 0} Hz`,
            'Memory': `${archData.components.telemetryd?.metrics.memUsage || 0}%`,
          },
        },
      },
      {
        id: 'pipeline-probes',
        type: 'collector',
        position: { x: 500, y: 200 },
        data: {
          label: 'pipeline_probes',
          status: archData.components.pipeline_probes?.status || 'inactive',
          metrics: {
            'Stages': archData.components.pipeline_probes?.metrics.stages?.length || 0,
          },
        },
      },

      // Storage (intermediate)
      {
        id: 'raw-benchlab',
        type: 'storage',
        position: { x: 0, y: 400 },
        data: {
          label: 'benchlab.jsonl',
          status: archData.components.benchlabd?.status || 'inactive',
          path: 'raw/benchlab.jsonl',
        },
      },
      {
        id: 'raw-telemetry',
        type: 'storage',
        position: { x: 250, y: 400 },
        data: {
          label: 'telemetry.jsonl',
          status: archData.components.telemetryd?.status || 'inactive',
          path: 'raw/telemetry.jsonl',
        },
      },
      {
        id: 'raw-pipeline',
        type: 'storage',
        position: { x: 500, y: 400 },
        data: {
          label: 'pipeline.jsonl',
          status: archData.components.pipeline_probes?.status || 'inactive',
          path: 'raw/pipeline.jsonl',
        },
      },

      // Processor (muxd)
      {
        id: 'muxd',
        type: 'processor',
        position: { x: 250, y: 600 },
        data: {
          label: 'muxd',
          status: archData.components.muxd?.status || 'inactive',
          metrics: {
            'Pairs/sec': archData.components.muxd?.metrics.pairsPerSec || 0,
            'Success': `${archData.components.muxd?.metrics.successRate || 0}%`,
            'Dropped': archData.components.muxd?.metrics.droppedEvents || 0,
            'Latency': `${archData.components.muxd?.metrics.avgLatencyMs || 0}ms`,
          },
          onDoubleClick: onPairingVisualizerOpen,
        },
      },

      // Storage (aligned)
      {
        id: 'aligned-latency',
        type: 'storage',
        position: { x: 250, y: 800 },
        data: {
          label: 'latency.jsonl',
          status: archData.components.muxd?.status || 'inactive',
          path: 'aligned/latency.jsonl',
        },
      },

      // Exporters
      {
        id: 'prometheus',
        type: 'exporter',
        position: { x: 100, y: 1000 },
        data: {
          label: 'Prometheus',
          status: archData.components.prometheus?.status || 'inactive',
          metrics: {
            'Metrics': archData.components.prometheus?.metrics.metricsExported || 0,
            'Scrapes': archData.components.prometheus?.metrics.scrapeCount || 0,
          },
          url: ':9109/metrics',
        },
      },
      {
        id: 'cx-exporter',
        type: 'exporter',
        position: { x: 400, y: 1000 },
        data: {
          label: 'cx_exporter',
          status: archData.components.cx_exporter?.status || 'inactive',
          metrics: {
            'Rows': archData.components.cx_exporter?.metrics.rowsExported || 0,
            'Files': archData.components.cx_exporter?.metrics.filesGenerated || 0,
          },
        },
      },

      // Final destinations
      {
        id: 'web-ui',
        type: 'exporter',
        position: { x: 100, y: 1200 },
        data: {
          label: 'Web UI',
          status: archData.components.web_ui?.status || 'active',
          metrics: {
            'Connections': archData.components.web_ui?.metrics.activeConnections || 0,
            'Cached': archData.components.web_ui?.metrics.dataPointsCached || 0,
          },
          url: '/api/live',
        },
      },
      {
        id: 'capframex',
        type: 'exporter',
        position: { x: 400, y: 1200 },
        data: {
          label: 'CapFrameX',
          status: 'inactive',
          metrics: {},
        },
      },
    ];

    return nodes;
  }, [archData, onPairingVisualizerOpen]);

  // Define edges
  const initialEdges: Edge[] = useMemo(() => {
    if (!archData) return [];

    return [
      // Data sources to collectors
      { id: 'e1', source: 'benchlab-usb', target: 'benchlabd', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2', source: 'gpu-cpu', target: 'telemetryd', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3', source: 'pipeline', target: 'pipeline-probes', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },

      // Collectors to storage
      { id: 'e4', source: 'benchlabd', target: 'raw-benchlab', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e5', source: 'telemetryd', target: 'raw-telemetry', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e6', source: 'pipeline-probes', target: 'raw-pipeline', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },

      // Storage to muxd
      { id: 'e7', source: 'raw-benchlab', target: 'muxd', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e8', source: 'raw-telemetry', target: 'muxd', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e9', source: 'raw-pipeline', target: 'muxd', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },

      // Muxd to aligned storage
      { id: 'e10', source: 'muxd', target: 'aligned-latency', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },

      // Aligned storage to exporters
      { id: 'e11', source: 'aligned-latency', target: 'prometheus', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e12', source: 'aligned-latency', target: 'cx-exporter', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },

      // Exporters to final destinations
      { id: 'e13', source: 'prometheus', target: 'web-ui', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e14', source: 'cx-exporter', target: 'capframex', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
    ];
  }, [archData]);

  // Apply layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(initialNodes, initialEdges, layoutDirection),
    [initialNodes, initialEdges, layoutDirection]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Update nodes when data changes
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        Loading architecture...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Error loading architecture: {error}
      </div>
    );
  }

  return (
    <div className="w-full h-[800px] bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
        <MiniMap
          nodeColor={(node) => {
            if (node.data.status === 'active') return '#10b981';
            if (node.data.status === 'error') return '#ef4444';
            return '#9ca3af';
          }}
          maskColor={darkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)'}
        />
      </ReactFlow>

      {/* Layout Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setLayoutDirection(layoutDirection === 'TB' ? 'LR' : 'TB')}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {layoutDirection === 'TB' ? '↕ Vertical' : '↔ Horizontal'}
        </button>
      </div>
    </div>
  );
}
