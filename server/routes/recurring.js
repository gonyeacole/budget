import { Router } from 'express';
import db from '../db.js';
import { generateDueRecurringTransactions } from '../lib/generateRecurring.js';

const router = Router();

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT r.*, c.name as category_name, c.color as category_color
       FROM recurring_transactions r JOIN categories c ON c.id = r.category_id
       ORDER BY r.active DESC, r.day_of_month`
    )
    .all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { description, amount, type, category_id, day_of_month, start_date, end_date } = req.body;
  if (!description || !amount || !['income', 'expense'].includes(type) || !category_id || !day_of_month || !start_date) {
    return res.status(400).json({
      error: 'description, amount, type, category_id, day_of_month and start_date are required',
    });
  }
  if (day_of_month < 1 || day_of_month > 28) {
    return res.status(400).json({ error: 'day_of_month must be between 1 and 28' });
  }

  const info = db
    .prepare(
      `INSERT INTO recurring_transactions
       (description, amount, type, category_id, day_of_month, start_date, end_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(description.trim(), Math.abs(amount), type, category_id, day_of_month, start_date, end_date || null, req.user.id);

  generateDueRecurringTransactions();

  res.status(201).json(
    db
      .prepare(
        `SELECT r.*, c.name as category_name, c.color as category_color
         FROM recurring_transactions r JOIN categories c ON c.id = r.category_id WHERE r.id = ?`
      )
      .get(info.lastInsertRowid)
  );
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM recurring_transactions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Recurring transaction not found' });

  const { description, amount, type, category_id, day_of_month, start_date, end_date, active } = req.body;
  db.prepare(
    `UPDATE recurring_transactions SET
       description = ?, amount = ?, type = ?, category_id = ?, day_of_month = ?,
       start_date = ?, end_date = ?, active = ?
     WHERE id = ?`
  ).run(
    description?.trim() || existing.description,
    amount !== undefined ? Math.abs(amount) : existing.amount,
    type && ['income', 'expense'].includes(type) ? type : existing.type,
    category_id || existing.category_id,
    day_of_month || existing.day_of_month,
    start_date || existing.start_date,
    end_date !== undefined ? end_date : existing.end_date,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    req.params.id
  );

  generateDueRecurringTransactions();

  res.json(
    db
      .prepare(
        `SELECT r.*, c.name as category_name, c.color as category_color
         FROM recurring_transactions r JOIN categories c ON c.id = r.category_id WHERE r.id = ?`
      )
      .get(req.params.id)
  );
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM recurring_transactions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Recurring transaction not found' });

  db.prepare('DELETE FROM recurring_transactions WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
