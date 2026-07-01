import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';
import { useAuth } from '../context/AuthContext';

export default function StaffIsolation() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [preview, setPreview] = useState(null);
  async function load() {
    const [s, p] = await Promise.all([api.get('/staff-isolation/settings'), api.get('/staff-isolation/preview')]);
    setSettings(s.data.settings); setPreview(p.data);
  }
  useEffect(() => { load(); }, []);
  if (!settings || !preview) return <Loading />;
  async function save() { await api.put('/staff-isolation/settings', settings); await load(); }
  return <>
    <PageHeader title="Staff Isolation" subtitle="User kasta wuxuu arkaa shaqadiisa; Admin ayaa arka dhammaan." />
    <section className="two-column">
      <div className="panel form-grid"><h2>Settings</h2>
        {Object.keys(settings).map((key) => <label key={key} className="check-row"><input type="checkbox" checked={Boolean(settings[key])} disabled={user?.role !== 'ADMIN'} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} /> {key.replaceAll('_', ' ')}</label>)}
        {user?.role === 'ADMIN' && <button onClick={save}>Save Settings</button>}
      </div>
      <div className="panel"><h2>My Visible Records Preview</h2><div className="list-cards">
        {Object.entries(preview.visible_if_isolated).map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}
      </div></div>
    </section>
  </>;
}
