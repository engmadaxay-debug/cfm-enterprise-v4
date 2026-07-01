import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { pool } from '../config/db.js';
import { ok } from '../utils/http.js';
import { validateRequired } from '../middleware/security.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.get('/health/production', async (req, res, next) => {
  try {
    const db = await pool.query('SELECT NOW() AS now');
    ok(res, {
      app: 'CFM Enterprise',
      version: '3.2 Phase 6',
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      database_time: db.rows[0].now,
      uptime_seconds: Math.round(process.uptime()),
      memory: process.memoryUsage()
    });
  } catch (err) { next(err); }
});

router.get('/swagger.json', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'Cimraan Finance Manager API', version: '3.2.0', description: 'CFM Enterprise production API documentation.' },
    servers: [{ url: process.env.API_PUBLIC_URL || 'http://localhost:5000/api' }],
    paths: {
      '/health': { get: { summary: 'Basic health check' } },
      '/phase6/health/production': { get: { summary: 'Production diagnostics' } },
      '/phase6/logs': { get: { summary: 'Admin log list' } },
      '/phase6/backup/run': { post: { summary: 'Run logical backup metadata entry' } },
      '/phase6/security-events': { get: { summary: 'Security events' } }
    }
  });
});

router.get('/logs', async (req, res) => {
  const logDir = path.resolve(process.cwd(), 'logs');
  const files = fs.existsSync(logDir) ? fs.readdirSync(logDir).filter(f => f.endsWith('.log')) : [];
  ok(res, files.map(file => ({ file, size_bytes: fs.statSync(path.join(logDir, file)).size })));
});

router.get('/security-events', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM security_events ORDER BY created_at DESC LIMIT 100');
    ok(res, result.rows);
  } catch (err) { next(err); }
});

router.post('/security-events', validateRequired(['event_type']), async (req, res, next) => {
  try {
    const { event_type, details = {} } = req.body;
    const result = await pool.query(
      `INSERT INTO security_events (user_id, event_type, ip_address, user_agent, details)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user?.id || null, event_type, req.ip, req.headers['user-agent'] || '', details]
    );
    logger.security(event_type, { user_id: req.user?.id, details });
    ok(res, result.rows[0], 'Security event saved');
  } catch (err) { next(err); }
});

router.post('/backup/run', async (req, res, next) => {
  try {
    const name = `CFM_BACKUP_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const counts = {};
    for (const table of ['users','people','vault_accounts','money_records','cash_transactions','exchange_transactions','transaction_journal']) {
      try {
        const c = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
        counts[table] = c.rows[0].count;
      } catch { counts[table] = null; }
    }
    const payload = { type: 'logical-backup-marker', name, counts, created_at: new Date().toISOString() };
    const result = await pool.query(
      `INSERT INTO production_backups (backup_name, status, metadata, created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, 'COMPLETED', payload, req.user?.id || null]
    );
    ok(res, result.rows[0], 'Backup marker created');
  } catch (err) { next(err); }
});

router.get('/backups', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM production_backups ORDER BY created_at DESC LIMIT 50');
    ok(res, result.rows);
  } catch (err) { next(err); }
});

router.get('/config-check', (req, res) => {
  ok(res, {
    required_environment: ['DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_PASSWORD', 'JWT_SECRET', 'CLIENT_URL'],
    optional_environment: ['API_PUBLIC_URL', 'RATE_LIMIT_MAX', 'SESSION_TIMEOUT_MINUTES', 'BACKUP_CRON'],
    docker_ready: true,
    swagger: '/api/phase6/swagger.json',
    production_health: '/api/phase6/health/production'
  });
});

export default router;
