import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Alert from '../components/Alert';

const empty = { fullName: '', email: '', password: '' };

export default function Staff() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState({});

  async function load() {
    setUsers((await api.get('/users')).data.users);
  }
  useEffect(() => { if (user?.role === 'ADMIN') load(); }, [user]);

  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;

  async function create(e) {
    e.preventDefault(); setMessage({});
    try {
      await api.post('/users', form);
      setForm(empty); await load();
      setMessage({ success: 'Staff account created.' });
    } catch (err) {
      setMessage({ error: err.response?.data?.message || 'Could not create staff account.' });
    }
  }

  async function toggle(account) {
    setMessage({});
    try {
      await api.patch(`/users/${account.id}/status`, { isActive: !account.is_active });
      await load();
      setMessage({ success: account.is_active ? 'Staff account disabled.' : 'Staff account enabled.' });
    } catch (err) {
      setMessage({ error: err.response?.data?.message || 'Could not update account.' });
    }
  }

  async function resetPassword(account) {
    const password = window.prompt(`New password for ${account.full_name} (minimum 8 characters):`);
    if (!password) return;
    setMessage({});
    try {
      await api.patch(`/users/${account.id}/password`, { password });
      setMessage({ success: 'Password changed successfully.' });
    } catch (err) {
      setMessage({ error: err.response?.data?.message || 'Could not change password.' });
    }
  }

  return <>
    <PageHeader title="Staff Accounts" subtitle="Each staff member sees only their own records and vaults" />
    <Alert {...message} />
    <section className="panel">
      <h2>Add Staff Member</h2>
      <form className="form-grid" onSubmit={create}>
        <label>Full Name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Password<input type="password" minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        <div className="form-actions"><button>Create Staff Login</button></div>
      </form>
    </section>
    <section className="panel">
      <h2>Users</h2>
      <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>
        {users.map((account) => <tr key={account.id}>
          <td>{account.full_name}</td><td>{account.email}</td><td>{account.role}</td>
          <td><span className={`badge ${account.is_active ? 'active' : 'disabled'}`}>{account.is_active ? 'ACTIVE' : 'DISABLED'}</span></td>
          <td className="actions">{account.role === 'STAFF' && <><button className="small ghost" onClick={() => resetPassword(account)}>Reset Password</button><button className="small ghost danger" onClick={() => toggle(account)}>{account.is_active ? 'Disable' : 'Enable'}</button></>}</td>
        </tr>)}
      </tbody></table></div>
    </section>
  </>;
}
