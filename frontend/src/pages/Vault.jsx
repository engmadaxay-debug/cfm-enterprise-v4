import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Alert from '../components/Alert';

export default function Vault() {
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const [vaults, setVaults] = useState([]);
  const [form, setForm] = useState({ name: 'Main Cash', currencyCode: '', openingBalance: 0 });
  const [adjust, setAdjust] = useState({ vaultId: '', amount: '', direction: 'IN' });
  const [message, setMessage] = useState({});
  async function load() { setVaults((await api.get('/vaults')).data.vaults); }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault(); setMessage({});
    try { await api.post('/vaults', form); setForm({ name: 'Main Cash', currencyCode: '', openingBalance: 0 }); await load(); setMessage({ success: 'Vault created.' }); }
    catch (err) { setMessage({ error: err.response?.data?.message || 'Could not create vault.' }); }
  }

  async function changeBalance(e) {
    e.preventDefault(); setMessage({});
    try { await api.post('/vaults/adjust', adjust); setAdjust({ vaultId: '', amount: '', direction: 'IN' }); await load(); setMessage({ success: 'Vault balance updated.' }); }
    catch (err) { setMessage({ error: err.response?.data?.message || 'Could not update vault.' }); }
  }

  return <><PageHeader title="Vault" subtitle={admin ? 'All staff cash and currency balances' : 'Only your cash and currency balances'} /><Alert {...message} />
    <section className="stats-grid">{vaults.map((v) => <div className="stat-card" key={v.id}><span>{v.name} · {v.currency_code}{admin && v.created_by_name ? ` · ${v.created_by_name}` : ''}</span><strong>{v.balance}</strong></div>)}</section>
    <section className="two-column">
      <div className="panel"><h2>Add Vault</h2><form className="stack-form" onSubmit={create}><label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Currency<input placeholder="USD" value={form.currencyCode} onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })} required /></label><label>Opening Balance<input type="number" step="0.01" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} /></label><button>Save Vault</button></form></div>
      <div className="panel"><h2>Manual Adjustment</h2><form className="stack-form" onSubmit={changeBalance}><label>Vault<select value={adjust.vaultId} onChange={(e) => setAdjust({ ...adjust, vaultId: e.target.value })} required><option value="">Choose...</option>{vaults.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.currency_code}{admin && v.created_by_name ? ` · ${v.created_by_name}` : ''}</option>)}</select></label><label>Direction<select value={adjust.direction} onChange={(e) => setAdjust({ ...adjust, direction: e.target.value })}><option value="IN">Money In</option><option value="OUT">Money Out</option></select></label><label>Amount<input type="number" min="0.01" step="0.01" value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })} required /></label><button>Update Balance</button></form></div>
    </section>
  </>;
}
