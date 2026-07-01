import fs from 'fs';
import path from 'path';
import pool from '../src/config/db.js';

async function run() {
  const dir = path.resolve(process.cwd(), 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`Applying migration: ${file}`);
    await pool.query(sql);
  }
  await pool.end();
  console.log('Migrations completed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
