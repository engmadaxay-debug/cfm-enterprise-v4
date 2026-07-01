import { Router } from 'express';
import { pool, withTransaction } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler, positiveNumber, requireFields } from '../utils/http.js';
import { addJournal, nextNumber } from '../utils/numbering.js';

const router = Router();

router.get('/rates', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM exchange_rates ORDER BY from_currency, to_currency');
  res.json({ rates: result.rows });
}));

router.post('/rates', requireAdmin, asyncHandler(async (req, res) => {
  requireFields(req.body, ['fromCurrency', 'toCurrency', 'rate']);
  const rate = positiveNumber(req.body.rate, 'rate');
  const result = await pool.query(
    `INSERT INTO exchange_rates (from_currency, to_currency, rate)
     VALUES (UPPER($1), UPPER($2), $3)
     ON CONFLICT (from_currency, to_currency)
     DO UPDATE SET rate=EXCLUDED.rate, updated_at=NOW()
     RETURNING *`,
    [req.body.fromCurrency.trim(), req.body.toCurrency.trim(), rate],
  );
  res.status(201).json({ rate: result.rows[0] });
}));

router.get('/transactions', asyncHandler(async (req, res) => {
  const params = [];
  const where = req.user.role === 'ADMIN' ? '' : 'WHERE e.created_by=$1';
  if (where) params.push(req.user.id);
  const result = await pool.query(
    `SELECT e.*, p.name AS person_name,
            fv.name || ' (' || fv.currency_code || ')' AS from_vault,
            tv.name || ' (' || tv.currency_code || ')' AS to_vault,
            u.full_name AS created_by_name
     FROM exchange_transactions e
     LEFT JOIN people p ON p.id=e.person_id
     JOIN vault_accounts fv ON fv.id=e.from_vault_id
     JOIN vault_accounts tv ON tv.id=e.to_vault_id
     LEFT JOIN users u ON u.id=e.created_by
     ${where}
     ORDER BY e.created_at DESC LIMIT 200`,
    params,
  );
  res.json({ transactions: result.rows });
}));

router.post('/transactions', asyncHandler(async (req, res) => {
  requireFields(req.body, ['fromVaultId', 'toVaultId', 'fromAmount', 'rate']);
  const fromAmount = positiveNumber(req.body.fromAmount, 'fromAmount');
  const rate = positiveNumber(req.body.rate, 'rate');
  const fee = Math.max(0, Number(req.body.fee || 0));
  const costRate = req.body.costRate ? positiveNumber(req.body.costRate, 'costRate') : rate;
  const toAmount = Number((fromAmount * rate - fee).toFixed(2));
  if (toAmount < 0) return res.status(400).json({ message: 'Fee cannot exceed converted amount.' });

  const transaction = await withTransaction(async (client) => {
    if (req.body.personId) {
      const personParams = [req.body.personId];
      let owner = '';
      if (req.user.role !== 'ADMIN') {
        personParams.push(req.user.id);
        owner = ' AND created_by=$2';
      }
      const person = await client.query(`SELECT id FROM people WHERE id=$1${owner}`, personParams);
      if (!person.rows[0]) {
        const error = new Error('Person not found or not accessible.');
        error.status = 404;
        throw error;
      }
    }

    const vaultParams = [[Number(req.body.fromVaultId), Number(req.body.toVaultId)]];
    let owner = '';
    if (req.user.role !== 'ADMIN') {
      vaultParams.push(req.user.id);
      owner = ' AND created_by=$2';
    }
    const vaultResult = await client.query(
      `SELECT * FROM vault_accounts WHERE id=ANY($1::int[])${owner} FOR UPDATE`,
      vaultParams,
    );
    if (vaultResult.rows.length !== 2) {
      const error = new Error('One or both vaults were not found or are not accessible.');
      error.status = 404;
      throw error;
    }
    if (String(req.body.fromVaultId) === String(req.body.toVaultId)) {
      const error = new Error('Choose two different vaults.');
      error.status = 400;
      throw error;
    }
    const payoutVault = vaultResult.rows.find((v) => String(v.id) === String(req.body.toVaultId));
    if (Number(payoutVault.balance) < toAmount) {
      const error = new Error('Insufficient balance in the payout vault.');
      error.status = 400;
      throw error;
    }

    await client.query('UPDATE vault_accounts SET balance=balance+$1 WHERE id=$2', [fromAmount, req.body.fromVaultId]);
    await client.query('UPDATE vault_accounts SET balance=balance-$1 WHERE id=$2', [toAmount, req.body.toVaultId]);
    const fromVault = vaultResult.rows.find((v) => String(v.id) === String(req.body.fromVaultId));
    const profitAmount = Number(((rate - costRate) * fromAmount + fee).toFixed(2));
    const referenceNo = await nextNumber(client, 'exchange');
    const insert = await client.query(
      `INSERT INTO exchange_transactions
       (person_id, from_vault_id, to_vault_id, from_amount, rate, fee, to_amount, notes, created_by, reference_no, profit_amount, profit_currency, cost_rate)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.body.personId || null, req.body.fromVaultId, req.body.toVaultId, fromAmount, rate, fee, toAmount, req.body.notes || null, req.user.id, referenceNo, profitAmount, fromVault.currency_code, costRate],
    );
    await addJournal(client, req.user.id, { module: 'EXCHANGE', transactionType: 'EXCHANGE_IN', personId: req.body.personId || null, vaultId: req.body.fromVaultId, debit: fromAmount, amount: fromAmount, currencyCode: fromVault.currency_code, referenceNo, description: 'Exchange money received', sourceTable: 'exchange_transactions', sourceId: insert.rows[0].id });
    await addJournal(client, req.user.id, { module: 'EXCHANGE', transactionType: 'EXCHANGE_OUT', personId: req.body.personId || null, vaultId: req.body.toVaultId, credit: toAmount, amount: toAmount, currencyCode: payoutVault.currency_code, referenceNo, description: 'Exchange money paid out', sourceTable: 'exchange_transactions', sourceId: insert.rows[0].id });
    if (profitAmount !== 0) await addJournal(client, req.user.id, { module: 'EXCHANGE_PROFIT', transactionType: 'PROFIT', personId: req.body.personId || null, vaultId: req.body.fromVaultId, credit: profitAmount > 0 ? profitAmount : 0, debit: profitAmount < 0 ? Math.abs(profitAmount) : 0, amount: Math.abs(profitAmount), currencyCode: fromVault.currency_code, referenceNo, description: 'Exchange profit calculated from rate difference and fee', sourceTable: 'exchange_transactions', sourceId: insert.rows[0].id });
    return insert.rows[0];
  });

  res.status(201).json({ transaction });
}));

export default router;
