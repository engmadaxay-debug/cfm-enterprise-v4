import { Router } from 'express';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAdmin);

router.get('/', asyncHandler(async (req, res) => {
  const [users, activeSessions, logins, activity, backups, failed] = await Promise.all([
    pool.query('SELECT role, COUNT(*)::int AS count FROM users GROUP BY role ORDER BY role'),
    pool.query('SELECT COUNT(*)::int AS count FROM user_sessions WHERE is_active=true AND last_seen_at > NOW() - INTERVAL \'30 minutes\''),
    pool.query('SELECT COUNT(*)::int AS count FROM login_history WHERE created_at::date=CURRENT_DATE AND success=true'),
    pool.query(`SELECT al.action, al.module, al.created_at, u.full_name FROM activity_logs al LEFT JOIN users u ON u.id=al.user_id ORDER BY al.created_at DESC LIMIT 20`),
    pool.query('SELECT backup_name, created_at FROM backups ORDER BY created_at DESC LIMIT 1'),
    pool.query('SELECT COUNT(*)::int AS count FROM login_history WHERE created_at > NOW() - INTERVAL \'24 hours\' AND success=false'),
  ]);

  res.json({
    usersByRole: users.rows,
    onlineUsers: activeSessions.rows[0].count,
    todaysLogins: logins.rows[0].count,
    failedLogins24h: failed.rows[0].count,
    latestBackup: backups.rows[0] || null,
    recentActivity: activity.rows,
    systemHealth: { database: 'OK', api: 'OK', version: 'CFM Enterprise v3.1 Phase 5' },
  });
}));

export default router;
