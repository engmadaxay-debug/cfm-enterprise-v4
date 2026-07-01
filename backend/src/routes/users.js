import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler, requireFields } from '../utils/http.js';

const router = Router();
router.use(requireAdmin);

router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, full_name, email, role, is_active, created_at
     FROM users ORDER BY role, full_name`,
  );
  res.json({ users: result.rows });
}));

router.post('/', asyncHandler(async (req, res) => {
  requireFields(req.body, ['fullName', 'email', 'password']);
  const password = String(req.body.password);
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must have at least 8 characters.' });
  }
  const email = String(req.body.email).trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active)
     VALUES ($1,$2,$3,'STAFF',TRUE)
     RETURNING id, full_name, email, role, is_active, created_at`,
    [String(req.body.fullName).trim(), email, passwordHash],
  );
  res.status(201).json({ user: result.rows[0] });
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  if (typeof req.body.isActive !== 'boolean') {
    return res.status(400).json({ message: 'isActive must be true or false.' });
  }
  const isActive = req.body.isActive;
  if (userId === req.user.id && !isActive) {
    return res.status(400).json({ message: 'You cannot disable your own admin account.' });
  }
  const result = await pool.query(
    `UPDATE users SET is_active=$1 WHERE id=$2 AND role='STAFF'
     RETURNING id, full_name, email, role, is_active, created_at`,
    [isActive, userId],
  );
  if (!result.rows[0]) return res.status(404).json({ message: 'Staff account not found.' });
  res.json({ user: result.rows[0] });
}));

router.patch('/:id/password', asyncHandler(async (req, res) => {
  requireFields(req.body, ['password']);
  const password = String(req.body.password);
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must have at least 8 characters.' });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `UPDATE users SET password_hash=$1 WHERE id=$2 AND role='STAFF'
     RETURNING id, full_name, email, role, is_active, created_at`,
    [passwordHash, req.params.id],
  );
  if (!result.rows[0]) return res.status(404).json({ message: 'Staff account not found.' });
  res.json({ user: result.rows[0] });
}));

export default router;
