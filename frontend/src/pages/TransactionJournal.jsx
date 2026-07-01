import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Alert from '../components/Alert';

export default function TransactionJournal(){
  const [rows,setRows]=useState([]); const [summary,setSummary]=useState([]); const [search,setSearch]=useState(''); const [msg,setMsg]=useState({});
  async function load(){ try{ const [a,b]=await Promise.all([api.get('/journal',{params:{search}}),api.get('/journal/summary')]); setRows(a.data.transactions||[]); setSummary(b.data.summary||[]); }catch(e){setMsg({error:e.response?.data?.message||'Journal could not load.'})}}
  useEffect(()=>{load()},[]);
  return <><PageHeader title="Transaction Journal" subtitle="All money activity in one searchable place"/><Alert {...msg}/>
  <section className="panel"><form className="inline-form" onSubmit={e=>{e.preventDefault();load();}}><label>Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="TRX, customer, reference..."/></label><button>Search</button><button className="ghost" type="button" onClick={()=>{setSearch('');setTimeout(load,0)}}>Reset</button></form></section>
  <section className="stats-grid">{summary.slice(0,6).map((s,i)=><div className="stat-card" key={i}><span>{s.module} / {s.currency_code}</span><strong>{Number(s.amount||0).toFixed(2)}</strong><small>{s.count} transactions</small></div>)}</section>
  <section className="panel"><h2>Transactions</h2><div className="table-wrap"><table><thead><tr><th>No</th><th>Date</th><th>Module</th><th>Person</th><th>Vault</th><th>Debit</th><th>Credit</th><th>Currency</th><th>Description</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.transaction_no}</td><td>{String(r.transaction_date).slice(0,10)}</td><td>{r.module}</td><td>{r.person_name||'-'}</td><td>{r.vault_name||'-'}</td><td>{Number(r.debit||0).toFixed(2)}</td><td>{Number(r.credit||0).toFixed(2)}</td><td>{r.currency_code}</td><td>{r.description}</td></tr>)}</tbody></table></div></section></>
}
