import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';

export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/reports/dashboard').then((r) => setData(r.data)); }, []);
  if (!data) return <Loading />;

  const cashMap = Object.fromEntries(data.currentMonthCash.map((x) => [x.transaction_type, x.total]));
  return <>
    <PageHeader title="Dashboard" subtitle={data.scope === 'ALL_DATA' ? 'Overview of all staff activity' : 'Overview of your activity only'} />
    <section className="stats-grid">
      <div className="stat-card"><span>People</span><strong>{data.peopleCount}</strong></div>
      <div className="stat-card"><span>Monthly Income</span><strong>{cashMap.INCOME || '0.00'}</strong></div>
      <div className="stat-card"><span>Monthly Expenses</span><strong>{cashMap.EXPENSE || '0.00'}</strong></div>
    </section>
    <section className="two-column">
      <div className="panel"><h2>Vault Balances</h2><div className="list-cards">{data.vaultBalances.map((x) => <div key={x.currency_code}><span>{x.currency_code}</span><strong>{x.balance}</strong></div>)}</div></div>
      <div className="panel"><h2>Outstanding</h2><div className="list-cards">{data.outstanding.map((x) => <div key={`${x.category}-${x.currency_code}`}><span>{x.category} · {x.currency_code}</span><strong>{x.total}</strong></div>)}</div></div>
    </section>
    <section className="panel"><h2>Recent Income & Expenses</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th></tr></thead><tbody>
      {data.recentTransactions.map((x) => <tr key={x.id}><td>{x.transaction_date}</td><td><span className={`badge ${x.transaction_type.toLowerCase()}`}>{x.transaction_type}</span></td><td>{x.category}</td><td>{x.amount} {x.currency_code}</td></tr>)}
    </tbody></table></div></section>
  </>;
}
