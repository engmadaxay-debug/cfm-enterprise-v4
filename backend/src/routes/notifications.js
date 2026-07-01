import { Router } from 'express';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';
import { canViewAllRecords } from '../utils/scope.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const canViewAll = await canViewAllRecords(req.user);
  const owner = canViewAll ? '' : 'AND created_by=$1';
  const params = canViewAll ? [] : [req.user.id];

  const [dueToday, overdue, closing, manual] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS count FROM money_records
       WHERE due_date=CURRENT_DATE AND status IN ('OPEN','PARTIAL') ${owner}`,
      params,
    ),
    pool.query(
      `SELECT category, COUNT(*)::int AS count, COALESCE(SUM(remaining_amount),0)::numeric(18,2) AS total
       FROM money_records WHERE due_date<CURRENT_DATE AND status IN ('OPEN','PARTIAL') ${owner}
       GROUP BY category`,
      params,
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM daily_closings
       WHERE closing_date=CURRENT_DATE ${owner}`,
      params,
    ),
    pool.query(
      `SELECT id, title, message, notification_type, priority, is_read, created_at
       FROM notifications WHERE is_read=false ${owner}
       ORDER BY created_at DESC LIMIT 50`,
      params,
    ),
  ]);

  const notifications = [...manual.rows];
  if (dueToday.rows[0].count > 0) notifications.unshift({ notification_type: 'DUE_TODAY', priority: 'HIGH', title: 'Due today', message: `${dueToday.rows[0].count} payment(s) due today.`, is_read: false });
  for (const row of overdue.rows) {
    notifications.unshift({ notification_type: 'OVERDUE', priority: 'HIGH', title: `${row.category} overdue`, message: `${row.count} record(s), total ${row.total}.`, is_read: false });
  }
  if (closing.rows[0].count === 0) notifications.unshift({ notification_type: 'DAILY_CLOSING', priority: 'MEDIUM', title: 'Daily closing pending', message: 'No daily closing has been recorded for today.', is_read: false });

  res.json({ notifications, unreadCount: notifications.filter((n) => !n.is_read).length, scope: canViewAll ? 'ALL_DATA' : 'MY_DATA' });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { title, message, notification_type='INFO', priority='MEDIUM', user_id } = req.body;
  const targetUser = req.user.role === 'ADMIN' && user_id ? user_id : req.user.id;
  const result = await pool.query(
    `INSERT INTO notifications(user_id,title,message,notification_type,priority,created_by)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [targetUser, title, message, notification_type, priority, req.user.id],
  );
  res.status(201).json({ notification: result.rows[0] });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  const canViewAll = await canViewAllRecords(req.user);
  const params = [req.params.id];
  const owner = canViewAll ? '' : 'AND user_id=$2';
  if (!canViewAll) params.push(req.user.id);
  const result = await pool.query(`UPDATE notifications SET is_read=true, read_at=NOW() WHERE id=$1 ${owner} RETURNING *`, params);
  if (!result.rows[0]) return res.status(404).json({ message: 'Notification not found.' });
  res.json({ notification: result.rows[0] });
}));

export default router;
