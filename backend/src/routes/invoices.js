import { Router } from 'express';
import { pool, withTransaction } from '../config/db.js';
import { asyncHandler, requireFields } from '../utils/http.js';
const router = Router();

function normalizeInvoiceType(value) {
  const type = String(value || 'SALE').toUpperCase();
  if (['PURCHASE', 'SUPPLIER'].includes(type)) return 'PURCHASE';
  if (['SERVICE'].includes(type)) return 'SERVICE';
  return 'SALE';
}

router.get('/', asyncHandler(async (req, res) => {
  const params = [];
  let where = '';
  if (req.user.role !== 'ADMIN') {
    params.push(req.user.id);
    where = `WHERE i.created_by=$${params.length}`;
  }
  const result = await pool.query(
    `SELECT i.*, p.name AS person_name
     FROM invoices i
     LEFT JOIN people p ON p.id=i.person_id
     ${where}
     ORDER BY i.created_at DESC
     LIMIT 500`,
    params,
  );
  res.json({ invoices: result.rows });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const params = [req.params.id];
  let owner = '';
  if (req.user.role !== 'ADMIN') {
    params.push(req.user.id);
    owner = ` AND i.created_by=$${params.length}`;
  }
  const inv = await pool.query(
    `SELECT i.*, p.name AS person_name, p.phone, p.email, p.address
     FROM invoices i
     LEFT JOIN people p ON p.id=i.person_id
     WHERE i.id=$1${owner}`,
    params,
  );
  if (!inv.rows[0]) return res.status(404).json({ message: 'Invoice not found.' });
  const items = await pool.query('SELECT * FROM invoice_items WHERE invoice_id=$1 ORDER BY id', [req.params.id]);
  res.json({ invoice: inv.rows[0], items: items.rows });
}));

router.post('/', asyncHandler(async (req, res) => {
  requireFields(req.body, ['items']);
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ message: 'At least one invoice item is required.' });

  const invoice = await withTransaction(async (client) => {
    const invoiceType = normalizeInvoiceType(req.body.invoiceType || req.body.type);
    const prefix = invoiceType === 'PURCHASE' ? 'PINV-' : 'INV-';
    const next = await client.query(
      "SELECT $1 || LPAD((COALESCE(MAX(id),0)+1)::text, 6, '0') AS no FROM invoices",
      [prefix],
    );

    let subtotal = 0;
    const normalized = items.map((it) => {
      const qty = Number(it.quantity || 1);
      const price = Number(it.unitPrice || it.unit_price || 0);
      const line = Number((qty * price).toFixed(2));
      subtotal += line;
      return { description: String(it.description || 'Service'), quantity: qty, unitPrice: price, lineTotal: line };
    });

    const tax = Number(req.body.tax || 0);
    const total = Number((subtotal + tax).toFixed(2));
    const paidAmount = Math.max(0, Math.min(Number(req.body.paidAmount || req.body.paid_amount || 0), total));
    const status = paidAmount >= total ? 'PAID' : (req.body.status || 'POSTED');

    const inv = await client.query(
      `INSERT INTO invoices
       (invoice_no, person_id, invoice_type, status, issue_date, due_date, subtotal, tax, total, paid_amount, notes, created_by)
       VALUES ($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE),$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [next.rows[0].no, req.body.personId || null, invoiceType, status, req.body.issueDate || null, req.body.dueDate || null, subtotal, tax, total, paidAmount, req.body.notes || null, req.user.id],
    );

    for (const it of normalized) {
      await client.query(
        'INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, line_total) VALUES ($1,$2,$3,$4,$5)',
        [inv.rows[0].id, it.description, it.quantity, it.unitPrice, it.lineTotal],
      );
    }

    const balance = Number((total - paidAmount).toFixed(2));
    if (balance > 0 && req.body.personId) {
      await client.query(
        `INSERT INTO money_records (person_id, category, original_amount, remaining_amount, currency_code, status, due_date, description, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          req.body.personId,
          invoiceType === 'PURCHASE' ? 'PAYABLE' : 'RECEIVABLE',
          balance,
          balance,
          req.body.currency || req.body.currencyCode || 'CAD',
          'OPEN',
          req.body.dueDate || null,
          `${invoiceType === 'PURCHASE' ? 'Supplier' : 'Customer'} invoice ${inv.rows[0].invoice_no}`,
          req.user.id,
        ],
      );
    }

    await client.query(
      'INSERT INTO audit_logs (user_id, action, module, record_id, details) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'CREATE', 'INVOICES', inv.rows[0].id, { invoice_no: inv.rows[0].invoice_no, invoiceType, total, paidAmount }],
    );

    return inv.rows[0];
  });

  res.status(201).json({ invoice });
}));

export default router;
