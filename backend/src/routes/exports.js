import { Router } from 'express';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';
const router = Router();

function csvEscape(v) { return `"${String(v ?? '').replaceAll('"', '""')}"`; }
function toCsv(rows) { if (!rows.length) return 'No data\n'; const keys = Object.keys(rows[0]); return [keys.map(csvEscape).join(','), ...rows.map(r => keys.map(k => csvEscape(r[k])).join(','))].join('\n'); }
function htmlReport(title, rows) { const keys = rows[0] ? Object.keys(rows[0]) : ['message']; const data = rows.length ? rows : [{ message: 'No data' }]; return `<!doctype html><html><head><title>${title}</title><style>body{font-family:Arial;padding:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}th{background:#f3f4f6}</style></head><body><h1>${title}</h1><p>Use browser Print → Save as PDF.</p><table><thead><tr>${keys.map(k=>`<th>${k}</th>`).join('')}</tr></thead><tbody>${data.map(r=>`<tr>${keys.map(k=>`<td>${r[k] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`; }

async function getRows(report, req) {
  const staff = req.user.role !== 'ADMIN';
  const params = staff ? [req.user.id] : [];
  const owner = staff ? 'WHERE created_by=$1' : '';
  const ownerJournal = staff ? 'WHERE tj.created_by=$1' : '';
  if (report === 'journal') return (await pool.query(`SELECT transaction_date, transaction_no, module, transaction_type, amount, currency_code, reference_no FROM transaction_journal tj ${ownerJournal} ORDER BY created_at DESC LIMIT 2000`, params)).rows;
  if (report === 'people') return (await pool.query(`SELECT code, name, phone, person_type, opening_balance, created_at FROM people ${owner} ORDER BY name LIMIT 2000`, params)).rows;
  if (report === 'vaults') return (await pool.query(`SELECT name, currency_code, balance, created_at FROM vault_accounts ${owner} ORDER BY currency_code,name`, params)).rows;
  if (report === 'profit') return (await pool.query(`SELECT profit_date, exchange_transaction_id, profit_amount, currency_code, notes FROM exchange_profit ${owner} ORDER BY profit_date DESC LIMIT 2000`, params)).rows;
  return (await pool.query(`SELECT transaction_date, transaction_no, module, transaction_type, amount, currency_code FROM transaction_journal tj ${ownerJournal} ORDER BY created_at DESC LIMIT 2000`, params)).rows;
}

router.get('/:report.csv', asyncHandler(async (req, res) => {
  const rows = await getRows(req.params.report, req);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="cfm-${req.params.report}.csv"`);
  res.send(toCsv(rows));
}));

router.get('/:report.html', asyncHandler(async (req, res) => {
  const rows = await getRows(req.params.report, req);
  res.setHeader('Content-Type', 'text/html');
  res.send(htmlReport(`CFM ${req.params.report.toUpperCase()} Report`, rows));
}));

export default router;
