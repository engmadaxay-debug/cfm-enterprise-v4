import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

export default function ExchangeProfit(){
 const [profits,setProfits]=useState([]),[summary,setSummary]=useState([]);
 async function load(){const [p,s]=await Promise.all([api.get('/exchange-profit'),api.get('/exchange-profit/summary')]); setProfits(p.data.profits||[]); setSummary(s.data.summary||[]);} useEffect(()=>{load()},[]);
 return <><PageHeader title="Exchange Profit" subtitle="Profit calculated from cost rate, sell rate and fee for every exchange."/>
 <section className="stats-grid">{summary.slice(0,8).map((s,i)=><div className="stat-card" key={i}><span>{String(s.date).slice(0,10)} - {s.currency_code}</span><strong>{Number(s.profit).toFixed(2)}</strong><small>Exchange profit</small></div>)}</section>
 <section className="panel"><h2>Profit Transactions</h2><div className="table-wrap"><table><thead><tr><th>Reference</th><th>Date</th><th>From Amount</th><th>Rate</th><th>Cost Rate</th><th>Fee</th><th>Profit</th></tr></thead><tbody>{profits.map(p=><tr key={p.id}><td>{p.reference_no||'-'}</td><td>{String(p.date).slice(0,10)}</td><td>{Number(p.from_amount).toFixed(2)}</td><td>{Number(p.rate).toFixed(6)}</td><td>{p.cost_rate?Number(p.cost_rate).toFixed(6):'-'}</td><td>{Number(p.fee).toFixed(2)}</td><td>{Number(p.profit_amount).toFixed(2)} {p.currency_code}</td></tr>)}</tbody></table></div></section></>;
}
