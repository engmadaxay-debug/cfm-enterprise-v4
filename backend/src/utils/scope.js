import { pool } from '../config/db.js';

export function isAdmin(user) {
  return user?.role === 'ADMIN';
}

export function isManager(user) {
  return user?.role === 'MANAGER';
}

export async function getSetting(key, fallback = null) {
  const result = await pool.query('SELECT setting_value FROM app_settings WHERE setting_key=$1', [key]);
  return result.rows[0]?.setting_value ?? fallback;
}

export async function isStaffIsolationEnabled() {
  const value = await getSetting('staff_isolation_enabled', 'true');
  return String(value).toLowerCase() !== 'false';
}

export async function canViewAllRecords(user) {
  if (isAdmin(user)) return true;
  if (!(await isStaffIsolationEnabled())) return true;
  if (isManager(user)) {
    const value = await getSetting('manager_can_view_all', 'false');
    return String(value).toLowerCase() === 'true';
  }
  return false;
}

export async function ownerClause(req, alias = '') {
  const canViewAll = await canViewAllRecords(req.user);
  if (canViewAll) return { clause: '', params: [], canViewAll };
  const prefix = alias ? `${alias}.` : '';
  return { clause: `${prefix}created_by=$1`, params: [req.user.id], canViewAll };
}

export function appendOwnerFilter(parts, params, userId, alias = '') {
  const prefix = alias ? `${alias}.` : '';
  params.push(userId);
  parts.push(`${prefix}created_by=$${params.length}`);
}

export async function ensureRecordOwner({ table, id, user, ownerColumn = 'created_by' }) {
  if (await canViewAllRecords(user)) return true;
  const result = await pool.query(`SELECT ${ownerColumn} FROM ${table} WHERE id=$1`, [id]);
  if (!result.rows[0]) return false;
  return Number(result.rows[0][ownerColumn]) === Number(user.id);
}
