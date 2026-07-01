
import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Alert from '../components/Alert';

export default function Directory({ type='CUSTOMER', title='Customers' }) {
  const [items,setItems]=useState([]); const [search,setSearch]=useState(''); const [message,setMessage]=useState({});
  const [form,setForm]=useState({name:'',phone:'',email:'',address:'',notes:''});
  async function load(){ const r=await api.get('/people', {params:{search}}); setItems(r.data.people.filter(p=> type==='SUPPLIER' ? p.person_type==='SUPPLIER' : p.person_type==='CUSTOMER')); }
  useEffect(()=>{load()},[]);
  async function save(e){ e.preventDefault(); setMessage({}); try{ await api.post('/people',{...form, personType:type==='SUPPLIER'?'SUPPLIER':'CUSTOMER'}); setForm({name:'',phone:'',email:'',address:'',notes:''}); await load(); setMessage({success:`${title.slice(0,-1)} saved.`}); }catch(err){setMessage({error:err.response?.data?.message||'Could not save.'})}}
  return <><PageHeader title={title} subtitle={`All ${title.toLowerCase()}, add, search and statement access`} /><Alert {...message}/>
    <section className="panel"><h2>Add {title.slice(0,-1)}</h2><form className="form-grid" onSubmit={save}><label>Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Phone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Email<input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Address<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><label className="full">Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><div className="form-actions"><button>Save</button></div></form></section>
    <section className="panel"><h2>Search {title}</h2><form className="inline-form" onSubmit={(e)=>{e.preventDefault();load()}}><label>Search by name, phone, email<input value={search} onChange={e=>setSearch(e.target.value)}/></label><button>Search</button></form></section>
    <section className="panel"><h2>All {title}</h2><div className="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th><th>Type</th><th>Statement</th></tr></thead><tbody>{items.map(p=><tr key={p.id}><td>{p.name}</td><td>{p.phone}</td><td>{p.email}</td><td>{p.address}</td><td>{p.person_type}</td><td><a className="link-button" href={`/statement/${p.id}`}>Open Statement</a></td></tr>)}</tbody></table></div></section>
  </>;
}
