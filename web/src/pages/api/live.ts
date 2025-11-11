import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const dataRoot = process.env.BENCHLAB_DATA_ROOT || '/var/log/benchlab';
  const session = process.env.BENCHLAB_SESSION || 'dev';
  const latFile = path.join(dataRoot, 'sessions', session, 'aligned', 'latency.jsonl');
  let rows: any[] = [];
  try {
    const text = fs.readFileSync(latFile, 'utf8');
    const lines = text.trim().split('\n').slice(-300); // last N rows
    rows = lines.map(l => JSON.parse(l)).map((r:any, i:number) => ({
      t: (r.ts_aligned_ns - (r.ts_aligned_ns - 60_000_000_000))/1e9, // dummy relative
      lat_ms: r.kv.lat_ms,
      power_w: r.kv.power_w
    }));
  } catch(e) {}
  res.status(200).json({ rows });
}
