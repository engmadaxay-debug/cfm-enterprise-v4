import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';

export default function ActivityLog() {
  const [data, setData] = useState(null);
  useEffect(()=>{ api.get('/activity').then(r=>setData(r.data.activities)); },[]);
  if (!data) return <Loading />;
  return <>
    <PageHeader title="Activity Log" subtitle="Wax kasta oo user-ku sameeyo halkan ayaa laga eegi karaa." />
    <section className="panel"><div className="table-wrap"><table><thead><tr><th>Date</th><th>User</th><th>Module</th><th>Action</th><th>Details</th></tr></thead><tbody>
      {data.map(x=><tr key={x.id}><td>{new Date(x.created_at).toLocaleString()}</td><td>{x.user_name || 'System'}</td><td>{x.module}</td><td>{x.action}</td><td><code>{JSON.stringify(x.details || {})}</code></td></tr>)}
    </tbody></table></div></section>
  </>;
}
