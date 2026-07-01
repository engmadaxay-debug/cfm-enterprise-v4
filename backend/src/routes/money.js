import { Router } from 'express';
import { pool, withTransaction } from '../config/db.js';
import { asyncHandler, positiveNumber, requireFields } from '../utils/http.js';
import { addJournal } from '../utils/numbering.js';

const router = Router();
const allowedCategories = new Set(['RECEIVABLE', 'PAYABLE', 'HELD']);

router.get('/', asyncHandler(async (req, res) => {
  const category = String(req.query.category || '').toUpperCase();
  const clauses = [];
  const params = [];
  if (category) {
    params.push(category);
    clauses.push(`m.category=$${params.length}`);
  }
  if (req.user.role !== 'ADMIN') {
    params.push(req.user.id);
    clauses.push(`m.created_by=$${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT m.*, p.name AS person_name,
            COALESCE(SUM(mp.amount), 0) AS paid_amount,
            u.full_name AS created_by_name
     FROM money_records m
     JOIN people p ON p.id=m.person_id
     LEFT JOIN money_payments mp ON mp.money_record_id=m.id
     LEFT JOIN users u ON u.id=m.created_by
     ${where}
     GROUP BY m.id, p.name, u.full_name
     ORDER BY m.created_at DESC`,
    params,
  );
  res.json({ records: result.rows });
}));

router.post('/', asyncHandler(async (req, res) => {
  requireFields(req.body, ['personId', 'category', 'amount', 'currencyCode']);
  const category = String(req.body.category).toUpperCase();
  if (!allowedCategories.has(category)) return res.status(400).json({ message: 'Invalid money category.' });
  const amount = positiveNumber(req.body.amount);

  const record = await withTransaction(async (client) => {
    const personParams = [req.body.personId];
    let personOwner = '';
    if (req.user.role !== 'ADMIN') {
      personParams.push(req.user.id);
      personOwner = ' AND created_by=$2';
    }
    const person = await client.query(`SELECT id FROM people WHERE id=$1${personOwner}`, personParams);
    if (!person.rows[0]) {
      const error = new Error('Person not found or not accessible.');
      error.status = 404;
      throw error;
    }

    if (category === 'HELD') {
      if (!req.body.vaultId) {
        const error = new Error('vaultId is required when recording held money.');
        error.status = 400;
        throw error;
      }
      const vaultParams = [amount, req.body.vaultId, req.body.currencyCode];
      let vaultOwner = '';
      if (req.user.role !== 'ADMIN') {
        vaultParams.push(req.user.id);
        vaultOwner = ' AND created_by=$4';
      }
      const vault = await client.query(
        `UPDATE vault_accounts SET balance=balance+$1
         WHERE id=$2 AND currency_code=UPPER($3)${vaultOwner} RETURNING *`,
        vaultParams,
      );
      if (!vault.rows[0]) {
        const error = new Error('Held-money vault was not found, is not accessible, or currency does not match.');
        error.status = 400;
        throw error;
      }
    }

    const result = await client.query(
      `INSERT INTO money_records
       (person_id, category, original_amount, remaining_amount, currency_code, due_date, description, held_vault_id, created_by)
       VALUES ($1,$2,$3,$3,UPPER($4),$5,$6,$7,$8) RETURNING *`,
      [req.body.personId, category, amount, req.body.currencyCode.trim(), req.body.dueDate || null, req.body.description || null, category === 'HELD' ? req.body.vaultId : null, req.user.id],
    );
    await addJournal(client, req.user.id, {
      module: category,
      transactionType: 'CREATE',
      personId: req.body.personId,
      vaultId: category === 'HELD' ? req.body.vaultId : null,
      debit: category === 'RECEIVABLE' || category === 'HELD' ? amount : 0,
      credit: category === 'PAYABLE' ? amount : 0,
      amount,
      currencyCode: req.body.currencyCode,
      referenceNo: `MR-${result.rows[0].id}`,
      description: req.body.description || `${category} created`,
      sourceTable: 'money_records',
      sourceId: result.rows[0].id,
    });
    return result.rows[0];
  });

  res.status(201).json({ record });
}));

router.post('/:id/payment', asyncHandler(async (req, res) => {
  requireFields(req.body, ['vaultId', 'amount']);
  const amount = positiveNumber(req.body.amount);

  const result = await withTransaction(async (client) => {
    const recordParams = [req.params.id];
    let recordOwner = '';
    if (req.user.role !== 'ADMIN') {
      recordParams.push(req.user.id);
      recordOwner = ' AND created_by=$2';
    }
    const recordResult = await client.query(
      `SELECT * FROM money_records WHERE id=$1${recordOwner} FOR UPDATE`,
      recordParams,
    );
    const record = recordResult.rows[0];
    if (!record) {
      const error = new Error('Money record not found or not accessible.');
      error.status = 404;
      throw error;
    }
    if (amount > Number(record.remaining_amount)) {
      const error = new Error('Payment cannot exceed remaining amount.');
      error.status = 400;
      throw error;
    }

    const sign = record.category === 'RECEIVABLE' ? 1 : -1;
    const vaultParams = [amount * sign, req.body.vaultId, record.currency_code];
    let vaultOwner = '';
    if (req.user.role !== 'ADMIN') {
      vaultParams.push(req.user.id);
      vaultOwner = ' AND created_by=$4';
    }
    const vault = await client.query(
      `UPDATE vault_accounts SET balance=balance+$1
       WHERE id=$2 AND currency_code=$3${vaultOwner} AND (balance+$1)>=0 RETURNING *`,
      vaultParams,
    );
    if (!vault.rows[0]) {
      const error = new Error('Vault not found, not accessible, currency mismatch, or insufficient balance.');
      error.status = 400;
      throw error;
    }

    const remaining = Number(record.remaining_amount) - amount;
    const status = remaining === 0 ? (record.category === 'HELD' ? 'RELEASED' : 'PAID') : 'PARTIAL';
    const updated = await client.query(
      `UPDATE money_records SET remaining_amount=$1, status=$2, updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [remaining, status, record.id],
    );
    const payment = await client.query(
      `INSERT INTO money_payments (money_record_id, vault_id, amount, notes, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [record.id, req.body.vaultId, amount, req.body.notes || null, req.user.id],
    );
    await addJournal(client, req.user.id, {
      module: record.category,
      transactionType: record.category === 'PAYABLE' ? 'MAKE_PAYMENT' : 'RECEIVE_PAYMENT',
      personId: record.person_id,
      vaultId: req.body.vaultId,
      debit: record.category === 'PAYABLE' ? amount : 0,
      credit: record.category === 'RECEIVABLE' || record.category === 'HELD' ? amount : 0,
      amount,
      currencyCode: record.currency_code,
      referenceNo: `PAY-${payment.rows[0].id}`,
      description: req.body.notes || `${record.category} payment`,
      sourceTable: 'money_payments',
      sourceId: payment.rows[0].id,
    });
    return { record: updated.rows[0], payment: payment.rows[0], vault: vault.rows[0] };
  });

  res.status(201).json(result);
}));

export default router;
