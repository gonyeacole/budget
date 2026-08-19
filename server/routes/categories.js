import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY type, name').all();
  res.json(categories);
});

router.post('/', (req, res) => {
  const { name, type, monthly_limit, color } = req.body;
  if (!name || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Name and a valid type (income/expense) are required' });
  }

  const info = db
    .prepare('INSERT INTO categories (name, type, monthly_limit, color) VALUES (?, ?, ?, ?)')
    .run(name.trim(), type, monthly_limit ?? null, color || '#6366f1');

  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  const { name, type, monthly_limit, color } = req.body;
  db.prepare('UPDATE categories SET name = ?, type = ?, monthly_limit = ?, color = ? WHERE id = ?').run(
    name?.trim() || existing.name,
    type && ['income', 'expense'].includes(type) ? type : existing.type,
    monthly_limit === undefined ? existing.monthly_limit : monthly_limit,
    color || existing.color,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  const inUse = db.prepare('SELECT COUNT(*) as c FROM transactions WHERE category_id = ?').get(req.params.id);
  if (inUse.c > 0) {
    return res.status(409).json({ error: 'Cannot delete a category that has transactions. Reassign or delete them first.' });
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
