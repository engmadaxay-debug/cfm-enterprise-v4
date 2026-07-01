import { pool } from '../config/db.js';

export function activityLogger(req, res, next) {
  res.on('finish', async () => {
    try {
      if (!req.user?.id) return;
      if (!['POST','PUT','PATCH','DELETE'].includes(req.method)) return;
      if (res.statusCode >= 400) return;
      const module = req.path.split('/').filter(Boolean)[1]?.toUpperCase() || 'GENERAL';
      await pool.query(
        `INSERT INTO activity_logs(user_id, action, module, record_id, details, ip_address)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [req.user.id, `${req.method} ${req.originalUrl}`, module, null, { statusCode: res.statusCode }, req.ip],
      );
    } catch (err) {
      // Logging should never break the main request.
      console.error('Activity log failed:', err.message);
    }
  });
  next();
}
