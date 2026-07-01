import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';

export default function Security() {
  const [data, setData] = useState(null);
  useEffect(() => { Promise.all([api.get('/security/login-history'), api.get('/security/sessions')]).then(([h, s]) => setData({ history: h.data, sessions: s.data })); }, []);
  if (!data) return <Loading />;
  return <>
    <PageHeader title="Security" subtitle="Login history, active sessions, and device tracking" />
    <section className="two-column">
      <div className="panel"><h2>Login History</h2><div className="table-wrap"><table><thead><tr><th>Email</th><th>Status</th><th>IP</th><th>Date</th></tr></thead><tbody>
        {data.history.history.map((x) => <tr key={x.id}><td>{x.email}</td><td><span className="badge">{x.success ? 'SUCCESS' : 'FAILED'}</span></td><td>{x.ip_address}</td><td>{x.created_at}</td></tr>)}
      </tbody></table></div></div>
      <div className="panel"><h2>Sessions</h2><div className="table-wrap"><table><thead><tr><th>User</th><th>Active</th><th>Last Seen</th></tr></thead><tbody>
        {data.sessions.sessions.map((x) => <tr key={x.id}><td>{x.full_name}</td><td>{String(x.is_active)}</td><td>{x.last_seen_at}</td></tr>)}
      </tbody></table></div></div>
    </section>
  </>;
}
