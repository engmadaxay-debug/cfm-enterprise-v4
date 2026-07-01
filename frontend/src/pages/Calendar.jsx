import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';

export default function Calendar() {
  const [view, setView] = useState('daily');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ event_title: '', event_date: new Date().toISOString().slice(0, 10), event_type: 'REMINDER', priority: 'MEDIUM' });

  async function load() {
    const r = await api.get('/calendar', { params: { view, date } });
    setData(r.data);
  }
  useEffect(() => { load(); }, [view, date]);

  async function addEvent(e) {
    e.preventDefault();
    await api.post('/calendar/events', form);
    setForm({ ...form, event_title: '' });
    await load();
  }

  const dueReceivables = useMemo(() => (data?.due || []).filter((x) => x.category === 'RECEIVABLE'), [data]);
  const duePayables = useMemo(() => (data?.due || []).filter((x) => x.category === 'PAYABLE'), [data]);
  if (!data) return <Loading />;

  return <>
    <PageHeader title="Calendar" subtitle={`${data.from} → ${data.to} · ${data.scope === 'ALL_DATA' ? 'All staff' : 'My records only'}`} />
    <section className="panel toolbar">
      <select value={view} onChange={(e) => setView(e.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
    </section>
    <section className="stats-grid">
      <div className="stat-card"><span>Due Receivables</span><strong>{dueReceivables.length}</strong></div>
      <div className="stat-card"><span>Due Payables</span><strong>{duePayables.length}</strong></div>
      <div className="stat-card"><span>Overdue</span><strong>{data.overdue.length}</strong></div>
      <div className="stat-card"><span>Reminders</span><strong>{data.reminders.length}</strong></div>
    </section>
    <section className="two-column">
      <div className="panel"><h2>Due in selected period</h2><Table rows={data.due} /></div>
      <div className="panel"><h2>Overdue</h2><Table rows={data.overdue} /></div>
    </section>
    <section className="two-column">
      <div className="panel"><h2>Closing Reminders</h2><div className="list-cards">{data.reminders.map((x, i) => <div key={i}><span>{x.type}</span><strong>{x.title}</strong><small>{x.due_date}</small></div>)}</div></div>
      <form className="panel form-grid" onSubmit={addEvent}><h2>New Reminder</h2>
        <input placeholder="Reminder title" value={form.event_title} onChange={(e) => setForm({ ...form, event_title: e.target.value })} required />
        <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required />
        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select>
        <button>Add Reminder</button>
      </form>
    </section>
  </>;
}

function Table({ rows }) {
  return <div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Person</th><th>Amount</th><th>Status</th></tr></thead><tbody>
    {rows.map((x) => <tr key={`${x.category}-${x.id}`}><td>{String(x.due_date).slice(0, 10)}</td><td>{x.category}</td><td>{x.person_name}</td><td>{x.amount} {x.currency_code}</td><td><span className="badge">{x.status}</span></td></tr>)}
    {!rows.length && <tr><td colSpan="5">No records found.</td></tr>}
  </tbody></table></div>;
}
