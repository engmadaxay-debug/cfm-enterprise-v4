import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Alert from '../components/Alert';

export default function Exchange() {
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const [vaults, setVaults] = useState([]);
  const [people, setPeople] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rates, setRates] = useState([]);
  const [rateForm, setRateForm] = useState({ fromCurrency: 'USD', toCurrency: 'CAD', rate: '' });
  const [form, setForm] = useState({ personId: '', fromVaultId: '', toVaultId: '', fromAmount: '', rate: '', costRate: '', fee: 0, notes: '' });
  const [message, setMessage] = useState({});

  async function load() {
    const [v, p, t, r] = await Promise.all([api.get('/vaults'), api.get('/people'), api.get('/exchange/transactions'), api.get('/exchange/rates')]);
    setVaults(v.data.vaults); setPeople(p.data.people); setTransactions(t.data.transactions); setRates(r.data.rates);
  }
  useEffect(() => { load(); }, []);

  async function saveRate(e) {
    e.preventDefault(); setMessage({});
    try { await api.post('/exchange/rates', rateForm); setRateForm({ ...rateForm, rate: '' }); await load(); setMessage({ success: 'Exchange rate saved.' }); }
    catch (err) { setMessage({ error: err.response?.data?.message || 'Could not save rate.' }); }
  }

  async function exchange(e) {
    e.preventDefault(); setMessage({});
    try { await api.post('/exchange/transactions', form); setForm({ personId: '', fromVaultId: '', toVaultId: '', fromAmount: '', rate: '', costRate: '', fee: 0, notes: '' }); await load(); setMessage({ success: 'Exchange completed.' }); }
    catch (err) { setMessage({ error: err.response?.data?.message || 'Exchange failed.' }); }
  }

  const expected = form.fromAmount && form.rate ? Math.max(0, Number(form.fromAmount) * Number(form.rate) - Number(form.fee || 0)).toFixed(2) : '0.00';
  return <><PageHeader title="Exchange" subtitle={admin ? 'All exchange activity' : 'Only your exchange activity'} /><Alert {...message} />
    <section className="two-column">
      <div className="panel"><h2>{admin ? 'Save Rate' : 'Current Rates'}</h2>
        {admin && <form className="stack-form" onSubmit={saveRate}><label>From<input value={rateForm.fromCurrency} onChange={(e) => setRateForm({ ...rateForm, fromCurrency: e.target.value.toUpperCase() })} /></label><label>To<input value={rateForm.toCurrency} onChange={(e) => setRateForm({ ...rateForm, toCurrency: e.target.value.toUpperCase() })} /></label><label>Rate<input type="number" step="0.000001" min="0.000001" value={rateForm.rate} onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })} required /></label><button>Save Rate</button></form>}
        <div className="mini-list">{rates.map((r) => <div key={r.id}>{r.from_currency} → {r.to_currency}: <strong>{r.rate}</strong></div>)}</div>
      </div>
      <div className="panel"><h2>New Exchange</h2><form className="stack-form" onSubmit={exchange}><label>Person (optional)<select value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })}><option value="">None</option>{people.map((p) => <option value={p.id} key={p.id}>{p.name}{admin && p.created_by_name ? ` · ${p.created_by_name}` : ''}</option>)}</select></label><label>Customer Gives Into Vault<select value={form.fromVaultId} onChange={(e) => setForm({ ...form, fromVaultId: e.target.value })} required><option value="">Choose...</option>{vaults.map((v) => <option value={v.id} key={v.id}>{v.name} · {v.currency_code} ({v.balance}){admin && v.created_by_name ? ` · ${v.created_by_name}` : ''}</option>)}</select></label><label>Customer Receives From Vault<select value={form.toVaultId} onChange={(e) => setForm({ ...form, toVaultId: e.target.value })} required><option value="">Choose...</option>{vaults.map((v) => <option value={v.id} key={v.id}>{v.name} · {v.currency_code}{admin && v.created_by_name ? ` · ${v.created_by_name}` : ''}</option>)}</select></label><label>Customer Gives Amount<input type="number" step="0.01" min="0.01" value={form.fromAmount} onChange={(e) => setForm({ ...form, fromAmount: e.target.value })} required /></label><label>Sell Rate<input type="number" step="0.000001" min="0.000001" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} required /></label><label>Cost Rate<input type="number" step="0.000001" min="0.000001" value={form.costRate} onChange={(e) => setForm({ ...form, costRate: e.target.value })} placeholder="Optional; used for profit" /></label><label>Fee<input type="number" step="0.01" min="0" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} /></label><div className="calculation">Customer receives: <strong>{expected}</strong><br/>Estimated profit: <strong>{form.fromAmount && form.rate ? (((Number(form.rate)-Number(form.costRate||form.rate))*Number(form.fromAmount))+Number(form.fee||0)).toFixed(2) : '0.00'}</strong></div><label>Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label><button>Complete Exchange</button></form></div>
    </section>
    <section className="panel"><h2>Exchange History</h2><div className="table-wrap"><table><thead><tr><th>Ref</th><th>Date</th><th>Person</th><th>From</th><th>To</th><th>Rate</th><th>Cost</th><th>Fee</th><th>Profit</th>{admin && <th>Owner</th>}</tr></thead><tbody>{transactions.map((t) => <tr key={t.id}><td>{t.reference_no||'-'}</td><td>{new Date(t.created_at).toLocaleDateString()}</td><td>{t.person_name || '-'}</td><td>{t.from_amount} · {t.from_vault}</td><td>{t.to_amount} · {t.to_vault}</td><td>{t.rate}</td><td>{t.cost_rate||'-'}</td><td>{t.fee}</td><td>{Number(t.profit_amount||0).toFixed(2)} {t.profit_currency||''}</td>{admin && <td>{t.created_by_name || 'Admin'}</td>}</tr>)}</tbody></table></div></section>
  </>;
}
