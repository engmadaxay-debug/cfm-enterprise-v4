import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';

export default function UserDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/user-dashboard').then((r) => setData(r.data)); }, []);
  if (!data) return <Loading />;
  return <>
    <PageHeader title="My Dashboard" subtitle={data.scope === 'ALL_DATA' ? 'Admin view' : 'Shaqadayda oo keliya'} />
    <section className="stats-grid">
      <div className="stat-card"><span>My People</span><strong>{data.stats.people}</strong></div>
      <div className="stat-card"><span>My Receivables</span><strong>{data.stats.receivables}</strong></div>
      <div className="stat-card"><span>My Payables</span><strong>{data.stats.payables}</strong></div>
      <div className="stat-card"><span>Exchange Profit</span><strong>{data.stats.exchange_profit}</strong></div>
    </section>
    <section className="two-column">
      <div className="panel"><h2>Due / Overdue</h2><div className="list-cards">{data.due.map((x) => <div key={x.category}><span>{x.category}</span><strong>{x.count}</strong></div>)}</div></div>
      <div className="panel"><h2>Recent Activity</h2><div className="list-cards">{data.recentActivity.map((x, i) => <div key={i}><span>{x.module}</span><strong>{x.action}</strong><small>{x.created_at}</small></div>)}</div></div>
    </section>
  </>;
}
