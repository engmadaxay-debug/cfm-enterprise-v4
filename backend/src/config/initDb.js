import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(currentDir, '../../sql/schema.sql');

try {
  const sql = await fs.readFile(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('Database schema initialized successfully.');
} catch (error) {
  console.error('Database initialization failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
