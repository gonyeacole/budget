import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, CartesianGrid,
} from 'recharts';
import api from '../api';
import CircularProgress from '../components/CircularProgress';
import { formatCurrency, shiftMonth, formatMonthLabel, currentMonth } from '../utils';
import './Dashboard.css';

const PALETTE = ['#0b968b', '#8a3e76', '#c08a12', '#3f7a34', '#2f5c8a', '#a83b23'];
const GRID_COLOR = '#ded6c2';
const AXIS_COLOR = '#857a66';
const MUTED_BAR = '#ded6c2';
const ACCENT_BAR = '#17140f';

const TOOLTIP_STYLE = {
  background: '#fbfaf4',
  border: '1px solid #ded6c2',
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "'JetBrains Mono', monospace",
  color: '#17140f',
};

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
    label: formatMonthLabel(t.month).slice(0, 3),
  }));

  const overBudgetCount = expenseCategories.filter((c) => c.monthly_limit && c.spent > c.monthly_limit).length;
  const topCategory = [...expenseCategories].filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent)[0];

  const totalLimit = expenseCategories.reduce((sum, c) => sum + (c.monthly_limit || 0), 0);
  const totalSpentWithLimit = expenseCategories
    .filter((c) => c.monthly_limit)
    .reduce((sum, c) => sum + c.spent, 0);
  const budgetPct = totalLimit > 0 ? (totalSpentWithLimit / totalLimit) * 100 : 0;

  return (
    <div>
      <div className="ticker">
        <button className="ticker-nav-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
        <div className="ticker-item">
          <span className="ticker-label">Month</span>
          <span className="ticker-value">{formatMonthLabel(month)}</span>
        </div>
        <button className="ticker-nav-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">›</button>
        <div className="ticker-item">
          <span className="ticker-label">Income</span>
          <span className="ticker-value amount-income">{formatCurrency(data.totalIncome)}</span>
        </div>
        <div className="ticker-item">
          <span className="ticker-label">Expenses</span>
          <span className="ticker-value amount-expense">{formatCurrency(data.totalExpenses)}</span>
        </div>
        <div className="ticker-item">
          <span className="ticker-label">Net</span>
          <span className="ticker-value" style={{ color: data.net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
            {formatCurrency(data.net)}
          </span>
        </div>
        {month !== currentMonth() && (
          <button className="btn-secondary ticker-today" onClick={() => setMonth(currentMonth())}>Today</button>
        )}
      </div>

      <div className="bento">
        <div className="card tile tile-accent">
          <div className="tile-label">Net &mdash; {formatMonthLabel(month).split(' ')[0]}</div>
          <div>
            <div className="tile-value">{formatCurrency(data.net)}</div>
            <div className="tile-sub">income &minus; expenses</div>
          </div>
        </div>

        <div className="card tile">
          <div className="tile-label">Budget status</div>
          <div>
            <div className="tile-value">{overBudgetCount}</div>
            <div className="tile-sub">{overBudgetCount === 1 ? 'category over budget' : 'categories over budget'}</div>
          </div>
        </div>

        <div className="card tile">
          <div className="tile-label">Top category</div>
          <div>
            <div className="tile-value" style={{ fontSize: '1.4rem' }}>{topCategory ? topCategory.name : '—'}</div>
            <div className="tile-sub">{topCategory ? formatCurrency(topCategory.spent) + ' spent' : 'no spending yet'}</div>
          </div>
        </div>

        <div className="card tile ring-tile">
          <div className="tile-label" style={{ alignSelf: 'flex-start' }}>Budget used</div>
          <div className="ring-wrap">
            <CircularProgress pct={budgetPct} color={budgetPct > 100 ? 'var(--expense)' : 'var(--accent-strong)'} />
            <div className="ring-center">
              <span className="ring-value">{totalLimit > 0 ? `${Math.round(budgetPct)}%` : '—'}</span>
              <span className="ring-caption">{totalLimit > 0 ? formatCurrency(totalLimit) + ' limit' : 'no limits set'}</span>
            </div>
          </div>
        </div>

        <div className="card tile chart-tile span-2">
          <div className="tile-label">Last 6 months</div>
          {trendData.every((t) => t.expense === 0) ? (
            <div className="empty-state">No expense history yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
                <XAxis dataKey="label" stroke={AXIS_COLOR} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => formatCurrency(value)}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="expense" name="Expenses" radius={[4, 4, 0, 0]}>
                  {trendData.map((t) => (
                    <Cell key={t.month} fill={t.month === month ? ACCENT_BAR : MUTED_BAR} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card tile chart-tile span-2">
          <div className="tile-label">Spending by category</div>
          {pieData.length === 0 ? (
            <div className="empty-state">No expenses recorded yet this month.</div>
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                  {pieData.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color || PALETTE[i % PALETTE.length]} stroke="var(--surface)" />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatCurrency(value)} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card tile span-4">
          <div className="tile-label" style={{ marginBottom: '0.5rem' }}>Budget vs. actual</div>
          {expenseCategories.length === 0 ? (
            <div className="empty-state">No expense categories yet.</div>
          ) : (
            expenseCategories.map((c) => {
              const limit = c.monthly_limit;
              const pct = limit ? Math.min(100, (c.spent / limit) * 100) : 0;
              const over = limit && c.spent > limit;
              return (
                <div className="ledger-row" key={c.id}>
                  <div className="ledger-name">
                    <span className="color-dot" style={{ background: c.color }} />
                    {c.name}
                  </div>
                  <div className={`ledger-amount ${over ? 'amount-expense' : ''}`}>{formatCurrency(c.spent)}</div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${pct}%`, background: over ? 'var(--expense)' : c.color }}
                    />
                  </div>
                  <div className="ledger-pct">{limit ? `${Math.round((c.spent / limit) * 100)}%` : '—'}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
