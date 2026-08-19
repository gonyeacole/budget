import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import { formatCurrency } from '../utils';
import './ListPage.css';

function emptyForm(categories) {
  return {
    description: '',
    amount: '',
    type: 'expense',
    category_id: categories.find((c) => c.type === 'expense')?.id || categories[0]?.id || '',
    day_of_month: 1,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
  };
}

export default function Recurring() {
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    Promise.all([api.get('/recurring'), api.get('/categories')]).then(([r, c]) => {
      setRules(r.data);
      setCategories(c.data);
    }).finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(categories));
    setError('');
    setModalOpen(true);
  }

  function openEdit(rule) {
    setEditing(rule);
    setForm({
      description: rule.description,
      amount: rule.amount,
      type: rule.type,
      category_id: rule.category_id,
      day_of_month: rule.day_of_month,
      start_date: rule.start_date,
      end_date: rule.end_date || '',
      active: rule.active,
    });
    setError('');
    setModalOpen(true);
  }

  const categoriesForType = categories.filter((c) => c.type === form.type);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = { ...form, end_date: form.end_date || null };
    try {
      if (editing) {
        await api.put(`/recurring/${editing.id}`, payload);
      } else {
        await api.post('/recurring', payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
  }

  async function toggleActive(rule) {
    await api.put(`/recurring/${rule.id}`, { active: rule.active ? 0 : 1 });
    load();
  }

  async function handleDelete(rule) {
    if (!confirm(`Delete recurring item "${rule.description}"? Past generated transactions will stay.`)) return;
    await api.delete(`/recurring/${rule.id}`);
    load();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Recurring bills &amp; income</h1>
        <button className="btn" onClick={openCreate} disabled={categories.length === 0}>+ New recurring item</button>
      </div>

      <p className="muted-tag" style={{ marginBottom: '1rem' }}>
        Recurring items automatically create a transaction each month on the day you choose.
      </p>

      <div className="card">
        {loading ? (
          <p>Loading…</p>
        ) : rules.length === 0 ? (
          <div className="empty-state">No recurring bills or income yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Day</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className={r.active ? '' : 'inactive-row'}>
                  <td>{r.description}</td>
                  <td>
                    <span className="color-dot" style={{ background: r.category_color }} />
                    {r.category_name}
                  </td>
                  <td>Day {r.day_of_month}</td>
                  <td style={{ textAlign: 'right' }} className={r.type === 'income' ? 'amount-income' : 'amount-expense'}>
                    {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                  </td>
                  <td>
                    <span className={`pill ${r.active ? 'type-pill-income' : ''}`} style={!r.active ? { background: '#eef0f5', color: '#6b7280' } : undefined}>
                      {r.active ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => openEdit(r)}>Edit</button>
                      <button onClick={() => toggleActive(r)}>{r.active ? 'Pause' : 'Resume'}</button>
                      <button className="delete" onClick={() => handleDelete(r)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Edit recurring item' : 'New recurring item'} onClose={() => setModalOpen(false)}>
          {error && <div className="error-text">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="r-desc">Description</label>
              <input id="r-desc" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="r-type">Type</label>
              <select
                id="r-type"
                value={form.type}
                onChange={(e) => {
                  const type = e.target.value;
                  const firstOfType = categories.find((c) => c.type === type);
                  setForm({ ...form, type, category_id: firstOfType?.id || '' });
                }}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="r-amount">Amount</label>
              <input
                id="r-amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="r-category">Category</label>
              <select
                id="r-category"
                required
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                {categoriesForType.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="r-day">Day of month (1–28)</label>
              <input
                id="r-day"
                type="number"
                min="1"
                max="28"
                required
                value={form.day_of_month}
                onChange={(e) => setForm({ ...form, day_of_month: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label htmlFor="r-start">Start date</label>
              <input id="r-start" type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="r-end">End date (optional)</label>
              <input id="r-end" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <button className="btn" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>
              {editing ? 'Save changes' : 'Create recurring item'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
