import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import api from '../api';
import { formatCurrency, shiftMonth, formatMonthLabel, currentMonth } from '../utils';
import './Dashboard.css';

const PALETTE = ['#4f46e5', '#0ea5e9', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#0891b2', '#ca8a04'];

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/dashboard/summary', { params: { month } })
      .then((res) => !cancelled && setData(res.data))
      .catch(() => !cancelled && setError('Could not load dashboard data'));
    return () => {
      cancelled = true;
    };
  }, [month]);

  if (error) return <div className="error-text">{error}</div>;
  if (!data) return <p>Loading…</p>;

  const expenseCategories = data.byCategory.filter((c) => c.type === 'expense');
  const pieData = expenseCategories
    .filter((c) => c.spent > 0)
    .map((c) => ({ name: c.name, value: c.spent, color: c.color }));

  const trendData = data.trend.map((t) => ({
    ...t,
    label: formatMonthLabel(t.month).split(' ')[0].slice(0, 3),
  }));

  return (
    <div>
      <div className="month-nav">
        <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
        <span className="month-label">{formatMonthLabel(month)}</span>
        <button onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">›</button>
        {month !== currentMonth() && (
          <button className="btn-secondary" style={{ width: 'auto', padding: '0 0.75rem' }} onClick={() => setMonth(currentMonth())}>
            Today
          </button>
        )}
      </div>

      <div className="summary-row">
        <div className="card summary-card">
          <div className="summary-label">Income</div>
          <div className="summary-value amount-income">{formatCurrency(data.totalIncome)}</div>
        </div>
        <div className="card summary-card">
          <div className="summary-label">Expenses</div>
          <div className="summary-value amount-expense">{formatCurrency(data.totalExpenses)}</div>
        </div>
        <div className="card summary-card">
          <div className="summary-label">Net</div>
          <div className="summary-value" style={{ color: data.net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {formatCurrency(data.net)}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card chart-card">
          <h3>Spending by category</h3>
          {pieData.length === 0 ? (
            <div className="empty-state">No expenses recorded yet this month.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {pieData.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color || PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card chart-card">
          <h3>Budget vs. actual</h3>
          {expenseCategories.length === 0 ? (
            <div className="empty-state">No expense categories yet.</div>
          ) : (
            <div className="budget-list">
              {expenseCategories.map((c) => {
                const limit = c.monthly_limit;
                const pct = limit ? Math.min(100, (c.spent / limit) * 100) : null;
                const over = limit && c.spent > limit;
                return (
                  <div key={c.id}>
                    <div className="budget-row-head">
                      <span>{c.name}</span>
                      <span className={over ? 'over' : ''}>
                        {formatCurrency(c.spent)}{limit ? ` / ${formatCurrency(limit)}` : ''}
                      </span>
                    </div>
                    {limit ? (
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${pct}%`, background: over ? 'var(--expense)' : c.color }}
                        />
                      </div>
                    ) : (
                      <div className="empty-state" style={{ padding: 0, textAlign: 'left', fontSize: '0.8rem' }}>
                        No limit set
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card chart-card">
        <h3>Last 6 months</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" />
            <XAxis dataKey="label" stroke="#6b7280" fontSize={12} />
            <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => `$${v}`} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="income" name="Income" stroke="#16a34a" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="expense" name="Expense" stroke="#dc2626" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
