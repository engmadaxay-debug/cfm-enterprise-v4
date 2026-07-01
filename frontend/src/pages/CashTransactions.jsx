import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Alert from '../components/Alert';

export default function CashTransactions({ type }) {
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const isIncome = type === 'INCOME';
  const [transactions, setTransactions] = useState([]);
  const [vaults, setVaults] = useState([]);
  const [people, setPeople] = useState([]);
  const [form, setForm] = useState({ category: '', amount: '', vaultId: '', personId: '', transactionDate: new Date().toISOString().slice(0, 10), description: '' });
  const [message, setMessage] = useState({});
  async function load() {
    const [t, v, p] = await Promise.all([api.get(`/cash?type=${type}`), api.get('/vaults'), api.get('/people')]);
    setTransactions(t.data.transactions); setVaults(v.data.vaults); setPeople(p.data.people);
  }
  useEffect(() => { load(); }, [type]);
  async function submit(e) {
    e.preventDefault(); setMessage({});
    try { await api.post('/cash', { ...form, transactionType: type }); setForm({ category: '', amount: '', vaultId: '', personId: '', transactionDate: new Date().toISOString().slice(0, 10), description: '' }); await load(); setMessage({ success: `${isIncome ? 'Income' : 'Expense'} saved.` }); }
    catch (err) { setMessage({ error: err.response?.data?.message || 'Could not save transaction.' }); }
  }
  return <><PageHeader title={isIncome ? 'Income' : 'Expenses'} subtitle={admin ? 'All staff transactions' : 'Only transactions entered by you'} /><Alert {...message} />
    <section className="panel"><h2>New {isIncome ? 'Income' : 'Expense'}</h2><form className="form-grid" onSubmit={submit}><label>Category<input placeholder={isIncome ? 'Exchange fee, service...' : 'Rent, fuel, salary...'} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required /></label><label>Amount<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label><label>Vault<select value={form.vaultId} onChange={(e) => setForm({ ...form, vaultId: e.target.value })} required><option value="">Choose...</option>{vaults.map((v) => <option value={v.id} key={v.id}>{v.name} · {v.currency_code} ({v.balance}){admin && v.created_by_name ? ` · ${v.created_by_name}` : ''}</option>)}</select></label><label>Person (optional)<select value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })}><option value="">None</option>{people.map((p) => <option value={p.id} key={p.id}>{p.name}{admin && p.created_by_name ? ` · ${p.created_by_name}` : ''}</option>)}</select></label><label>Date<input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} required /></label><label className="full">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><div className="form-actions"><button>Save</button></div></form></section>
    <section className="panel"><h2>History</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Person</th><th>Vault</th><th>Amount</th><th>Description</th>{admin && <th>Owner</th>}</tr></thead><tbody>{transactions.map((t) => <tr key={t.id}><td>{t.transaction_date}</td><td>{t.category}</td><td>{t.person_name || '-'}</td><td>{t.vault_name} · {t.currency_code}</td><td>{t.amount}</td><td>{t.description || '-'}</td>{admin && <td>{t.created_by_name || 'Admin'}</td>}</tr>)}</tbody></table></div></section>
  </>;
}
