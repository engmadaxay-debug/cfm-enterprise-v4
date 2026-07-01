import { Router } from 'express';
import { pool, withTransaction } from '../config/db.js';
import { asyncHandler, requireFields } from '../utils/http.js';
import { addJournal, nextNumber } from '../utils/numbering.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT d.*, v.name AS vault_name, u.full_name AS created_by_name
     FROM daily_closings d
     LEFT JOIN vault_accounts v ON v.id=d.vault_id
     LEFT JOIN users u ON u.id=d.created_by
     ORDER BY d.closing_date DESC, d.created_at DESC LIMIT 200`,
  );
  res.json({ closings: result.rows });
}));

router.get('/preview', asyncHandler(async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0,10);
  const vaultId = req.query.vaultId;
  if (!vaultId) return res.status(400).json({ message: 'vaultId is required.' });
  const vault = await pool.query('SELECT * FROM vault_accounts WHERE id=$1', [vaultId]);
  if (!vault.rows[0]) return res.status(404).json({ message: 'Vault not found.' });
  const income = await pool.query(`SELECT COALESCE(SUM(amount),0) total FROM cash_transactions WHERE vault_id=$1 AND transaction_type='INCOME' AND transaction_date=$2`, [vaultId, date]);
  const expenses = await pool.query(`SELECT COALESCE(SUM(amount),0) total FROM cash_transactions WHERE vault_id=$1 AND transaction_type='EXPENSE' AND transaction_date=$2`, [vaultId, date]);
  const exIn = await pool.query(`SELECT COALESCE(SUM(from_amount),0) total FROM exchange_transactions WHERE from_vault_id=$1 AND created_at::date=$2`, [vaultId, date]);
  const exOut = await pool.query(`SELECT COALESCE(SUM(to_amount),0) total FROM exchange_transactions WHERE to_vault_id=$1 AND created_at::date=$2`, [vaultId, date]);
  const profit = await pool.query(`SELECT COALESCE(SUM(profit_amount),0) total FROM exchange_transactions WHERE profit_currency=$1 AND created_at::date=$2`, [vault.rows[0].currency_code, date]);
  const current = Number(vault.rows[0].balance);
  const totalIncome = Number(income.rows[0].total);
  const totalExpenses = Number(expenses.rows[0].total);
  const totalExchangeIn = Number(exIn.rows[0].total);
  const totalExchangeOut = Number(exOut.rows[0].total);
  const exchangeProfit = Number(profit.rows[0].total);
  const opening = Number((current - totalIncome + totalExpenses - totalExchangeIn + totalExchangeOut).toFixed(2));
  res.json({ preview: { date, vault: vault.rows[0], openingBalance: opening, totalIncome, totalExpenses, totalExchangeIn, totalExchangeOut, exchangeProfit, expectedClosing: current } });
}));

router.post('/', asyncHandler(async (req, res) => {
  requireFields(req.body, ['closingDate', 'vaultId', 'countedClosing']);
  const closing = await withTransaction(async (client) => {
    const date = req.body.closingDate;
    const vaultId = req.body.vaultId;
    const v = await client.query('SELECT * FROM vault_accounts WHERE id=$1 FOR UPDATE', [vaultId]);
    if (!v.rows[0]) throw Object.assign(new Error('Vault not found.'), { status: 404 });
    const q = async (sql, params) => Number((await client.query(sql, params)).rows[0].total || 0);
    const totalIncome = await q(`SELECT COALESCE(SUM(amount),0) total FROM cash_transactions WHERE vault_id=$1 AND transaction_type='INCOME' AND transaction_date=$2`, [vaultId, date]);
    const totalExpenses = await q(`SELECT COALESCE(SUM(amount),0) total FROM cash_transactions WHERE vault_id=$1 AND transaction_type='EXPENSE' AND transaction_date=$2`, [vaultId, date]);
    const totalExchangeIn = await q(`SELECT COALESCE(SUM(from_amount),0) total FROM exchange_transactions WHERE from_vault_id=$1 AND created_at::date=$2`, [vaultId, date]);
    const totalExchangeOut = await q(`SELECT COALESCE(SUM(to_amount),0) total FROM exchange_transactions WHERE to_vault_id=$1 AND created_at::date=$2`, [vaultId, date]);
    const exchangeProfit = await q(`SELECT COALESCE(SUM(profit_amount),0) total FROM exchange_transactions WHERE profit_currency=$1 AND created_at::date=$2`, [v.rows[0].currency_code, date]);
    const expected = Number(v.rows[0].balance);
    const opening = Number((expected - totalIncome + totalExpenses - totalExchangeIn + totalExchangeOut).toFixed(2));
    const counted = Number(req.body.countedClosing || 0);
    const difference = Number((counted - expected).toFixed(2));
    const status = difference === 0 ? 'CLOSED' : 'DIFFERENCE';
    const no = await nextNumber(client, 'daily_closing');
    const inserted = await client.query(
      `INSERT INTO daily_closings
       (closing_no, closing_date, vault_id, currency_code, opening_balance, total_income, total_expenses, total_exchange_in, total_exchange_out, exchange_profit, expected_closing, counted_closing, difference, status, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (closing_date, vault_id) DO UPDATE SET counted_closing=EXCLUDED.counted_closing, difference=EXCLUDED.difference, status=EXCLUDED.status, notes=EXCLUDED.notes
       RETURNING *`,
      [no, date, vaultId, v.rows[0].currency_code, opening, totalIncome, totalExpenses, totalExchangeIn, totalExchangeOut, exchangeProfit, expected, counted, difference, status, req.body.notes || null, req.user.id],
    );
    await addJournal(client, req.user.id, { module:'DAILY_CLOSING', transactionType: status, vaultId, amount: Math.abs(difference), debit: difference>0?difference:0, credit:difference<0?Math.abs(difference):0, currencyCode:v.rows[0].currency_code, referenceNo: inserted.rows[0].closing_no, description:`Daily closing ${date}`, sourceTable:'daily_closings', sourceId: inserted.rows[0].id });
    return inserted.rows[0];
  });
  res.status(201).json({ closing });
}));

export default router;
