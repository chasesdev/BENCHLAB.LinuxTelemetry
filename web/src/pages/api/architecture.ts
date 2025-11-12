import type { NextApiRequest, NextApiResponse } from 'next';

export interface ComponentMetrics {
  [key: string]: any;
}

export interface Component {
  status: 'active' | 'inactive' | 'error';
  lastSeen: number;
  metrics: ComponentMetrics;
}

export interface DataFlow {
  rate: number; // events/sec
  latency_ms: number;
}

export interface Device {
  uid: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  calibrationValid: boolean;
}

export interface ArchitectureData {
  timestamp: number;
  components: {
    benchlabd?: Component;
    telemetryd?: Component;
    pipeline_probes?: Component;
    muxd?: Component;
    prometheus?: Component;
    cx_exporter?: Component;
    web_ui?: Component;
  };
  dataFlow: {
    [key: string]: DataFlow;
  };
  devices: Device[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ArchitectureData>
) {
  // TODO: In production, this would query actual service health
  // For now, return mock data with realistic values

  const now = Date.now();
  const recentlyActive = now - 3000; // 3 seconds ago

  const data: ArchitectureData = {
    timestamp: now,
    components: {
      benchlabd: {
        status: 'active',
        lastSeen: recentlyActive,
        metrics: {
          sampleRate: 10,
          sensorsActive: 50,
          deviceUID: 'abc123',
          calibrationValid: true,
          errors: 0,
          powerW: 246.2,
          voltageChannels: 13,
          powerRails: 11,
          fans: 9,
          tempSensors: 6,
        },
      },
      telemetryd: {
        status: 'active',
        lastSeen: recentlyActive - 500,
        metrics: {
          sampleRate: 10,
          gpuTemp: 65.2,
          gpuPower: 180.5,
          cpuUsage: 45.3,
          memUsage: 62.1,
        },
      },
      pipeline_probes: {
        status: 'active',
        lastSeen: recentlyActive - 200,
        metrics: {
          eventsPerSec: 30,
          stages: ['ingress', 'encoded', 'inference_done', 'complete'],
          activeStreams: 2,
        },
      },
      muxd: {
        status: 'active',
        lastSeen: recentlyActive - 100,
        metrics: {
          pairsPerSec: 25,
          droppedEvents: 12,
          bufferSizeA: 5,
          bufferSizeB: 3,
          pairingWindow: 2.0,
          successRate: 95.2,
          avgLatencyMs: 12.5,
        },
      },
      prometheus: {
        status: 'active',
        lastSeen: recentlyActive - 1000,
        metrics: {
          metricsExported: 32,
          scrapeCount: 1234,
          lastScrapeDuration: 0.125,
        },
      },
      cx_exporter: {
        status: 'active',
        lastSeen: recentlyActive - 800,
        metrics: {
          rowsExported: 1523,
          filesGenerated: 3,
          lastExportTime: '2025-01-11T10:30:00Z',
        },
      },
      web_ui: {
        status: 'active',
        lastSeen: now,
        metrics: {
          activeConnections: 1,
          dataPointsCached: 500,
        },
      },
    },
    dataFlow: {
      benchlabd_to_muxd: { rate: 10, latency_ms: 5 },
      telemetryd_to_muxd: { rate: 10, latency_ms: 3 },
      pipeline_to_muxd: { rate: 30, latency_ms: 2 },
      muxd_to_prometheus: { rate: 25, latency_ms: 10 },
      muxd_to_cx_exporter: { rate: 25, latency_ms: 8 },
      muxd_to_web_ui: { rate: 25, latency_ms: 1 },
      prometheus_to_web_ui: { rate: 1, latency_ms: 50 },
    },
    devices: [
      {
        uid: 'abc123',
        name: 'benchlab-ws-01',
        status: 'active',
        calibrationValid: true,
      },
    ],
  };

  res.status(200).json(data);
}
