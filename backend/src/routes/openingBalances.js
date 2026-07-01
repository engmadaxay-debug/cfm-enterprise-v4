import { Router } from 'express';
import { pool, withTransaction } from '../config/db.js';
import { asyncHandler, positiveNumber, requireFields } from '../utils/http.js';
import { nextNumber, addJournal } from '../utils/numbering.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const params = [];
  const clauses = [];
  if (req.user.role !== 'ADMIN') { params.push(req.user.id); clauses.push(`ob.created_by=$${params.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT ob.*, p.name AS person_name, v.name AS vault_name
     FROM opening_balances ob
     LEFT JOIN people p ON p.id=ob.person_id
     LEFT JOIN vault_accounts v ON v.id=ob.vault_id
     ${where}
     ORDER BY ob.created_at DESC`, params);
  res.json({ openingBalances: result.rows });
}));

router.post('/', asyncHandler(async (req, res) => {
  requireFields(req.body, ['balanceType','amount','currencyCode']);
  const amount = positiveNumber(req.body.amount);
  const balanceType = String(req.body.balanceType).toUpperCase();
  const allowed = new Set(['CUSTOMER','SUPPLIER','VAULT','CASH','BANK']);
  if (!allowed.has(balanceType)) return res.status(400).json({ message: 'Invalid balance type.' });
  const saved = await withTransaction(async (client) => {
    const balanceNo = await nextNumber(client, 'opening_balance');
    const row = await client.query(
      `INSERT INTO opening_balances (balance_no,balance_date,balance_type,person_id,vault_id,amount,currency_code,notes,created_by)
       VALUES ($1,COALESCE($2,CURRENT_DATE),$3,$4,$5,$6,UPPER($7),$8,$9) RETURNING *`,
      [balanceNo, req.body.balanceDate || null, balanceType, req.body.personId || null, req.body.vaultId || null, amount, req.body.currencyCode, req.body.notes || null, req.user.id],
    );
    if (req.body.personId) {
      await client.query('UPDATE people SET opening_balance=opening_balance+$1 WHERE id=$2', [amount, req.body.personId]);
    }
    if (req.body.vaultId) {
      await client.query('UPDATE vault_accounts SET balance=balance+$1 WHERE id=$2', [amount, req.body.vaultId]);
    }
    await addJournal(client, req.user.id, {
      module: 'OPENING_BALANCE', transactionType: balanceType, personId: req.body.personId, vaultId: req.body.vaultId,
      debit: ['CUSTOMER','VAULT','CASH','BANK'].includes(balanceType) ? amount : 0,
      credit: balanceType === 'SUPPLIER' ? amount : 0,
      amount, currencyCode: req.body.currencyCode, referenceNo: balanceNo, description: req.body.notes || 'Opening balance', sourceTable: 'opening_balances', sourceId: row.rows[0].id,
    });
    return row.rows[0];
  });
  res.status(201).json({ openingBalance: saved });
}));

export default router;
