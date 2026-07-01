import { Router } from 'express';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.get('/dashboard', asyncHandler(async (req, res) => {
  const staff = req.user.role !== 'ADMIN';
  const params = staff ? [req.user.id] : [];
  const vaultWhere = staff ? 'WHERE created_by=$1' : '';
  const moneyWhere = staff ? 'WHERE created_by=$1 AND remaining_amount > 0' : 'WHERE remaining_amount > 0';
  const cashWhere = staff
    ? `WHERE created_by=$1 AND transaction_date >= date_trunc('month', CURRENT_DATE)`
    : `WHERE transaction_date >= date_trunc('month', CURRENT_DATE)`;
  const peopleWhere = staff ? 'WHERE created_by=$1' : '';
  const recentWhere = staff ? 'WHERE c.created_by=$1' : '';

  const [vaults, money, monthCash, people, recent] = await Promise.all([
    pool.query(`SELECT currency_code, SUM(balance)::numeric(18,2) AS balance
                FROM vault_accounts ${vaultWhere}
                GROUP BY currency_code ORDER BY currency_code`, params),
    pool.query(`SELECT category, currency_code, SUM(remaining_amount)::numeric(18,2) AS total
                FROM money_records ${moneyWhere}
                GROUP BY category, currency_code ORDER BY category, currency_code`, params),
    pool.query(`SELECT transaction_type, COALESCE(SUM(amount),0)::numeric(18,2) AS total
                FROM cash_transactions ${cashWhere}
                GROUP BY transaction_type`, params),
    pool.query(`SELECT COUNT(*)::int AS total FROM people ${peopleWhere}`, params),
    pool.query(`SELECT c.id, c.transaction_type, c.category, c.amount, c.transaction_date, v.currency_code
                FROM cash_transactions c JOIN vault_accounts v ON v.id=c.vault_id
                ${recentWhere}
                ORDER BY c.created_at DESC LIMIT 8`, params),
  ]);

  res.json({
    vaultBalances: vaults.rows,
    outstanding: money.rows,
    currentMonthCash: monthCash.rows,
    peopleCount: people.rows[0].total,
    recentTransactions: recent.rows,
    scope: staff ? 'MY_DATA' : 'ALL_DATA',
  });
}));

router.get('/summary', asyncHandler(async (req, res) => {
  const from = req.query.from || '2000-01-01';
  const to = req.query.to || '2999-12-31';
  const staff = req.user.role !== 'ADMIN';
  const rangeParams = staff ? [from, to, req.user.id] : [from, to];
  const cashOwner = staff ? 'AND c.created_by=$3' : '';
  const exchangeOwner = staff ? 'AND e.created_by=$3' : '';
  const moneyOwner = staff ? 'AND created_by=$1' : '';
  const vaultOwner = staff ? 'WHERE v.created_by=$1' : '';
  const ownerParams = staff ? [req.user.id] : [];

  const [cash, exchange, outstanding, vaults] = await Promise.all([
    pool.query(
      `SELECT transaction_type, v.currency_code, SUM(c.amount)::numeric(18,2) AS total
       FROM cash_transactions c JOIN vault_accounts v ON v.id=c.vault_id
       WHERE c.transaction_date BETWEEN $1 AND $2 ${cashOwner}
       GROUP BY transaction_type, v.currency_code ORDER BY transaction_type, v.currency_code`,
      rangeParams,
    ),
    pool.query(
      `SELECT fv.currency_code AS from_currency, tv.currency_code AS to_currency,
              SUM(e.from_amount)::numeric(18,2) AS sold,
              SUM(e.to_amount)::numeric(18,2) AS bought,
              SUM(e.fee)::numeric(18,2) AS fees
       FROM exchange_transactions e
       JOIN vault_accounts fv ON fv.id=e.from_vault_id
       JOIN vault_accounts tv ON tv.id=e.to_vault_id
       WHERE e.created_at::date BETWEEN $1 AND $2 ${exchangeOwner}
       GROUP BY fv.currency_code, tv.currency_code`,
      rangeParams,
    ),
    pool.query(`SELECT category, currency_code, SUM(remaining_amount)::numeric(18,2) AS total
                FROM money_records WHERE remaining_amount > 0 ${moneyOwner}
                GROUP BY category, currency_code ORDER BY category, currency_code`, ownerParams),
    pool.query(`SELECT v.name, v.currency_code, v.balance, u.full_name AS created_by_name
                FROM vault_accounts v LEFT JOIN users u ON u.id=v.created_by
                ${vaultOwner} ORDER BY v.currency_code, v.name`, ownerParams),
  ]);

  res.json({
    cash: cash.rows,
    exchange: exchange.rows,
    outstanding: outstanding.rows,
    vaults: vaults.rows,
    scope: staff ? 'MY_DATA' : 'ALL_DATA',
  });
}));

export default router;
