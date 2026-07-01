import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { asyncHandler, requireFields } from '../utils/http.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

function requestMeta(req) {
  return {
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
  };
}

router.post('/login', asyncHandler(async (req, res) => {
  requireFields(req.body, ['email', 'password']);
  const email = String(req.body.email).trim().toLowerCase();
  const meta = requestMeta(req);
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  const valid = user && user.is_active && (await bcrypt.compare(req.body.password, user.password_hash));

  if (!valid) {
    await pool.query(
      `INSERT INTO login_history(email,user_id,success,ip_address,user_agent,reason)
       VALUES($1,$2,false,$3,$4,$5)`,
      [email, user?.id || null, meta.ip, meta.userAgent, 'Invalid credentials or disabled account'],
    );
    return res.status(401).json({ message: 'Email or password is incorrect, or the account is disabled.' });
  }

  const sessionId = crypto.randomUUID();
  const token = jwt.sign(
    { id: user.id, sessionId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.SESSION_TIMEOUT || '12h' },
  );

  await pool.query(
    `INSERT INTO login_history(email,user_id,success,ip_address,user_agent) VALUES($1,$2,true,$3,$4)`,
    [email, user.id, meta.ip, meta.userAgent],
  );
  await pool.query(
    `INSERT INTO user_sessions(session_id,user_id,ip_address,user_agent,last_seen_at,is_active)
     VALUES($1,$2,$3,$4,NOW(),true)
     ON CONFLICT(session_id) DO UPDATE SET last_seen_at=NOW(), is_active=true`,
    [sessionId, user.id, meta.ip, meta.userAgent],
  );

  res.json({
    token,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
    },
  });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

export default router;
