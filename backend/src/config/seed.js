import bcrypt from 'bcryptjs';
import { pool } from './db.js';

const name = process.env.ADMIN_NAME || 'CFM Admin';
const email = (process.env.ADMIN_EMAIL || 'admin@cimraan.local').toLowerCase();
const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const adminResult = await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, 'ADMIN', TRUE)
     ON CONFLICT (email)
     DO UPDATE SET full_name=EXCLUDED.full_name,
                   password_hash=EXCLUDED.password_hash,
                   role='ADMIN', is_active=TRUE
     RETURNING id`,
    [name, email, passwordHash],
  );
  const adminId = adminResult.rows[0].id;

  // Existing v1.0 data becomes admin-owned so it remains visible and protected.
  await pool.query('UPDATE people SET created_by=$1 WHERE created_by IS NULL', [adminId]);
  await pool.query('UPDATE vault_accounts SET created_by=$1 WHERE created_by IS NULL', [adminId]);
  await pool.query('UPDATE exchange_transactions SET created_by=$1 WHERE created_by IS NULL', [adminId]);
  await pool.query('UPDATE money_records SET created_by=$1 WHERE created_by IS NULL', [adminId]);
  await pool.query('UPDATE money_payments SET created_by=$1 WHERE created_by IS NULL', [adminId]);
  await pool.query('UPDATE cash_transactions SET created_by=$1 WHERE created_by IS NULL', [adminId]);

  const vaults = [
    ['Main Cash', 'USD', 0],
    ['Main Cash', 'CAD', 0],
    ['Main Cash', 'SOS', 0],
  ];

  for (const vault of vaults) {
    await pool.query(
      `INSERT INTO vault_accounts (name, currency_code, balance, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [...vault, adminId],
    );
  }

  console.log(`Seed complete. Admin login: ${email}`);
} catch (error) {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
