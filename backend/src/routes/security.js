import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';
import { requireAdmin } from '../middleware/auth.js';
import { canViewAllRecords } from '../utils/scope.js';

const router = Router();

router.get('/login-history', asyncHandler(async (req, res) => {
  const canViewAll = await canViewAllRecords(req.user);
  const params = canViewAll ? [] : [req.user.id];
  const owner = canViewAll ? '' : 'WHERE lh.user_id=$1';
  const result = await pool.query(
    `SELECT lh.*, u.full_name, u.email FROM login_history lh
     LEFT JOIN users u ON u.id=lh.user_id
     ${owner} ORDER BY lh.created_at DESC LIMIT 200`,
    params,
  );
  res.json({ history: result.rows, scope: canViewAll ? 'ALL_DATA' : 'MY_DATA' });
}));

router.get('/sessions', asyncHandler(async (req, res) => {
  const canViewAll = await canViewAllRecords(req.user);
  const params = canViewAll ? [] : [req.user.id];
  const owner = canViewAll ? '' : 'WHERE s.user_id=$1';
  const result = await pool.query(
    `SELECT s.*, u.full_name, u.email FROM user_sessions s
     LEFT JOIN users u ON u.id=s.user_id
     ${owner} ORDER BY s.last_seen_at DESC LIMIT 200`,
    params,
  );
  res.json({ sessions: result.rows, scope: canViewAll ? 'ALL_DATA' : 'MY_DATA' });
}));

router.post('/force-logout/:userId', requireAdmin, asyncHandler(async (req, res) => {
  await pool.query('UPDATE user_sessions SET is_active=false WHERE user_id=$1', [req.params.userId]);
  await pool.query('INSERT INTO activity_logs(user_id,action,module,record_id) VALUES($1,$2,$3,$4)', [req.user.id, 'Force logout user', 'SECURITY', req.params.userId]);
  res.json({ message: 'User sessions marked inactive.' });
}));

router.post('/change-password', asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'Current password and a new password with 8+ characters are required.' });
  }
  const user = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  const ok = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
  if (!ok) return res.status(400).json({ message: 'Current password is incorrect.' });
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query('INSERT INTO password_history(user_id,password_hash) VALUES($1,$2)', [req.user.id, user.rows[0].password_hash]);
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
  res.json({ message: 'Password changed.' });
}));

export default router;
