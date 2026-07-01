import express from 'express';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';

const router = express.Router();

const requiredTables = [
  'users','people','vault_accounts','exchange_rates','exchange_transactions',
  'money_records','money_payments','cash_transactions','invoices','invoice_items',
  'transaction_journal','opening_balances','currencies','reconciliations',
  'daily_closings','roles','role_permissions','activity_logs','number_sequences'
];

router.get('/diagnostics', asyncHandler(async (req, res) => {
  const tableResult = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1)`,
    [requiredTables]
  );
  const existing = new Set(tableResult.rows.map((row) => row.table_name));
  const missing = requiredTables.filter((table) => !existing.has(table));

  const counts = {};
  for (const table of requiredTables.filter((table) => existing.has(table))) {
    const countResult = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    counts[table] = countResult.rows[0].count;
  }

  const sequenceResult = existing.has('number_sequences')
    ? await pool.query('SELECT sequence_key, prefix, current_value, padding FROM number_sequences ORDER BY sequence_key')
    : { rows: [] };

  res.json({
    status: missing.length === 0 ? 'READY' : 'NEEDS_ATTENTION',
    version: 'CFM v3.0 Phase 4 Stable',
    checkedAt: new Date().toISOString(),
    database: {
      requiredTables: requiredTables.length,
      missingTables: missing,
      tableCounts: counts,
      sequences: sequenceResult.rows,
    },
    nextSteps: missing.length === 0
      ? ['Run npm install in backend and frontend', 'Run backend npm run db:init', 'Run backend npm run seed', 'Start backend and frontend']
      : ['Run backend npm run db:init again', 'Check PostgreSQL connection in backend/.env'],
  });
}));

router.get('/readiness', asyncHandler(async (req, res) => {
  const db = await pool.query('SELECT NOW() AS now');
  res.json({ ok: true, databaseTime: db.rows[0].now, app: 'Cimraan Finance Manager', version: '3.0 Phase 4 Stable' });
}));

export default router;
