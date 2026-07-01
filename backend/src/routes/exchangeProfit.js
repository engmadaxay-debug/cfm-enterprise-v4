import { Router } from 'express';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, reference_no, created_at::date AS date, profit_currency AS currency_code, profit_amount,
            from_amount, to_amount, rate, cost_rate, fee
     FROM exchange_transactions
     WHERE profit_amount <> 0
     ORDER BY created_at DESC LIMIT 200`,
  );
  res.json({ profits: result.rows });
}));

router.get('/summary', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT profit_currency AS currency_code, created_at::date AS date,
            COALESCE(SUM(profit_amount),0) AS profit
     FROM exchange_transactions
     GROUP BY profit_currency, created_at::date
     ORDER BY date DESC, currency_code`,
  );
  res.json({ summary: result.rows });
}));

export default router;
