
import { Router } from 'express';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';
const router = Router();

function owner(req, alias='') {
  const p=[]; let w='';
  if (req.user.role !== 'ADMIN') { p.push(req.user.id); w = ` AND ${alias}created_by=$${p.length}`; }
  return {p,w};
}

router.get('/customers', asyncHandler(async (req,res)=>{
  const search=String(req.query.search||'').trim();
  const params=[]; const clauses=["person_type='CUSTOMER'"];
  if(req.user.role!=='ADMIN'){ params.push(req.user.id); clauses.push(`created_by=$${params.length}`); }
  if(search){ params.push(`%${search}%`); clauses.push(`(name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length})`); }
  const people=await pool.query(`SELECT * FROM people WHERE ${clauses.join(' AND ')} ORDER BY name`, params);
  res.json({customers:people.rows});
}));

router.get('/suppliers', asyncHandler(async (req,res)=>{
  const search=String(req.query.search||'').trim();
  const params=[]; const clauses=["person_type IN ('VENDOR','SUPPLIER')"];
  if(req.user.role!=='ADMIN'){ params.push(req.user.id); clauses.push(`created_by=$${params.length}`); }
  if(search){ params.push(`%${search}%`); clauses.push(`(name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length})`); }
  const people=await pool.query(`SELECT * FROM people WHERE ${clauses.join(' AND ')} ORDER BY name`, params);
  res.json({suppliers:people.rows});
}));

router.get('/person/:id', asyncHandler(async (req,res)=>{
  const params=[req.params.id];
  let owner='';
  if(req.user.role!=='ADMIN'){ params.push(req.user.id); owner=` AND p.created_by=$${params.length}`; }
  const person=await pool.query(`SELECT * FROM people p WHERE p.id=$1${owner}`, params);
  if(!person.rows[0]) return res.status(404).json({message:'Person not found.'});
  const money=await pool.query(`SELECT * FROM money_records WHERE person_id=$1 ORDER BY created_at DESC`, [req.params.id]);
  const cash=await pool.query(`SELECT c.*, v.currency_code FROM cash_transactions c JOIN vault_accounts v ON v.id=c.vault_id WHERE c.person_id=$1 ORDER BY c.transaction_date DESC, c.created_at DESC`, [req.params.id]);
  const invoices=await pool.query(`SELECT * FROM invoices WHERE person_id=$1 ORDER BY issue_date DESC, created_at DESC`, [req.params.id]);
  res.json({person:person.rows[0], money:money.rows, cash:cash.rows, invoices:invoices.rows});
}));

export default router;
