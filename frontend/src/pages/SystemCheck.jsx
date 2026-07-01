import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

export default function SystemCheck() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const res = await api.get('/system/diagnostics');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'System check failed. Make sure backend and database are running.');
    }
  }

  useEffect(() => { load(); }, []);

  return <div>
    <PageHeader title="System Check" subtitle="Phase 4 final diagnostics and installation verification" />
    {error && <div className="alert error">{error}</div>}
    {data && <>
      <div className="grid cards">
        <div className="card"><small>Status</small><strong>{data.status}</strong></div>
        <div className="card"><small>Version</small><strong>{data.version}</strong></div>
        <div className="card"><small>Required Tables</small><strong>{data.database.requiredTables}</strong></div>
        <div className="card"><small>Missing Tables</small><strong>{data.database.missingTables.length}</strong></div>
      </div>
      {data.database.missingTables.length > 0 && <div className="card danger-card"><h3>Missing tables</h3><p>{data.database.missingTables.join(', ')}</p></div>}
      <div className="card"><h3>Table Counts</h3><div className="table-wrap"><table><thead><tr><th>Table</th><th>Rows</th></tr></thead><tbody>{Object.entries(data.database.tableCounts).map(([name,count]) => <tr key={name}><td>{name}</td><td>{count}</td></tr>)}</tbody></table></div></div>
      <div className="card"><h3>Number Sequences</h3><div className="table-wrap"><table><thead><tr><th>Key</th><th>Prefix</th><th>Current</th></tr></thead><tbody>{data.database.sequences.map((seq) => <tr key={seq.sequence_key}><td>{seq.sequence_key}</td><td>{seq.prefix}</td><td>{seq.current_value}</td></tr>)}</tbody></table></div></div>
      <button onClick={load}>Run Check Again</button>
    </>}
  </div>;
}
