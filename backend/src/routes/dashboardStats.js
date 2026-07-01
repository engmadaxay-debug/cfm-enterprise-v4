import { Router } from 'express';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';
const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const staff = req.user.role !== 'ADMIN';
  const params = staff ? [req.user.id] : [];
  const owner = staff ? 'WHERE created_by=$1' : '';
  const ownerAnd = staff ? 'AND created_by=$1' : '';

  const [people, vaults, journal, closing, profit, activities] = await Promise.all([
    pool.query(`SELECT person_type, COUNT(*)::int total FROM people ${owner} GROUP BY person_type`, params),
    pool.query(`SELECT currency_code, SUM(balance)::numeric(18,2) total FROM vault_accounts ${owner} GROUP BY currency_code`, params),
    pool.query(`SELECT module, COUNT(*)::int total, SUM(amount)::numeric(18,2) amount FROM transaction_journal ${owner} GROUP BY module ORDER BY total DESC LIMIT 8`, params),
    pool.query(`SELECT closing_date, closing_balance, currency_code, status FROM daily_closings ${owner} ORDER BY closing_date DESC LIMIT 7`, params),
    pool.query(`SELECT COALESCE(SUM(profit_amount),0)::numeric(18,2) total_profit FROM exchange_transactions WHERE created_at::date >= date_trunc('month', CURRENT_DATE)::date ${ownerAnd}`, params),
    pool.query(`SELECT a.*, u.full_name user_name FROM activity_logs a LEFT JOIN users u ON u.id=a.user_id ${staff ? 'WHERE a.user_id=$1' : ''} ORDER BY a.created_at DESC LIMIT 8`, params),
  ]);

  res.json({ people: people.rows, vaults: vaults.rows, journal: journal.rows, recentClosings: closing.rows, monthExchangeProfit: profit.rows[0]?.total_profit || '0.00', activities: activities.rows, scope: staff ? 'MY_DATA' : 'ALL_DATA' });
}));

export default router;
