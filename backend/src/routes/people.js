import { Router } from 'express';
import { pool } from '../config/db.js';
import { asyncHandler, requireFields } from '../utils/http.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const clauses = [];
  const params = [];

  if (req.user.role !== 'ADMIN') {
    params.push(req.user.id);
    clauses.push(`p.created_by=$${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(p.name ILIKE $${params.length} OR p.phone ILIKE $${params.length} OR p.email ILIKE $${params.length})`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT p.*, u.full_name AS created_by_name
     FROM people p LEFT JOIN users u ON u.id=p.created_by
     ${where}
     ORDER BY p.created_at DESC`,
    params,
  );
  res.json({ people: result.rows });
}));

router.post('/', asyncHandler(async (req, res) => {
  requireFields(req.body, ['name']);
  const { name, phone = null, email = null, address = null, personType = 'CUSTOMER', notes = null } = req.body;
  const result = await pool.query(
    `INSERT INTO people (name, phone, email, address, person_type, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [name.trim(), phone || null, email || null, address || null, personType, notes || null, req.user.id],
  );
  res.status(201).json({ person: result.rows[0] });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  requireFields(req.body, ['name']);
  const { name, phone = null, email = null, address = null, personType = 'CUSTOMER', notes = null } = req.body;
  const params = [name.trim(), phone || null, email || null, address || null, personType, notes || null, req.params.id];
  let owner = '';
  if (req.user.role !== 'ADMIN') {
    params.push(req.user.id);
    owner = ` AND created_by=$${params.length}`;
  }
  const result = await pool.query(
    `UPDATE people SET name=$1, phone=$2, email=$3, address=$4, person_type=$5, notes=$6, updated_at=NOW()
     WHERE id=$7${owner} RETURNING *`,
    params,
  );
  if (!result.rows[0]) return res.status(404).json({ message: 'Person not found or not accessible.' });
  res.json({ person: result.rows[0] });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const params = [req.params.id];
  let owner = '';
  if (req.user.role !== 'ADMIN') {
    params.push(req.user.id);
    owner = ` AND created_by=$${params.length}`;
  }
  const result = await pool.query(`DELETE FROM people WHERE id=$1${owner} RETURNING id`, params);
  if (!result.rows[0]) return res.status(404).json({ message: 'Person not found or not accessible.' });
  res.status(204).end();
}));

export default router;
