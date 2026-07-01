import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Alert from '../components/Alert';

const emptyForm = {
  invoiceType: 'SALE',
  personId: '',
  description: 'Service',
  quantity: 1,
  unitPrice: '',
  tax: 0,
  paidAmount: 0,
  dueDate: '',
  notes: '',
};

export default function Invoices() {
  const [people, setPeople] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [msg, setMsg] = useState({});
  const [form, setForm] = useState(emptyForm);

  async function load() {
    const [p, i] = await Promise.all([api.get('/people'), api.get('/invoices')]);
    setPeople(p.data.people || []);
    setInvoices(i.data.invoices || []);
  }

  useEffect(() => { load(); }, []);

  const personType = form.invoiceType === 'PURCHASE' ? 'SUPPLIER' : 'CUSTOMER';
  const filteredPeople = useMemo(() => people.filter((p) => p.person_type === personType), [people, personType]);

  const subtotal = Number(form.quantity || 0) * Number(form.unitPrice || 0);
  const tax = Number(form.tax || 0);
  const total = subtotal + tax;
  const balance = total - Number(form.paidAmount || 0);

  async function save(e) {
    e.preventDefault();
    setMsg({});
    try {
      await api.post('/invoices', {
        personId: form.personId || null,
        invoiceType: form.invoiceType,
        tax: form.tax,
        paidAmount: form.paidAmount,
        dueDate: form.dueDate || null,
        notes: form.notes,
        items: [{ description: form.description, quantity: form.quantity, unitPrice: form.unitPrice }],
      });
      setForm(emptyForm);
      await load();
      setMsg({ success: form.invoiceType === 'PURCHASE' ? 'Supplier invoice created.' : 'Customer invoice created.' });
    } catch (err) {
      setMsg({ error: err.response?.data?.message || 'Could not create invoice.' });
    }
  }

  return (
    <>
      <PageHeader title="Invoices" subtitle="Create customer sales invoices and supplier purchase invoices" />
      <Alert {...msg} />
      <section className="panel">
        <h2>Create Invoice</h2>
        <form className="form-grid" onSubmit={save}>
          <label>
            Invoice Type
            <select value={form.invoiceType} onChange={(e) => setForm({ ...form, invoiceType: e.target.value, personId: '' })}>
              <option value="SALE">Customer Invoice</option>
              <option value="PURCHASE">Supplier Invoice</option>
            </select>
          </label>
          <label>
            {personType === 'SUPPLIER' ? 'Supplier' : 'Customer'}
            <select value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })}>
              <option value="">Walk-in / none</option>
              {filteredPeople.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label>Quantity<input type="number" step="0.01" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
          <label>Unit Price<input type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required /></label>
          <label>Tax Amount<input type="number" step="0.01" value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} /></label>
          <label>Paid Amount<input type="number" step="0.01" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} /></label>
          <label>Due Date<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
          <label className="full">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <div className="full mini-list">
            <div><span>Subtotal</span><strong>{subtotal.toFixed(2)}</strong></div>
            <div><span>Total</span><strong>{total.toFixed(2)}</strong></div>
            <div><span>Balance</span><strong>{balance.toFixed(2)}</strong></div>
          </div>
          <div className="form-actions"><button>Create Invoice</button></div>
        </form>
      </section>
      <section className="panel">
        <h2>All Invoices</h2>
        <div className="table-wrap"><table><thead><tr><th>No</th><th>Type</th><th>Person</th><th>Status</th><th>Total</th><th>Paid</th><th>Date</th><th>Print</th></tr></thead><tbody>{invoices.map((i) => <tr key={i.id}><td>{i.invoice_no}</td><td>{i.invoice_type}</td><td>{i.person_name}</td><td>{i.status}</td><td>{i.total}</td><td>{i.paid_amount}</td><td>{i.issue_date}</td><td><button className="small ghost" onClick={() => window.print()}>Print</button></td></tr>)}</tbody></table></div>
      </section>
    </>
  );
}
