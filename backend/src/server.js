import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import { pool } from './config/db.js';

const port = Number(process.env.PORT || 4000);

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy .env.example to .env and set it.');
  process.exit(1);
}

try {
  await pool.query('SELECT 1');
  app.listen(port, () => console.log(`CFM Simple API running on http://localhost:${port}`));
} catch (error) {
  console.error('Could not connect to PostgreSQL:', error.message);
  process.exit(1);
}
