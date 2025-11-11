import { useEffect, useState } from 'react';

type LatencyRow = { t: number; lat_ms: number; power_w?: number };

export default function Home() {
  const [rows, setRows] = useState<LatencyRow[]>([]);

  useEffect(() => {
    const iv = setInterval(async () => {
      const r = await fetch('/api/live').then(r => r.json());
      setRows(r.rows || []);
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <main style={{padding:24, fontFamily:'system-ui'}}>
      <h2>Vantage Pipeline — Live Latency</h2>
      <p>Shows last 60s aggregated from muxd output.</p>
      <table>
        <thead><tr><th>t (s)</th><th>latency (ms)</th><th>power (W)</th></tr></thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}><td>{r.t.toFixed(2)}</td><td>{r.lat_ms.toFixed(2)}</td><td>{r.power_w?.toFixed(1) ?? ''}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
