import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Alert from '../components/Alert';

export default function Reports() {
  const today = new Date().toISOString().slice(0, 10);
  const first = `${today.slice(0, 8)}01`;
  const [range, setRange] = useState({ from: first, to: today });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try { setData((await api.get('/reports/summary', { params: range })).data); }
    catch (err) { setError(err.response?.data?.message || 'Could not load report.'); }
  }
  useEffect(() => { load(); }, []);

  function printReport() { window.print(); }

  return <><PageHeader title="Reports" subtitle={data?.scope === 'MY_DATA' ? 'Your financial summary only' : 'Financial summary for all staff'} /><Alert error={error} />
    <section className="panel no-print"><form className="inline-form" onSubmit={(e) => { e.preventDefault(); load(); }}><label>From<input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label><label>To<input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label><button>Run Report</button><button type="button" className="ghost" onClick={printReport}>Print / Save PDF</button></form></section>
    {data && <>
      <section className="two-column"><div className="panel"><h2>Income & Expenses</h2><div className="list-cards">{data.cash.map((x, i) => <div key={i}><span>{x.transaction_type} · {x.currency_code}</span><strong>{x.total}</strong></div>)}</div></div><div className="panel"><h2>Outstanding</h2><div className="list-cards">{data.outstanding.map((x, i) => <div key={i}><span>{x.category} · {x.currency_code}</span><strong>{x.total}</strong></div>)}</div></div></section>
      <section className="panel"><h2>Vault Balances</h2><div className="table-wrap"><table><thead><tr><th>Vault</th><th>Currency</th><th>Balance</th>{data.scope === 'ALL_DATA' && <th>Owner</th>}</tr></thead><tbody>{data.vaults.map((v, i) => <tr key={`${v.name}-${v.currency_code}-${i}`}><td>{v.name}</td><td>{v.currency_code}</td><td>{v.balance}</td>{data.scope === 'ALL_DATA' && <td>{v.created_by_name || 'Admin'}</td>}</tr>)}</tbody></table></div></section>
      <section className="panel"><h2>Exchange Summary</h2><div className="table-wrap"><table><thead><tr><th>Pair</th><th>Sold</th><th>Bought</th><th>Fees</th></tr></thead><tbody>{data.exchange.map((x, i) => <tr key={i}><td>{x.from_currency} → {x.to_currency}</td><td>{x.sold}</td><td>{x.bought}</td><td>{x.fees}</td></tr>)}</tbody></table></div></section>
    </>}
  </>;
}
