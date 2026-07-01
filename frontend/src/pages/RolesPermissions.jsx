import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Loading from '../components/Loading';

export default function RolesPermissions() {
  const [data, setData] = useState(null);
  useEffect(()=>{ api.get('/admin/roles').then(r=>setData(r.data)); },[]);
  if (!data) return <Loading />;
  return <>
    <PageHeader title="Roles & Permissions" subtitle="Admin, Manager, Accountant, Cashier, Auditor iyo Staff permissions." />
    <section className="panel"><h2>Roles</h2><div className="table-wrap"><table><thead><tr><th>Role</th><th>Name</th><th>Description</th></tr></thead><tbody>{data.roles.map(r=><tr key={r.role_key}><td>{r.role_key}</td><td>{r.role_name}</td><td>{r.description}</td></tr>)}</tbody></table></div></section>
    <section className="panel"><h2>Permissions</h2><div className="table-wrap"><table><thead><tr><th>Role</th><th>Module</th><th>View</th><th>Create</th><th>Update</th><th>Delete</th><th>Export</th></tr></thead><tbody>{data.permissions.map(p=><tr key={p.id}><td>{p.role_key}</td><td>{p.module_key}</td><td>{String(p.can_view)}</td><td>{String(p.can_create)}</td><td>{String(p.can_update)}</td><td>{String(p.can_delete)}</td><td>{String(p.can_export)}</td></tr>)}</tbody></table></div></section>
  </>;
}
