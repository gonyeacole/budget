import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/transactions?month=YYYY-MM&category_id=1&type=expense
router.get('/', (req, res) => {
  const { month, category_id, type } = req.query;
  let sql = `
    SELECT t.*, c.name as category_name, c.color as category_color, u.name as created_by_name
    FROM transactions t
    JOIN categories c ON c.id = t.category_id
    LEFT JOIN users u ON u.id = t.created_by
    WHERE 1 = 1
  `;
  const params = [];

  if (month) {
    sql += ' AND t.date LIKE ?';
    params.push(`${month}%`);
  }
  if (category_id) {
    sql += ' AND t.category_id = ?';
    params.push(category_id);
  }
  if (type) {
    sql += ' AND t.type = ?';
    params.push(type);
  }
  sql += ' ORDER BY t.date DESC, t.id DESC';

  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const { date, amount, type, category_id, description } = req.body;
  if (!date || !amount || !['income', 'expense'].includes(type) || !category_id) {
    return res.status(400).json({ error: 'date, amount, type and category_id are required' });
  }

  const info = db
    .prepare(
      'INSERT INTO transactions (date, amount, type, category_id, description, created_by) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(date, Math.abs(amount), type, category_id, description || '', req.user.id);

  res.status(201).json(
    db
      .prepare(
        `SELECT t.*, c.name as category_name, c.color as category_color, u.name as created_by_name
         FROM transactions t JOIN categories c ON c.id = t.category_id
         LEFT JOIN users u ON u.id = t.created_by WHERE t.id = ?`
      )
      .get(info.lastInsertRowid)
  );
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Transaction not found' });

  const { date, amount, type, category_id, description } = req.body;
  db.prepare(
    'UPDATE transactions SET date = ?, amount = ?, type = ?, category_id = ?, description = ? WHERE id = ?'
  ).run(
    date || existing.date,
    amount !== undefined ? Math.abs(amount) : existing.amount,
    type && ['income', 'expense'].includes(type) ? type : existing.type,
    category_id || existing.category_id,
    description !== undefined ? description : existing.description,
    req.params.id
  );

  res.json(
    db
      .prepare(
        `SELECT t.*, c.name as category_name, c.color as category_color, u.name as created_by_name
         FROM transactions t JOIN categories c ON c.id = t.category_id
         LEFT JOIN users u ON u.id = t.created_by WHERE t.id = ?`
      )
      .get(req.params.id)
  );
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Transaction not found' });

  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
