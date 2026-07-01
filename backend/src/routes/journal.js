import { Router } from 'express';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const params = [];
  const clauses = [];
  if (req.query.search) {
    params.push(`%${req.query.search}%`);
    clauses.push(`(tj.transaction_no ILIKE $${params.length} OR tj.reference_no ILIKE $${params.length} OR tj.description ILIKE $${params.length} OR p.name ILIKE $${params.length})`);
  }
  if (req.query.module) {
    params.push(String(req.query.module).toUpperCase());
    clauses.push(`UPPER(tj.module)=$${params.length}`);
  }
  if (req.query.personId) {
    params.push(req.query.personId);
    clauses.push(`tj.person_id=$${params.length}`);
  }
  if (req.user.role !== 'ADMIN') {
    params.push(req.user.id);
    clauses.push(`tj.created_by=$${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT tj.*, p.name AS person_name, v.name AS vault_name, u.full_name AS created_by_name
     FROM transaction_journal tj
     LEFT JOIN people p ON p.id=tj.person_id
     LEFT JOIN vault_accounts v ON v.id=tj.vault_id
     LEFT JOIN users u ON u.id=tj.created_by
     ${where}
     ORDER BY tj.created_at DESC
     LIMIT 300`,
    params,
  );
  res.json({ transactions: result.rows });
}));

router.get('/summary', asyncHandler(async (req, res) => {
  const owner = req.user.role !== 'ADMIN' ? 'WHERE created_by=$1' : '';
  const params = req.user.role !== 'ADMIN' ? [req.user.id] : [];
  const result = await pool.query(
    `SELECT module, currency_code, COUNT(*)::int AS count,
            COALESCE(SUM(debit),0) AS debit,
            COALESCE(SUM(credit),0) AS credit,
            COALESCE(SUM(amount),0) AS amount
     FROM transaction_journal ${owner}
     GROUP BY module, currency_code
     ORDER BY module, currency_code`,
    params,
  );
  res.json({ summary: result.rows });
}));

export default router;
