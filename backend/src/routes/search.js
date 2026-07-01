import { Router } from 'express';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';
const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ query: q, results: [] });
  const like = `%${q}%`;
  const staff = req.user.role !== 'ADMIN';
  const owner = req.user.id;

  const ownerPeople = staff ? 'AND created_by=$2' : '';
  const ownerJournal = staff ? 'AND tj.created_by=$2' : '';
  const ownerInvoice = staff ? 'AND i.created_by=$2' : '';
  const ownerMoney = staff ? 'AND mr.created_by=$2' : '';
  const params = staff ? [like, owner] : [like];

  const [people, journal, invoices, money] = await Promise.all([
    pool.query(`SELECT 'Person' AS type, id, name AS title, person_type AS subtitle, phone AS extra FROM people WHERE (name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1 OR COALESCE(code,'') ILIKE $1) ${ownerPeople} ORDER BY updated_at DESC LIMIT 10`, params),
    pool.query(`SELECT 'Transaction' AS type, tj.id, tj.transaction_no AS title, tj.module || ' · ' || tj.transaction_type AS subtitle, tj.amount::text || ' ' || tj.currency_code AS extra FROM transaction_journal tj WHERE (tj.transaction_no ILIKE $1 OR COALESCE(tj.reference_no,'') ILIKE $1 OR COALESCE(tj.description,'') ILIKE $1) ${ownerJournal} ORDER BY tj.created_at DESC LIMIT 10`, params),
    pool.query(`SELECT 'Invoice' AS type, i.id, i.invoice_no AS title, i.status AS subtitle, i.total::text AS extra FROM invoices i WHERE (i.invoice_no ILIKE $1 OR COALESCE(i.reference_no,'') ILIKE $1 OR COALESCE(i.notes,'') ILIKE $1) ${ownerInvoice} ORDER BY i.created_at DESC LIMIT 10`, params),
    pool.query(`SELECT 'Money Record' AS type, mr.id, mr.category AS title, mr.status AS subtitle, mr.remaining_amount::text || ' ' || mr.currency_code AS extra FROM money_records mr LEFT JOIN people p ON p.id=mr.person_id WHERE (mr.category ILIKE $1 OR mr.status ILIKE $1 OR COALESCE(mr.description,'') ILIKE $1 OR p.name ILIKE $1) ${ownerMoney} ORDER BY mr.created_at DESC LIMIT 10`, params),
  ]);
  res.json({ query: q, results: [...people.rows, ...journal.rows, ...invoices.rows, ...money.rows] });
}));

export default router;
