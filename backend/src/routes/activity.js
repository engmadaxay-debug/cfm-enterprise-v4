import { Router } from 'express';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 200), 1000);
  const staff = req.user.role !== 'ADMIN';
  const params = staff ? [req.user.id, limit] : [limit];
  const where = staff ? 'WHERE a.user_id=$1' : '';
  const limitPlaceholder = staff ? '$2' : '$1';
  const r = await pool.query(
    `SELECT a.*, u.full_name AS user_name
     FROM activity_logs a
     LEFT JOIN users u ON u.id=a.user_id
     ${where}
     ORDER BY a.created_at DESC LIMIT ${limitPlaceholder}`,
    params,
  );
  res.json({ activities: r.rows });
}));

router.post('/', asyncHandler(async (req, res) => {
  const { action, module = 'GENERAL', record_id = null, details = {} } = req.body;
  const r = await pool.query(
    `INSERT INTO activity_logs(user_id, action, module, record_id, details)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [req.user.id, action || 'Activity', module, record_id, details],
  );
  res.status(201).json({ activity: r.rows[0] });
}));

export default router;
