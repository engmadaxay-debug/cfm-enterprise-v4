import { Router } from 'express';
import { pool, withTransaction } from '../config/db.js';
import { asyncHandler, positiveNumber, requireFields } from '../utils/http.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const params = [];
  const where = req.user.role === 'ADMIN' ? '' : 'WHERE v.created_by=$1';
  if (where) params.push(req.user.id);
  const result = await pool.query(
    `SELECT v.*, u.full_name AS created_by_name
     FROM vault_accounts v LEFT JOIN users u ON u.id=v.created_by
     ${where} ORDER BY v.currency_code, v.name`,
    params,
  );
  res.json({ vaults: result.rows });
}));

router.post('/', asyncHandler(async (req, res) => {
  requireFields(req.body, ['name', 'currencyCode']);
  const openingBalance = Number(req.body.openingBalance || 0);
  if (!Number.isFinite(openingBalance) || openingBalance < 0) {
    return res.status(400).json({ message: 'Opening balance cannot be negative.' });
  }
  const result = await pool.query(
    `INSERT INTO vault_accounts (name, currency_code, balance, created_by)
     VALUES ($1, UPPER($2), $3, $4) RETURNING *`,
    [req.body.name.trim(), req.body.currencyCode.trim(), openingBalance, req.user.id],
  );
  res.status(201).json({ vault: result.rows[0] });
}));

router.post('/adjust', asyncHandler(async (req, res) => {
  requireFields(req.body, ['vaultId', 'amount', 'direction']);
  const amount = positiveNumber(req.body.amount);
  const sign = req.body.direction === 'IN' ? 1 : req.body.direction === 'OUT' ? -1 : 0;
  if (!sign) return res.status(400).json({ message: 'direction must be IN or OUT.' });

  const params = [amount * sign, req.body.vaultId];
  let owner = '';
  if (req.user.role !== 'ADMIN') {
    params.push(req.user.id);
    owner = ` AND created_by=$${params.length}`;
  }
  const result = await pool.query(
    `UPDATE vault_accounts SET balance = balance + $1 WHERE id=$2${owner}
     AND (balance + $1) >= 0 RETURNING *`,
    params,
  );
  if (!result.rows[0]) return res.status(400).json({ message: 'Vault not found, not accessible, or insufficient balance.' });
  res.json({ vault: result.rows[0] });
}));

router.post('/transfer', asyncHandler(async (req, res) => {
  requireFields(req.body, ['fromVaultId', 'toVaultId', 'amount']);
  const amount = positiveNumber(req.body.amount);
  if (String(req.body.fromVaultId) === String(req.body.toVaultId)) {
    return res.status(400).json({ message: 'Choose two different vaults.' });
  }

  const result = await withTransaction(async (client) => {
    const ids = [Number(req.body.fromVaultId), Number(req.body.toVaultId)];
    const params = [ids];
    let owner = '';
    if (req.user.role !== 'ADMIN') {
      params.push(req.user.id);
      owner = ' AND created_by=$2';
    }
    const pair = await client.query(
      `SELECT id, currency_code FROM vault_accounts
       WHERE id = ANY($1::int[])${owner} FOR UPDATE`,
      params,
    );
    if (pair.rows.length !== 2 || pair.rows[0].currency_code !== pair.rows[1].currency_code) {
      const error = new Error('Both accessible vaults must exist and use the same currency.');
      error.status = 400;
      throw error;
    }
    const debit = await client.query(
      `UPDATE vault_accounts SET balance=balance-$1
       WHERE id=$2 AND balance >= $1 RETURNING *`,
      [amount, req.body.fromVaultId],
    );
    if (!debit.rows[0]) {
      const error = new Error('Source vault not found or insufficient balance.');
      error.status = 400;
      throw error;
    }
    const credit = await client.query(
      'UPDATE vault_accounts SET balance=balance+$1 WHERE id=$2 RETURNING *',
      [amount, req.body.toVaultId],
    );
    return { fromVault: debit.rows[0], toVault: credit.rows[0] };
  });

  res.json(result);
}));

export default router;
