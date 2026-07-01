import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';

export default function DashboardStats() {
  const [data, setData] = useState(null);
  useEffect(()=>{ api.get('/dashboard-stats').then(r=>setData(r.data)); },[]);
  if (!data) return <Loading />;
  return <>
    <PageHeader title="Dashboard Statistics" subtitle="Charts iyo statistics fudud oo muujinaya xaaladda system-ka." />
    <section className="stats-grid">
      <div className="stat-card"><span>Month Exchange Profit</span><strong>{data.monthExchangeProfit}</strong></div>
      <div className="stat-card"><span>Scope</span><strong>{data.scope}</strong></div>
      <div className="stat-card"><span>Recent Activities</span><strong>{data.activities.length}</strong></div>
    </section>
    <section className="two-column">
      <div className="panel"><h2>People</h2>{data.people.map(x=><div className="bar-row" key={x.person_type}><span>{x.person_type}</span><progress value={x.total} max={Math.max(...data.people.map(p=>p.total),1)} /><strong>{x.total}</strong></div>)}</div>
      <div className="panel"><h2>Vault Balances</h2>{data.vaults.map(x=><div className="list-line" key={x.currency_code}><span>{x.currency_code}</span><strong>{x.total}</strong></div>)}</div>
    </section>
    <section className="panel"><h2>Journal by Module</h2><div className="table-wrap"><table><thead><tr><th>Module</th><th>Transactions</th><th>Amount</th></tr></thead><tbody>{data.journal.map(x=><tr key={x.module}><td>{x.module}</td><td>{x.total}</td><td>{x.amount}</td></tr>)}</tbody></table></div></section>
  </>;
}
