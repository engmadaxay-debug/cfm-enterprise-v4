import { Router } from 'express';
import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/http.js';
import { canViewAllRecords } from '../utils/scope.js';

const router = Router();

function dateWindow(view, baseDate) {
  const base = baseDate ? new Date(`${baseDate}T00:00:00`) : new Date();
  const start = new Date(base);
  const end = new Date(base);
  if (view === 'weekly') {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    end.setDate(start.getDate() + 6);
  } else if (view === 'monthly') {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  }
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

router.get('/', asyncHandler(async (req, res) => {
  const view = ['daily', 'weekly', 'monthly'].includes(req.query.view) ? req.query.view : 'daily';
  const [from, to] = dateWindow(view, req.query.date);
  const canViewAll = await canViewAllRecords(req.user);
  const params = [from, to];
  const owner = canViewAll ? '' : `AND mr.created_by=$3`;
  if (!canViewAll) params.push(req.user.id);

  const [due, overdue, closings] = await Promise.all([
    pool.query(
      `SELECT mr.id, mr.category, mr.remaining_amount AS amount, mr.currency_code, mr.due_date,
              mr.status, p.name AS person_name
       FROM money_records mr
       JOIN people p ON p.id=mr.person_id
       WHERE mr.due_date BETWEEN $1 AND $2
         AND mr.status IN ('OPEN','PARTIAL') ${owner}
       ORDER BY mr.due_date ASC, p.name ASC`,
      params,
    ),
    pool.query(
      `SELECT mr.id, mr.category, mr.remaining_amount AS amount, mr.currency_code, mr.due_date,
              mr.status, p.name AS person_name
       FROM money_records mr
       JOIN people p ON p.id=mr.person_id
       WHERE mr.due_date < CURRENT_DATE
         AND mr.status IN ('OPEN','PARTIAL') ${canViewAll ? '' : 'AND mr.created_by=$1'}
       ORDER BY mr.due_date ASC, p.name ASC`,
      canViewAll ? [] : [req.user.id],
    ),
    pool.query(
      `SELECT dc.id, dc.closing_no, dc.closing_date, dc.status, dc.currency_code,
              dc.expected_closing, dc.counted_closing, v.name AS vault_name
       FROM daily_closings dc
       LEFT JOIN vault_accounts v ON v.id=dc.vault_id
       WHERE dc.closing_date BETWEEN $1 AND $2 ${canViewAll ? '' : 'AND dc.created_by=$3'}
       ORDER BY dc.closing_date DESC`,
      params,
    ),
  ]);

  const reminders = [];
  const today = new Date().toISOString().slice(0, 10);
  const todayClosing = closings.rows.find((x) => String(x.closing_date).slice(0, 10) === today);
  if (!todayClosing) reminders.push({ type: 'DAILY_CLOSING', title: 'Daily closing pending', due_date: today, priority: 'HIGH' });
  if (new Date().getDate() >= 25) reminders.push({ type: 'MONTHLY_CLOSING', title: 'Monthly closing reminder', due_date: today, priority: 'MEDIUM' });

  res.json({ view, from, to, due: due.rows, overdue: overdue.rows, closings: closings.rows, reminders, scope: canViewAll ? 'ALL_DATA' : 'MY_DATA' });
}));

router.get('/events', asyncHandler(async (req, res) => {
  const canViewAll = await canViewAllRecords(req.user);
  const owner = canViewAll ? '' : 'AND created_by=$1';
  const params = canViewAll ? [] : [req.user.id];
  const result = await pool.query(
    `SELECT id, event_title, event_type, event_date, priority, status, related_module, related_id
     FROM calendar_events
     WHERE status <> 'DONE' ${owner}
     ORDER BY event_date ASC, priority DESC
     LIMIT 200`,
    params,
  );
  res.json({ events: result.rows, scope: canViewAll ? 'ALL_DATA' : 'MY_DATA' });
}));

router.post('/events', asyncHandler(async (req, res) => {
  const { event_title, event_type='REMINDER', event_date, priority='MEDIUM', related_module, related_id, notes } = req.body;
  if (!event_title || !event_date) return res.status(400).json({ message: 'event_title and event_date are required.' });
  const result = await pool.query(
    `INSERT INTO calendar_events(event_title,event_type,event_date,priority,related_module,related_id,notes,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [event_title, event_type, event_date, priority, related_module || null, related_id || null, notes || null, req.user.id],
  );
  res.status(201).json({ event: result.rows[0] });
}));

router.patch('/events/:id/done', asyncHandler(async (req, res) => {
  const canViewAll = await canViewAllRecords(req.user);
  const params = [req.params.id];
  const owner = canViewAll ? '' : 'AND created_by=$2';
  if (!canViewAll) params.push(req.user.id);
  const result = await pool.query(`UPDATE calendar_events SET status='DONE', updated_at=NOW() WHERE id=$1 ${owner} RETURNING *`, params);
  if (!result.rows[0]) return res.status(404).json({ message: 'Calendar event not found.' });
  res.json({ event: result.rows[0] });
}));

export default router;
