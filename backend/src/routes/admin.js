
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../utils/http.js';
const router=Router();
router.use(requireAdmin);
router.get('/roles', asyncHandler(async(req,res)=> {
 const roles=await pool.query('SELECT * FROM roles ORDER BY role_key');
 const permissions=await pool.query('SELECT * FROM role_permissions ORDER BY role_key, module_key');
 res.json({roles:roles.rows, permissions:permissions.rows});
}));
router.get('/audit-log', asyncHandler(async(req,res)=>{
 const r=await pool.query(`SELECT a.*, u.full_name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 500`);
 res.json({logs:r.rows});
}));
router.get('/settings', asyncHandler(async(req,res)=>{ const r=await pool.query('SELECT * FROM app_settings ORDER BY setting_key'); res.json({settings:r.rows}); }));
router.post('/settings', asyncHandler(async(req,res)=>{
 const r=await pool.query(`INSERT INTO app_settings(setting_key,setting_value) VALUES($1,$2) ON CONFLICT(setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value, updated_at=NOW() RETURNING *`, [req.body.key, req.body.value||'']);
 res.status(201).json({setting:r.rows[0]});
}));
router.post('/backup', asyncHandler(async(req,res)=>{
 const [people,vaults,money,cash,exchange,invoices]=await Promise.all([
  pool.query('SELECT * FROM people'), pool.query('SELECT * FROM vault_accounts'), pool.query('SELECT * FROM money_records'), pool.query('SELECT * FROM cash_transactions'), pool.query('SELECT * FROM exchange_transactions'), pool.query('SELECT * FROM invoices')
 ]);
 const data={createdAt:new Date().toISOString(), people:people.rows, vaults:vaults.rows, money:money.rows, cash:cash.rows, exchange:exchange.rows, invoices:invoices.rows};
 const name=req.body.name||`CFM Backup ${new Date().toISOString()}`;
 const r=await pool.query('INSERT INTO backups(backup_name, backup_data, created_by) VALUES($1,$2,$3) RETURNING id, backup_name, created_at', [name,data,req.user.id]);
 res.status(201).json({backup:r.rows[0], data});
}));
router.get('/backups', asyncHandler(async(req,res)=>{ const r=await pool.query('SELECT id, backup_name, created_at FROM backups ORDER BY created_at DESC'); res.json({backups:r.rows}); }));
export default router;
