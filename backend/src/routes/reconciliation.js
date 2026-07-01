import { Router } from 'express';
import { pool, withTransaction } from '../config/db.js';
import { asyncHandler, requireFields } from '../utils/http.js';
import { addJournal, nextNumber } from '../utils/numbering.js';

const router = Router();

async function getSystemBalance(client, type, personId, vaultId) {
  if (['CASH', 'VAULT', 'BANK'].includes(type)) {
    const r = await client.query('SELECT balance, currency_code FROM vault_accounts WHERE id=$1', [vaultId]);
    if (!r.rows[0]) throw Object.assign(new Error('Vault not found.'), { status: 404 });
    return { amount: Number(r.rows[0].balance), currency: r.rows[0].currency_code };
  }
  const r = await client.query(
    `SELECT COALESCE(SUM(debit-credit),0) AS balance, COALESCE(MAX(currency_code),'USD') AS currency_code
     FROM transaction_journal WHERE person_id=$1`,
    [personId],
  );
  return { amount: Number(r.rows[0].balance || 0), currency: r.rows[0].currency_code || 'USD' };
}

router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT r.*, p.name AS person_name, v.name AS vault_name, u.full_name AS created_by_name
     FROM reconciliations r
     LEFT JOIN people p ON p.id=r.person_id
     LEFT JOIN vault_accounts v ON v.id=r.vault_id
     LEFT JOIN users u ON u.id=r.created_by
     ORDER BY r.created_at DESC LIMIT 200`,
  );
  res.json({ reconciliations: result.rows });
}));

router.post('/', asyncHandler(async (req, res) => {
  requireFields(req.body, ['reconciliationType', 'countedBalance']);
  const type = String(req.body.reconciliationType).toUpperCase();
  const counted = Number(req.body.countedBalance || 0);
  const rec = await withTransaction(async (client) => {
    const system = await getSystemBalance(client, type, req.body.personId || null, req.body.vaultId || null);
    const difference = Number((counted - system.amount).toFixed(2));
    const status = difference === 0 ? 'MATCHED' : 'DIFFERENCE';
    const no = await nextNumber(client, 'reconciliation');
    const inserted = await client.query(
      `INSERT INTO reconciliations
       (reconciliation_no, reconciliation_date, reconciliation_type, person_id, vault_id, system_balance, counted_balance, difference, currency_code, status, notes, created_by)
       VALUES ($1,COALESCE($2,CURRENT_DATE),$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [no, req.body.reconciliationDate || null, type, req.body.personId || null, req.body.vaultId || null, system.amount, counted, difference, system.currency, status, req.body.notes || null, req.user.id],
    );
    await addJournal(client, req.user.id, {
      module: 'RECONCILIATION', transactionType: status, personId: req.body.personId || null, vaultId: req.body.vaultId || null,
      amount: Math.abs(difference), debit: difference > 0 ? difference : 0, credit: difference < 0 ? Math.abs(difference) : 0,
      currencyCode: system.currency, referenceNo: no, description: `Reconciliation ${type}: system ${system.amount}, counted ${counted}`,
      sourceTable: 'reconciliations', sourceId: inserted.rows[0].id,
    });
    return inserted.rows[0];
  });
  res.status(201).json({ reconciliation: rec });
}));

router.get('/summary', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT reconciliation_type, currency_code, COUNT(*)::int AS count,
            COALESCE(SUM(ABS(difference)),0) AS total_difference
     FROM reconciliations GROUP BY reconciliation_type, currency_code ORDER BY reconciliation_type, currency_code`,
  );
  res.json({ summary: result.rows });
}));

export default router;
