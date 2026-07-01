import PageHeader from '../components/PageHeader';
import api from '../services/api';

const reports = ['journal','people','vaults','profit'];
export default function ExportReports() {
  async function openHtml(report) {
    const r = await api.get(`/exports/${report}.html`, { responseType: 'blob' });
    const url = URL.createObjectURL(r.data); window.open(url, '_blank');
  }
  async function downloadCsv(report) {
    const r = await api.get(`/exports/${report}.csv`, { responseType: 'blob' });
    const url = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = url; a.download = `cfm-${report}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  return <>
    <PageHeader title="Export PDF / Excel" subtitle="CSV waxaa lagu furi karaa Excel. HTML report-ka browser-ka Print → Save as PDF." />
    <section className="panel"><div className="table-wrap"><table><thead><tr><th>Report</th><th>Excel/CSV</th><th>PDF Print</th></tr></thead><tbody>
      {reports.map(r=><tr key={r}><td>{r.toUpperCase()}</td><td><button onClick={()=>downloadCsv(r)}>Download CSV</button></td><td><button className="secondary" onClick={()=>openHtml(r)}>Open PDF Print</button></td></tr>)}
    </tbody></table></div></section>
  </>;
}
