import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Alert from '../components/Alert';

const labels = {
  RECEIVABLE: ['Receivable', 'Money people owe you'],
  PAYABLE: ['Payable', 'Money you owe people'],
  HELD: ['Held Money', 'Money you are holding for people'],
};

export default function MoneyRecords({ category }) {
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const [records, setRecords] = useState([]);
  const [people, setPeople] = useState([]);
  const [vaults, setVaults] = useState([]);
  const [form, setForm] = useState({ personId: '', amount: '', currencyCode: 'USD', dueDate: '', description: '', vaultId: '' });
  const [payment, setPayment] = useState({ recordId: '', vaultId: '', amount: '', notes: '' });
  const [message, setMessage] = useState({});

  async function load() {
    const [r, p, v] = await Promise.all([api.get(`/money?category=${category}`), api.get('/people'), api.get('/vaults')]);
    setRecords(r.data.records); setPeople(p.data.people); setVaults(v.data.vaults);
  }
  useEffect(() => { load(); }, [category]);

  async function create(e) {
    e.preventDefault(); setMessage({});
    try { await api.post('/money', { ...form, category }); setForm({ personId: '', amount: '', currencyCode: 'USD', dueDate: '', description: '', vaultId: '' }); await load(); setMessage({ success: 'Record saved.' }); }
    catch (err) { setMessage({ error: err.response?.data?.message || 'Could not save record.' }); }
  }

  async function settle(e) {
    e.preventDefault(); setMessage({});
    try { await api.post(`/money/${payment.recordId}/payment`, payment); setPayment({ recordId: '', vaultId: '', amount: '', notes: '' }); await load(); setMessage({ success: category === 'RECEIVABLE' ? 'Payment received.' : category === 'HELD' ? 'Money released.' : 'Payment recorded.' }); }
    catch (err) { setMessage({ error: err.response?.data?.message || 'Could not record payment.' }); }
  }

  return <><PageHeader title={labels[category][0]} subtitle={admin ? `${labels[category][1]} · all staff` : `${labels[category][1]} · your records only`} /><Alert {...message} />
    <section className="two-column">
      <div className="panel"><h2>New {labels[category][0]}</h2><form className="stack-form" onSubmit={create}><label>Person<select value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })} required><option value="">Choose...</option>{people.map((p) => <option value={p.id} key={p.id}>{p.name}{admin && p.created_by_name ? ` · ${p.created_by_name}` : ''}</option>)}</select></label><label>Amount<input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label><label>Currency<input value={form.currencyCode} onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })} required /></label>{category === 'HELD' && <label>Deposit Vault<select value={form.vaultId} onChange={(e) => setForm({ ...form, vaultId: e.target.value })} required><option value="">Choose...</option>{vaults.map((v) => <option value={v.id} key={v.id}>{v.name} · {v.currency_code}{admin && v.created_by_name ? ` · ${v.created_by_name}` : ''}</option>)}</select></label>}<label>Due Date<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label><label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><button>Save</button></form></div>
      <div className="panel"><h2>{category === 'RECEIVABLE' ? 'Receive Payment' : category === 'HELD' ? 'Release Money' : 'Pay Debt'}</h2><form className="stack-form" onSubmit={settle}><label>Record<select value={payment.recordId} onChange={(e) => setPayment({ ...payment, recordId: e.target.value })} required><option value="">Choose...</option>{records.filter((r) => Number(r.remaining_amount) > 0).map((r) => <option value={r.id} key={r.id}>{r.person_name} · {r.remaining_amount} {r.currency_code}{admin && r.created_by_name ? ` · ${r.created_by_name}` : ''}</option>)}</select></label><label>Vault<select value={payment.vaultId} onChange={(e) => setPayment({ ...payment, vaultId: e.target.value })} required><option value="">Choose...</option>{vaults.map((v) => <option value={v.id} key={v.id}>{v.name} · {v.currency_code} ({v.balance}){admin && v.created_by_name ? ` · ${v.created_by_name}` : ''}</option>)}</select></label><label>Amount<input type="number" min="0.01" step="0.01" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} required /></label><label>Notes<textarea value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} /></label><button>Record</button></form></div>
    </section>
    <section className="panel"><h2>Records</h2><div className="table-wrap"><table><thead><tr><th>Person</th><th>Original</th><th>Remaining</th><th>Status</th><th>Due</th><th>Description</th>{admin && <th>Owner</th>}</tr></thead><tbody>{records.map((r) => <tr key={r.id}><td>{r.person_name}</td><td>{r.original_amount} {r.currency_code}</td><td>{r.remaining_amount} {r.currency_code}</td><td><span className="badge">{r.status}</span></td><td>{r.due_date || '-'}</td><td>{r.description || '-'}</td>{admin && <td>{r.created_by_name || 'Admin'}</td>}</tr>)}</tbody></table></div></section>
  </>;
}
