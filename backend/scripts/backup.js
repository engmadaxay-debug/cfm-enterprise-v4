import fs from 'fs';
import path from 'path';
import pool from '../src/config/db.js';

const tables = ['users','people','vault_accounts','money_records','cash_transactions','exchange_transactions','transaction_journal','audit_logs'];

async function run() {
  const outDir = path.resolve(process.cwd(), 'backups');
  fs.mkdirSync(outDir, { recursive: true });
  const backup = { created_at: new Date().toISOString(), tables: {} };
  for (const table of tables) {
    try {
      const result = await pool.query(`SELECT * FROM ${table} ORDER BY 1 DESC LIMIT 10000`);
      backup.tables[table] = result.rows;
    } catch (err) {
      backup.tables[table] = { error: err.message };
    }
  }
  const file = path.join(outDir, `cfm-backup-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(`Backup written: ${file}`);
  await pool.end();
}

run().catch((err) => { console.error(err); process.exit(1); });
