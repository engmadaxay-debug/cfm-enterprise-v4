import { Router } from 'express';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';
import { canViewAllRecords } from '../utils/scope.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const canViewAll = await canViewAllRecords(req.user);
  const owner = canViewAll ? '' : 'WHERE created_by=$1';
  const ownerAnd = canViewAll ? '' : 'AND created_by=$1';
  const params = canViewAll ? [] : [req.user.id];

  const [people, receivables, payables, exchange, activity, due] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS count FROM people ${owner}`, params),
    pool.query(`SELECT COALESCE(SUM(remaining_amount),0)::numeric(18,2) AS total FROM money_records WHERE category='RECEIVABLE' AND status IN ('OPEN','PARTIAL') ${ownerAnd}`, params),
    pool.query(`SELECT COALESCE(SUM(remaining_amount),0)::numeric(18,2) AS total FROM money_records WHERE category='PAYABLE' AND status IN ('OPEN','PARTIAL') ${ownerAnd}`, params),
    pool.query(`SELECT COUNT(*)::int AS count, COALESCE(SUM(profit_amount),0)::numeric(18,2) AS profit FROM exchange_transactions ${owner}`, params),
    pool.query(`SELECT action, module, created_at FROM activity_logs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10`, [req.user.id]),
    pool.query(`SELECT category, COUNT(*)::int AS count FROM money_records WHERE due_date<=CURRENT_DATE AND status IN ('OPEN','PARTIAL') ${ownerAnd} GROUP BY category`, params),
  ]);

  res.json({
    scope: canViewAll ? 'ALL_DATA' : 'MY_DATA',
    stats: {
      people: people.rows[0].count,
      receivables: receivables.rows[0].total,
      payables: payables.rows[0].total,
      exchange_count: exchange.rows[0].count,
      exchange_profit: exchange.rows[0].profit,
    },
    due: due.rows,
    recentActivity: activity.rows,
  });
}));

export default router;
