import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler, requireFields } from '../utils/http.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM currencies ORDER BY code');
  res.json({ currencies: result.rows });
}));

router.post('/', requireAdmin, asyncHandler(async (req, res) => {
  requireFields(req.body, ['code', 'name']);
  const result = await pool.query(
    `INSERT INTO currencies (code, name, symbol, is_active)
     VALUES (UPPER($1), $2, $3, COALESCE($4, TRUE))
     ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, symbol=EXCLUDED.symbol, is_active=EXCLUDED.is_active
     RETURNING *`,
    [req.body.code.trim(), req.body.name.trim(), req.body.symbol || null, req.body.isActive ?? true],
  );
  res.status(201).json({ currency: result.rows[0] });
}));

export default router;
