import { Router } from 'express';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';
import { requireAdmin } from '../middleware/auth.js';
import { getSetting, isStaffIsolationEnabled } from '../utils/scope.js';

const router = Router();

router.get('/settings', asyncHandler(async (req, res) => {
  const settings = {
    staff_isolation_enabled: await isStaffIsolationEnabled(),
    manager_can_view_all: String(await getSetting('manager_can_view_all', 'false')).toLowerCase() === 'true',
    restrict_reports: String(await getSetting('restrict_reports', 'true')).toLowerCase() !== 'false',
    restrict_search: String(await getSetting('restrict_search', 'true')).toLowerCase() !== 'false',
  };
  res.json({ settings });
}));

router.put('/settings', requireAdmin, asyncHandler(async (req, res) => {
  const allowed = ['staff_isolation_enabled', 'manager_can_view_all', 'restrict_reports', 'restrict_search'];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      await pool.query(
        `INSERT INTO app_settings(setting_key, setting_value, updated_at) VALUES($1,$2,NOW())
         ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value, updated_at=NOW()`,
        [key, String(Boolean(req.body[key]))],
      );
    }
  }
  await pool.query(
    `INSERT INTO activity_logs(user_id,action,module,details) VALUES($1,'Updated staff isolation settings','SECURITY',$2)`,
    [req.user.id, JSON.stringify(req.body)],
  );
  res.json({ message: 'Staff isolation settings updated.' });
}));

router.get('/preview', asyncHandler(async (req, res) => {
  const ownerId = req.user.id;
  const [people, money, journal, cash, exchange] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM people WHERE created_by=$1', [ownerId]),
    pool.query('SELECT COUNT(*)::int AS count FROM money_records WHERE created_by=$1', [ownerId]),
    pool.query('SELECT COUNT(*)::int AS count FROM transaction_journal WHERE created_by=$1', [ownerId]),
    pool.query('SELECT COUNT(*)::int AS count FROM cash_transactions WHERE created_by=$1', [ownerId]),
    pool.query('SELECT COUNT(*)::int AS count FROM exchange_transactions WHERE created_by=$1', [ownerId]),
  ]);
  res.json({
    user_id: ownerId,
    role: req.user.role,
    visible_if_isolated: {
      people: people.rows[0].count,
      money_records: money.rows[0].count,
      transaction_journal: journal.rows[0].count,
      cash_transactions: cash.rows[0].count,
      exchange_transactions: exchange.rows[0].count,
    },
  });
}));

export default router;
