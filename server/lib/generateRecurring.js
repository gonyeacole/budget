import db from '../db.js';

function toDateString(year, monthIndex, day) {
  const d = new Date(Date.UTC(year, monthIndex, day));
  return d.toISOString().slice(0, 10);
}

function parts(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y, monthIndex: m - 1, day: d };
}

// Generates all missed occurrences (up to today) for every active recurring rule.
export function generateDueRecurringTransactions() {
  const today = new Date().toISOString().slice(0, 10);
  const rules = db.prepare('SELECT * FROM recurring_transactions WHERE active = 1').all();

  const insertTxn = db.prepare(
    'INSERT INTO transactions (date, amount, type, category_id, description, recurring_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const updateLastGenerated = db.prepare('UPDATE recurring_transactions SET last_generated_date = ? WHERE id = ?');

  const insertMany = db.transaction((rule) => {
    let candidate;

    if (rule.last_generated_date) {
      const p = parts(rule.last_generated_date);
      candidate = toDateString(p.year, p.monthIndex + 1, rule.day_of_month);
    } else {
      const p = parts(rule.start_date);
      candidate = toDateString(p.year, p.monthIndex, rule.day_of_month);
      if (candidate < rule.start_date) {
        candidate = toDateString(p.year, p.monthIndex + 1, rule.day_of_month);
      }
    }

    let lastGenerated = rule.last_generated_date;
    while (candidate <= today && (!rule.end_date || candidate <= rule.end_date)) {
      insertTxn.run(
        candidate,
        rule.amount,
        rule.type,
        rule.category_id,
        rule.description,
        rule.id,
        rule.created_by
      );
      lastGenerated = candidate;
      const p = parts(candidate);
      candidate = toDateString(p.year, p.monthIndex + 1, rule.day_of_month);
    }

    if (lastGenerated !== rule.last_generated_date) {
      updateLastGenerated.run(lastGenerated, rule.id);
    }
  });

  for (const rule of rules) insertMany(rule);
}
