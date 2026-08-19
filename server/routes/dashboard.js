import { Router } from 'express';
import db from '../db.js';

const router = Router();

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

router.get('/summary', (req, res) => {
  const month = req.query.month || currentMonth();

  const totals = db
    .prepare(
      `SELECT type, COALESCE(SUM(amount), 0) as total
       FROM transactions WHERE date LIKE ? GROUP BY type`
    )
    .all(`${month}%`);

  const totalIncome = totals.find((t) => t.type === 'income')?.total || 0;
  const totalExpenses = totals.find((t) => t.type === 'expense')?.total || 0;

  const byCategory = db
    .prepare(
      `SELECT c.id, c.name, c.type, c.color, c.monthly_limit,
              COALESCE((
                SELECT SUM(t.amount) FROM transactions t
                WHERE t.category_id = c.id AND t.date LIKE ?
              ), 0) as spent
       FROM categories c
       ORDER BY c.type, c.name`
    )
    .all(`${month}%`);

  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const m = shiftMonth(month, -i);
    const rows = db
      .prepare(`SELECT type, COALESCE(SUM(amount), 0) as total FROM transactions WHERE date LIKE ? GROUP BY type`)
      .all(`${m}%`);
    trend.push({
      month: m,
      income: rows.find((r) => r.type === 'income')?.total || 0,
      expense: rows.find((r) => r.type === 'expense')?.total || 0,
    });
  }

  res.json({
    month,
    totalIncome,
    totalExpenses,
    net: totalIncome - totalExpenses,
    byCategory,
    trend,
  });
});

export default router;
