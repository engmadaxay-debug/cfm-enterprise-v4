import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

export default function Production() {
  const [health, setHealth] = useState(null);
  const [config, setConfig] = useState(null);
  const [backups, setBackups] = useState([]);
  const [message, setMessage] = useState('');

  const load = async () => {
    const [h, c, b] = await Promise.all([
      api.get('/phase6/health/production'),
      api.get('/phase6/config-check'),
      api.get('/phase6/backups')
    ]);
    setHealth(h.data.data || h.data);
    setConfig(c.data.data || c.data);
    setBackups(b.data.data || []);
  };

  useEffect(() => { load().catch(() => setMessage('Production status loading failed.')); }, []);

  const runBackup = async () => {
    setMessage('');
    try {
      await api.post('/phase6/backup/run', {});
      setMessage('Backup marker created successfully.');
      load();
    } catch { setMessage('Backup failed.'); }
  };

  return <div>
    <PageHeader title="Phase 6 Production" subtitle="Security, cloud readiness, backups, API docs, Docker and deployment checks." />
    {message && <div className="alert">{message}</div>}
    <div className="grid two">
      <section className="card"><h3>Production Health</h3><pre>{JSON.stringify(health, null, 2)}</pre></section>
      <section className="card"><h3>Config Check</h3><pre>{JSON.stringify(config, null, 2)}</pre></section>
    </div>
    <section className="card"><h3>Backups</h3><button onClick={runBackup}>Run Backup Check</button><table><thead><tr><th>Name</th><th>Status</th><th>Date</th></tr></thead><tbody>{backups.map(b => <tr key={b.id}><td>{b.backup_name}</td><td>{b.status}</td><td>{new Date(b.created_at).toLocaleString()}</td></tr>)}</tbody></table></section>
    <section className="card"><h3>API Documentation</h3><p>Swagger JSON: <code>/api/phase6/swagger.json</code></p></section>
  </div>;
}
