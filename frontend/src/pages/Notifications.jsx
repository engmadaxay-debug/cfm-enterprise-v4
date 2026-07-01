import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';

export default function Notifications() {
  const [data, setData] = useState(null);
  async function load() { const r = await api.get('/notifications'); setData(r.data); }
  useEffect(() => { load(); }, []);
  if (!data) return <Loading />;
  return <>
    <PageHeader title="Notifications" subtitle={`${data.unreadCount} unread · ${data.scope === 'ALL_DATA' ? 'All staff' : 'My records only'}`} />
    <section className="panel"><div className="list-cards">
      {data.notifications.map((n, i) => <div key={n.id || i}><span>{n.notification_type} · {n.priority}</span><strong>{n.title}</strong><small>{n.message}</small></div>)}
      {!data.notifications.length && <p>No notifications.</p>}
    </div></section>
  </>;
}
