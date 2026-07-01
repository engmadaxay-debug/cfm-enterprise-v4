import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Alert from '../components/Alert';

export default function MultiCurrency(){
 const [currencies,setCurrencies]=useState([]),[rates,setRates]=useState([]),[msg,setMsg]=useState({});
 const [currency,setCurrency]=useState({code:'',name:'',symbol:''});
 const [rate,setRate]=useState({fromCurrency:'USD',toCurrency:'CAD',rate:''});
 async function load(){const [c,r]=await Promise.all([api.get('/currencies'),api.get('/exchange/rates')]); setCurrencies(c.data.currencies||[]); setRates(r.data.rates||[]);} useEffect(()=>{load()},[]);
 async function saveCurrency(e){e.preventDefault(); try{await api.post('/currencies',currency); setCurrency({code:'',name:'',symbol:''}); setMsg({success:'Currency saved.'}); await load();}catch(err){setMsg({error:err.response?.data?.message||'Could not save currency. Admin only.'})}}
 async function saveRate(e){e.preventDefault(); try{await api.post('/exchange/rates',rate); setRate({...rate,rate:''}); setMsg({success:'Rate saved.'}); await load();}catch(err){setMsg({error:err.response?.data?.message||'Could not save rate. Admin only.'})}}
 return <><PageHeader title="Multi Currency" subtitle="Manage currencies and exchange rates used by CFM."/><Alert {...msg}/>
 <section className="panel"><h2>Add Currency</h2><form className="form-grid" onSubmit={saveCurrency}><label>Code<input value={currency.code} onChange={e=>setCurrency({...currency,code:e.target.value})} placeholder="USD"/></label><label>Name<input value={currency.name} onChange={e=>setCurrency({...currency,name:e.target.value})} placeholder="US Dollar"/></label><label>Symbol<input value={currency.symbol} onChange={e=>setCurrency({...currency,symbol:e.target.value})} placeholder="$"/></label><div className="form-actions"><button>Save Currency</button></div></form></section>
 <section className="panel"><h2>Add/Update Rate</h2><form className="form-grid" onSubmit={saveRate}><label>From<input value={rate.fromCurrency} onChange={e=>setRate({...rate,fromCurrency:e.target.value})}/></label><label>To<input value={rate.toCurrency} onChange={e=>setRate({...rate,toCurrency:e.target.value})}/></label><label>Rate<input type="number" step="0.000001" value={rate.rate} onChange={e=>setRate({...rate,rate:e.target.value})}/></label><div className="form-actions"><button>Save Rate</button></div></form></section>
 <section className="panel"><h2>Currencies</h2><div className="table-wrap"><table><thead><tr><th>Code</th><th>Name</th><th>Symbol</th><th>Status</th></tr></thead><tbody>{currencies.map(c=><tr key={c.id}><td>{c.code}</td><td>{c.name}</td><td>{c.symbol}</td><td>{c.is_active?'Active':'Off'}</td></tr>)}</tbody></table></div></section>
 <section className="panel"><h2>Rates</h2><div className="table-wrap"><table><thead><tr><th>From</th><th>To</th><th>Rate</th><th>Updated</th></tr></thead><tbody>{rates.map(r=><tr key={r.id}><td>{r.from_currency}</td><td>{r.to_currency}</td><td>{Number(r.rate).toFixed(6)}</td><td>{String(r.updated_at).slice(0,10)}</td></tr>)}</tbody></table></div></section></>;
}
