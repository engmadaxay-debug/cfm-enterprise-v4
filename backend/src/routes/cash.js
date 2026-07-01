import { Router } from 'express';
import { pool, withTransaction } from '../config/db.js';
import { asyncHandler, positiveNumber, requireFields } from '../utils/http.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const type = String(req.query.type || '').toUpperCase();
  const clauses = [];
  const params = [];
  if (type) {
    params.push(type);
    clauses.push(`c.transaction_type=$${params.length}`);
  }
  if (req.user.role !== 'ADMIN') {
    params.push(req.user.id);
    clauses.push(`c.created_by=$${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT c.*, p.name AS person_name, v.name AS vault_name, v.currency_code,
            u.full_name AS created_by_name
     FROM cash_transactions c
     JOIN vault_accounts v ON v.id=c.vault_id
     LEFT JOIN people p ON p.id=c.person_id
     LEFT JOIN users u ON u.id=c.created_by
     ${where}
     ORDER BY c.transaction_date DESC, c.created_at DESC LIMIT 500`,
    params,
  );
  res.json({ transactions: result.rows });
}));

router.post('/', asyncHandler(async (req, res) => {
  requireFields(req.body, ['transactionType', 'category', 'amount', 'vaultId']);
  const type = String(req.body.transactionType).toUpperCase();
  if (!['INCOME', 'EXPENSE'].includes(type)) return res.status(400).json({ message: 'Invalid transaction type.' });
  const amount = positiveNumber(req.body.amount);
  const sign = type === 'INCOME' ? 1 : -1;

  const transaction = await withTransaction(async (client) => {
    if (req.body.personId) {
      const personParams = [req.body.personId];
      let personOwner = '';
      if (req.user.role !== 'ADMIN') {
        personParams.push(req.user.id);
        personOwner = ' AND created_by=$2';
      }
      const person = await client.query(`SELECT id FROM people WHERE id=$1${personOwner}`, personParams);
      if (!person.rows[0]) {
        const error = new Error('Person not found or not accessible.');
        error.status = 404;
        throw error;
      }
    }

    const vaultParams = [amount * sign, req.body.vaultId];
    let vaultOwner = '';
    if (req.user.role !== 'ADMIN') {
      vaultParams.push(req.user.id);
      vaultOwner = ' AND created_by=$3';
    }
    const vault = await client.query(
      `UPDATE vault_accounts SET balance=balance+$1
       WHERE id=$2${vaultOwner} AND (balance+$1)>=0 RETURNING *`,
      vaultParams,
    );
    if (!vault.rows[0]) {
      const error = new Error('Vault not found, not accessible, or insufficient balance.');
      error.status = 400;
      throw error;
    }
    const insert = await client.query(
      `INSERT INTO cash_transactions
       (transaction_type, category, amount, vault_id, person_id, description, transaction_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::date,CURRENT_DATE),$8) RETURNING *`,
      [type, req.body.category.trim(), amount, req.body.vaultId, req.body.personId || null, req.body.description || null, req.body.transactionDate || null, req.user.id],
    );
    return insert.rows[0];
  });

  res.status(201).json({ transaction });
}));

export default router;
