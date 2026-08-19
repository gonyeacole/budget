import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import { formatCurrency, currentMonth } from '../utils';
import './ListPage.css';

function emptyForm(categories) {
  return {
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    type: 'expense',
    category_id: categories.find((c) => c.type === 'expense')?.id || categories[0]?.id || '',
    description: '',
  };
}

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonth());
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  function loadTransactions() {
    setLoading(true);
    const params = { month };
    if (categoryFilter) params.category_id = categoryFilter;
    if (typeFilter) params.type = typeFilter;
    api.get('/transactions', { params }).then((res) => setTransactions(res.data)).finally(() => setLoading(false));
  }

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));
  }, []);

  useEffect(loadTransactions, [month, categoryFilter, typeFilter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(categories));
    setError('');
    setModalOpen(true);
  }

  function openEdit(t) {
    setEditing(t);
    setForm({
      date: t.date,
      amount: t.amount,
      type: t.type,
      category_id: t.category_id,
      description: t.description,
    });
    setError('');
    setModalOpen(true);
  }

  const categoriesForType = categories.filter((c) => c.type === form.type);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/transactions/${editing.id}`, form);
      } else {
        await api.post('/transactions', form);
      }
      setModalOpen(false);
      loadTransactions();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
  }

  async function handleDelete(t) {
    if (!confirm('Delete this transaction?')) return;
    await api.delete(`/transactions/${t.id}`);
    loadTransactions();
  }

  return (
    <div>
      <div className="page-head">
        <h1>Transactions</h1>
        <button className="btn" onClick={openCreate} disabled={categories.length === 0}>+ Add transaction</button>
      </div>

      <div className="filters" style={{ marginBottom: '1rem' }}>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {categories.length === 0 && !loading && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          Create a category first before adding transactions.
        </div>
      )}

      <div className="card">
        {loading ? (
          <p>Loading…</p>
        ) : transactions.length === 0 ? (
          <div className="empty-state">No transactions for this period.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Added by</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{t.description || <span className="muted-tag">—</span>}{t.recurring_id && <span className="muted-tag"> · recurring</span>}</td>
                  <td>
                    <span className="color-dot" style={{ background: t.category_color }} />
                    {t.category_name}
                  </td>
                  <td className="muted-tag">{t.created_by_name || '—'}</td>
                  <td style={{ textAlign: 'right' }} className={t.type === 'income' ? 'amount-income' : 'amount-expense'}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => openEdit(t)}>Edit</button>
                      <button className="delete" onClick={() => handleDelete(t)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Edit transaction' : 'Add transaction'} onClose={() => setModalOpen(false)}>
          {error && <div className="error-text">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="t-type">Type</label>
              <select
                id="t-type"
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
              <label htmlFor="t-date">Date</label>
              <input id="t-date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="t-amount">Amount</label>
              <input
                id="t-amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="t-category">Category</label>
              <select
                id="t-category"
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
              <label htmlFor="t-desc">Description</label>
              <input id="t-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <button className="btn" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>
              {editing ? 'Save changes' : 'Add transaction'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
