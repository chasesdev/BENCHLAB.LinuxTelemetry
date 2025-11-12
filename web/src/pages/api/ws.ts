import type { NextApiRequest } from 'next';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';
import { Server as WebSocketServer, WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';

interface ExtendedServer extends HTTPServer {
  wss?: WebSocketServer;
}

interface SocketServer extends NetSocket {
  server: ExtendedServer;
}

interface ExtendedNextApiResponse {
  socket: SocketServer;
}

let wss: WebSocketServer | null = null;
let watchInterval: NodeJS.Timeout | null = null;
let lastPosition = 0;

// Path to the latency.jsonl file
const getDataPath = () => {
  const dataRoot = process.env.BENCHLAB_DATA_ROOT || '/var/log/benchlab';
  // Find the most recent session directory
  const sessionsDir = path.join(dataRoot, 'sessions');

  try {
    if (!fs.existsSync(sessionsDir)) {
      return null;
    }

    const sessions = fs.readdirSync(sessionsDir);
    if (sessions.length === 0) {
      return null;
    }

    // Sort by name (which includes timestamp) and get the latest
    const latestSession = sessions.sort().reverse()[0];
    const latencyFile = path.join(sessionsDir, latestSession, 'aligned', 'latency.jsonl');

    if (fs.existsSync(latencyFile)) {
      return latencyFile;
    }
  } catch (error) {
    console.error('Error finding data path:', error);
  }

  return null;
};

// Watch for new lines in the JSONL file and broadcast to all connected clients
const startWatching = () => {
  if (watchInterval) {
    return; // Already watching
  }

  watchInterval = setInterval(() => {
    const dataPath = getDataPath();
    if (!dataPath || !wss) {
      return;
    }

    try {
      const stats = fs.statSync(dataPath);

      // If file was rotated (size decreased), reset position
      if (stats.size < lastPosition) {
        lastPosition = 0;
      }

      // If file grew, read new content
      if (stats.size > lastPosition) {
        const stream = fs.createReadStream(dataPath, {
          start: lastPosition,
          encoding: 'utf8',
        });

        let buffer = '';
        stream.on('data', (chunk) => {
          buffer += chunk;
          const lines = buffer.split('\n');

          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          // Process complete lines
          lines.forEach(line => {
            if (line.trim()) {
              try {
                const record = JSON.parse(line);

                // Transform to telemetry data point format
                const dataPoint = {
                  t: record.ts_aligned_ns / 1e9, // Convert ns to seconds
                  lat_ms: record.kv?.lat_ms || 0,
                  power_w: record.kv?.power_w || null,
                  timestamp: Date.now(),
                };

                // Broadcast to all connected clients
                wss?.clients.forEach((client) => {
                  if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                      type: 'data',
                      payload: dataPoint,
                    }));
                  }
                });
              } catch (parseError) {
                console.error('Error parsing JSON line:', parseError);
              }
            }
          });
        });

        stream.on('end', () => {
          lastPosition = stats.size;
        });

        stream.on('error', (error) => {
          console.error('Error reading file:', error);
        });
      }
    } catch (error) {
      console.error('Error watching file:', error);
    }
  }, 100); // Check every 100ms for new data
};

const stopWatching = () => {
  if (watchInterval) {
    clearInterval(watchInterval);
    watchInterval = null;
  }
};

export default function handler(req: NextApiRequest, res: ExtendedNextApiResponse) {
  if (!res.socket.server.wss) {
    console.log('* Initializing WebSocket server...');

    // Create WebSocket server
    wss = new WebSocketServer({ noServer: true });

    res.socket.server.wss = wss;

    // Handle HTTP upgrade to WebSocket
    res.socket.server.on('upgrade', (request, socket, head) => {
      if (request.url === '/api/ws') {
        wss?.handleUpgrade(request, socket, head, (ws) => {
          wss?.emit('connection', ws, request);
        });
      }
    });

    // Handle WebSocket connections
    wss.on('connection', (ws: WebSocket) => {
      console.log('* Client connected to WebSocket');

      // Start watching file when first client connects
      if (wss && wss.clients.size === 1) {
        startWatching();
        console.log('* Started watching for file updates');
      }

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket connection established',
      }));

      // Handle client messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());

          // Handle ping/pong for keep-alive
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          console.error('Error handling client message:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log('* Client disconnected from WebSocket');

        // Stop watching if no clients connected
        if (wss && wss.clients.size === 0) {
          stopWatching();
          console.log('* Stopped watching for file updates');
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.log('* WebSocket server initialized');
  }

  // Send response to acknowledge the API route exists
  res.status(200).json({
    message: 'WebSocket server is running',
    upgrade: 'Use WebSocket protocol to connect',
  });
}
