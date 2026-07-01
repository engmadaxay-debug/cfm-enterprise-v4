import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/admin-dashboard').then((r) => setData(r.data)); }, []);
  if (!data) return <Loading />;
  return <>
    <PageHeader title="Admin Dashboard" subtitle="System health, online users, login history and security alerts" />
    <section className="stats-grid">
      <div className="stat-card"><span>Online Users</span><strong>{data.onlineUsers}</strong></div>
      <div className="stat-card"><span>Today Logins</span><strong>{data.todaysLogins}</strong></div>
      <div className="stat-card"><span>Failed Logins 24h</span><strong>{data.failedLogins24h}</strong></div>
      <div className="stat-card"><span>Database</span><strong>{data.systemHealth.database}</strong></div>
    </section>
    <section className="two-column">
      <div className="panel"><h2>Users by Role</h2><div className="list-cards">{data.usersByRole.map((x) => <div key={x.role}><span>{x.role}</span><strong>{x.count}</strong></div>)}</div></div>
      <div className="panel"><h2>Latest Backup</h2>{data.latestBackup ? <p>{data.latestBackup.backup_name} · {data.latestBackup.created_at}</p> : <p>No backup yet.</p>}</div>
    </section>
    <section className="panel"><h2>Recent User Activity</h2><div className="table-wrap"><table><thead><tr><th>User</th><th>Module</th><th>Action</th><th>Date</th></tr></thead><tbody>
      {data.recentActivity.map((x, i) => <tr key={i}><td>{x.full_name}</td><td>{x.module}</td><td>{x.action}</td><td>{x.created_at}</td></tr>)}
    </tbody></table></div></section>
  </>;
}
