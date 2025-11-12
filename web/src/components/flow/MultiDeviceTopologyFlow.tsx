import React, { useMemo } from 'react';
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
import { DeviceNode } from './nodes/DeviceNode';
import { ExporterNode } from './nodes/ExporterNode';
import { ProcessorNode } from './nodes/ProcessorNode';
import { getLayoutedElements } from './layouts/pipelineLayout';
import { useArchitectureData } from '../../hooks/useArchitectureData';
import { useTelemetryStore } from '../../store/telemetryStore';

const nodeTypes = {
  device: DeviceNode,
  exporter: ExporterNode,
  processor: ProcessorNode,
};

export function MultiDeviceTopologyFlow() {
  const { darkMode } = useTelemetryStore();
  const { data: archData, isLoading, error } = useArchitectureData(2000);

  // Generate topology based on discovered devices
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!archData) return { initialNodes: [], initialEdges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Device nodes (BENCHLAB units)
    archData.devices.forEach((device, idx) => {
      nodes.push({
        id: `device-${device.uid}`,
        type: 'device',
        position: { x: idx * 300, y: 0 },
        data: {
          uid: device.uid,
          name: device.name,
          status: device.status,
          calibrationValid: device.calibrationValid,
          metrics: {
            powerW: archData.components.benchlabd?.metrics.powerW,
            tempC: 45.2, // Mock - would come from device-specific data
            sampleRate: 10,
          },
        },
      });

      // Collector node for each device
      nodes.push({
        id: `collector-${device.uid}`,
        type: 'processor',
        position: { x: idx * 300, y: 200 },
        data: {
          label: `benchlabd-${device.uid.slice(0, 6)}`,
          status: archData.components.benchlabd?.status || 'inactive',
          metrics: {
            'Rate': '10 Hz',
            'Sensors': '50',
          },
        },
      });

      // Connect device to collector
      edges.push({
        id: `e-device-${device.uid}`,
        source: `device-${device.uid}`,
        target: `collector-${device.uid}`,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    });

    // Central muxd node (aggregates from all devices)
    const muxdX = (archData.devices.length - 1) * 150;
    nodes.push({
      id: 'central-muxd',
      type: 'processor',
      position: { x: muxdX, y: 400 },
      data: {
        label: 'Central muxd',
        status: archData.components.muxd?.status || 'active',
        metrics: {
          'Devices': archData.devices.length,
          'Total Pairs/s': archData.components.muxd?.metrics.pairsPerSec || 0,
          'Success': `${archData.components.muxd?.metrics.successRate || 0}%`,
        },
      },
    });

    // Connect all collectors to central muxd
    archData.devices.forEach((device) => {
      edges.push({
        id: `e-collector-muxd-${device.uid}`,
        source: `collector-${device.uid}`,
        target: 'central-muxd',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        label: `${archData.dataFlow.benchlabd_to_muxd?.rate || 0}/s`,
        labelStyle: { fontSize: 10 },
      });
    });

    // Shared Prometheus
    nodes.push({
      id: 'shared-prometheus',
      type: 'exporter',
      position: { x: muxdX - 100, y: 600 },
      data: {
        label: 'Shared Prometheus',
        status: archData.components.prometheus?.status || 'active',
        metrics: {
          'Metrics': archData.components.prometheus?.metrics.metricsExported || 0,
          'Scrapes': archData.components.prometheus?.metrics.scrapeCount || 0,
        },
        url: ':9109/metrics',
      },
    });

    // Shared cx_exporter
    nodes.push({
      id: 'shared-cx',
      type: 'exporter',
      position: { x: muxdX + 100, y: 600 },
      data: {
        label: 'Shared cx_exporter',
        status: archData.components.cx_exporter?.status || 'active',
        metrics: {
          'Rows': archData.components.cx_exporter?.metrics.rowsExported || 0,
        },
      },
    });

    // Connect muxd to exporters
    edges.push(
      {
        id: 'e-muxd-prom',
        source: 'central-muxd',
        target: 'shared-prometheus',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'e-muxd-cx',
        source: 'central-muxd',
        target: 'shared-cx',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      }
    );

    return { initialNodes: nodes, initialEdges: edges };
  }, [archData]);

  // Apply layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(initialNodes, initialEdges, 'TB'),
    [initialNodes, initialEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Update when data changes
  React.useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        Loading multi-device topology...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Error loading topology: {error}
      </div>
    );
  }

  if (!archData || archData.devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p className="text-lg font-semibold">No devices discovered</p>
        <p className="text-sm mt-2">
          Enable multi-device mode in config.toml to use this feature
        </p>
      </div>
    );
  }

  const totalPower = archData.devices.length * (archData.components.benchlabd?.metrics.powerW || 0);
  const avgLatency = archData.components.muxd?.metrics.avgLatencyMs || 0;

  return (
    <div className="space-y-4">
      {/* Fleet Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Devices</div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {archData.devices.length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400">Fleet Power</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {totalPower.toFixed(1)}W
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400">Avg Latency</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {avgLatency.toFixed(1)}ms
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400">Calibrated</div>
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {archData.devices.filter((d) => d.calibrationValid).length}/
            {archData.devices.length}
          </div>
        </div>
      </div>

      {/* Topology Visualization */}
      <div className="w-full h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
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
      </div>
    </div>
  );
}
