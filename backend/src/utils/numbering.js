export async function nextNumber(client, key) {
  const result = await client.query(
    `UPDATE number_sequences
     SET current_value=current_value+1, updated_at=NOW()
     WHERE sequence_key=$1
     RETURNING prefix, current_value, padding`,
    [key],
  );
  if (!result.rows[0]) {
    const error = new Error(`Number sequence not found: ${key}`);
    error.status = 500;
    throw error;
  }
  const row = result.rows[0];
  return `${row.prefix}${String(row.current_value).padStart(row.padding, '0')}`;
}

export async function addJournal(client, userId, data) {
  const transactionNo = await nextNumber(client, 'transaction');
  const amount = Number(data.amount ?? Math.max(Number(data.debit || 0), Number(data.credit || 0)));
  const result = await client.query(
    `INSERT INTO transaction_journal
     (transaction_no, transaction_date, module, transaction_type, person_id, vault_id, debit, credit, amount, currency_code, reference_no, description, source_table, source_id, created_by)
     VALUES ($1,COALESCE($2,CURRENT_DATE),$3,$4,$5,$6,$7,$8,$9,UPPER($10),$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      transactionNo,
      data.transactionDate || null,
      data.module,
      data.transactionType,
      data.personId || null,
      data.vaultId || null,
      data.debit || 0,
      data.credit || 0,
      amount,
      data.currencyCode || 'USD',
      data.referenceNo || null,
      data.description || null,
      data.sourceTable || null,
      data.sourceId || null,
      userId,
    ],
  );
  return result.rows[0];
}
