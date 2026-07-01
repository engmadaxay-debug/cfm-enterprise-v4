import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Alert from '../components/Alert';
export default function Ledger({type='customers'}){
  const title=type==='customers'?'Customer Ledger':'Supplier Ledger'; const [rows,setRows]=useState([]); const [balance,setBalance]=useState(0); const [search,setSearch]=useState(''); const [msg,setMsg]=useState({});
  async function load(){try{const r=await api.get(`/ledgers/${type}`,{params:{search}}); setRows(r.data.ledger||[]); setBalance(r.data.balance||0);}catch(e){setMsg({error:e.response?.data?.message||'Ledger could not load.'})}}
  useEffect(()=>{load()},[type]);
  return <><PageHeader title={title} subtitle="Statement and running ledger from transaction journal"/><Alert {...msg}/><section className="stats-grid"><div className="stat-card"><span>Current Ledger Balance</span><strong>{Number(balance).toFixed(2)}</strong></div><div className="stat-card"><span>Rows</span><strong>{rows.length}</strong></div></section><section className="panel"><form className="inline-form" onSubmit={e=>{e.preventDefault();load();}}><label>Search Name<input value={search} onChange={e=>setSearch(e.target.value)} /></label><button>Search</button></form></section><section className="panel"><h2>{title}</h2><div className="table-wrap"><table><thead><tr><th>Date</th><th>No</th><th>Name</th><th>Module</th><th>Debit</th><th>Credit</th><th>Currency</th><th>Description</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{String(r.transaction_date).slice(0,10)}</td><td>{r.transaction_no}</td><td>{r.person_name}</td><td>{r.module}</td><td>{Number(r.debit||0).toFixed(2)}</td><td>{Number(r.credit||0).toFixed(2)}</td><td>{r.currency_code}</td><td>{r.description}</td></tr>)}</tbody></table></div></section></>
}
