import { Router } from 'express';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

async function ledger(req, res, type) {
  const params = [];
  const clauses = [type === 'CUSTOMER' ? `p.person_type='CUSTOMER'` : `p.person_type IN ('SUPPLIER','VENDOR')`];
  if (req.query.personId) { params.push(req.query.personId); clauses.push(`p.id=$${params.length}`); }
  if (req.query.search) { params.push(`%${req.query.search}%`); clauses.push(`p.name ILIKE $${params.length}`); }
  if (req.user.role !== 'ADMIN') { params.push(req.user.id); clauses.push(`tj.created_by=$${params.length}`); }
  const result = await pool.query(
    `SELECT tj.*, p.name AS person_name, p.phone, p.opening_balance
     FROM transaction_journal tj
     JOIN people p ON p.id=tj.person_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY tj.transaction_date DESC, tj.id DESC
     LIMIT 300`,
    params,
  );
  const balance = result.rows.reduce((sum, r) => sum + Number(r.debit || 0) - Number(r.credit || 0), 0);
  res.json({ ledger: result.rows, balance });
}

router.get('/customers', asyncHandler((req, res) => ledger(req, res, 'CUSTOMER')));
router.get('/suppliers', asyncHandler((req, res) => ledger(req, res, 'SUPPLIER')));

export default router;
