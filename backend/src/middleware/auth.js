import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, full_name, email, role, is_active FROM users WHERE id=$1',
      [decoded.id],
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'This account is disabled or no longer exists.' });
    }

    if (decoded.sessionId) {
      const session = await pool.query('SELECT is_active FROM user_sessions WHERE session_id=$1 AND user_id=$2', [decoded.sessionId, user.id]);
      if (session.rows[0] && session.rows[0].is_active === false) {
        return res.status(401).json({ message: 'This session was ended by an administrator.' });
      }
      await pool.query('UPDATE user_sessions SET last_seen_at=NOW() WHERE session_id=$1 AND user_id=$2', [decoded.sessionId, user.id]);
    }

    req.user = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      sessionId: decoded.sessionId || null,
    };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access is required.' });
  }
  return next();
}
