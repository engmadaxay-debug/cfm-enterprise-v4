import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Alert from '../components/Alert';

const empty = { name: '', phone: '', email: '', personType: 'CUSTOMER', notes: '' };

export default function People() {
  const { user } = useAuth();
  const admin = user?.role === 'ADMIN';
  const [people, setPeople] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState({});

  async function load() { setPeople((await api.get('/people')).data.people); }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault(); setMessage({});
    try {
      if (editingId) await api.put(`/people/${editingId}`, form); else await api.post('/people', form);
      setForm(empty); setEditingId(null); await load(); setMessage({ success: 'Saved successfully.' });
    } catch (err) { setMessage({ error: err.response?.data?.message || 'Could not save.' }); }
  }

  function edit(person) {
    setEditingId(person.id);
    setForm({ name: person.name, phone: person.phone || '', email: person.email || '', personType: person.person_type, notes: person.notes || '' });
  }

  async function remove(id) {
    if (!confirm('Delete this person?')) return;
    try { await api.delete(`/people/${id}`); await load(); }
    catch (err) { setMessage({ error: err.response?.data?.message || 'This person has linked records.' }); }
  }

  return <>
    <PageHeader title="People" subtitle={admin ? 'All customers, vendors and agents' : 'Only the people saved by you'} />
    <Alert {...message} />
    <section className="panel"><h2>{editingId ? 'Edit Person' : 'Add Person'}</h2>
      <form className="form-grid" onSubmit={submit}>
        <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Type<select value={form.personType} onChange={(e) => setForm({ ...form, personType: e.target.value })}><option>CUSTOMER</option><option>VENDOR</option><option>AGENT</option><option>OTHER</option></select></label>
        <label className="full">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <div className="form-actions"><button>{editingId ? 'Update' : 'Save'}</button>{editingId && <button type="button" className="ghost" onClick={() => { setEditingId(null); setForm(empty); }}>Cancel</button>}</div>
      </form>
    </section>
    <section className="panel"><h2>People List</h2><div className="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Phone</th><th>Email</th>{admin && <th>Owner</th>}<th></th></tr></thead><tbody>
      {people.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.person_type}</td><td>{p.phone}</td><td>{p.email}</td>{admin && <td>{p.created_by_name || 'Admin'}</td>}<td className="actions"><button className="small ghost" onClick={() => edit(p)}>Edit</button><button className="small ghost danger" onClick={() => remove(p.id)}>Delete</button></td></tr>)}
    </tbody></table></div></section>
  </>;
}
