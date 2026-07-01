import { useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

export default function SearchEverywhere() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  async function runSearch(e) {
    e.preventDefault();
    setLoading(true);
    try { const r = await api.get('/search', { params: { q } }); setResults(r.data.results || []); }
    finally { setLoading(false); }
  }
  return <>
    <PageHeader title="Search Everywhere" subtitle="Raadi customer, supplier, invoice, payment, transaction iyo records kale hal meel." />
    <section className="panel">
      <form className="inline-form" onSubmit={runSearch}>
        <input placeholder="Search name, phone, invoice no, transaction no..." value={q} onChange={(e)=>setQ(e.target.value)} />
        <button>{loading ? 'Searching...' : 'Search'}</button>
      </form>
    </section>
    <section className="panel"><h2>Results</h2><div className="table-wrap"><table><thead><tr><th>Type</th><th>Title</th><th>Subtitle</th><th>Extra</th></tr></thead><tbody>
      {results.map((x, i) => <tr key={`${x.type}-${x.id}-${i}`}><td><span className="badge neutral">{x.type}</span></td><td>{x.title}</td><td>{x.subtitle}</td><td>{x.extra}</td></tr>)}
      {!results.length && <tr><td colSpan="4">No results yet.</td></tr>}
    </tbody></table></div></section>
  </>;
}
