import { useEffect, useState } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import { formatCurrency } from '../utils';
import './ListPage.css';

const COLORS = ['#5c7db3', '#6fae86', '#c97b74', '#c9a25c', '#8b7cc0', '#5aa3a3', '#c17fa0', '#8a9a5b', '#c9c0a9', '#6b8fc2'];

const emptyForm = { name: '', type: 'expense', monthly_limit: '', color: COLORS[0] };

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    api.get('/categories').then((res) => setCategories(res.data)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function openEdit(cat) {
    setEditing(cat);
    setForm({
      name: cat.name,
      type: cat.type,
      monthly_limit: cat.monthly_limit ?? '',
      color: cat.color,
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const payload = {
      name: form.name,
      type: form.type,
      monthly_limit: form.monthly_limit === '' ? null : Number(form.monthly_limit),
      color: form.color,
    };
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
  }

  async function handleDelete(cat) {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await api.delete(`/categories/${cat.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete category');
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1>Categories</h1>
        <button className="btn" onClick={openCreate}>+ New category</button>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading…</p>
        ) : categories.length === 0 ? (
          <div className="empty-state">No categories yet. Create one to get started.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Monthly limit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="color-dot" style={{ background: c.color }} />
                    {c.name}
                  </td>
                  <td>
                    <span className={`pill type-pill-${c.type}`}>{c.type}</span>
                  </td>
                  <td>{c.monthly_limit ? formatCurrency(c.monthly_limit) : <span className="muted-tag">—</span>}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => openEdit(c)}>Edit</button>
                      <button className="delete" onClick={() => handleDelete(c)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Edit category' : 'New category'} onClose={() => setModalOpen(false)}>
          {error && <div className="error-text">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="cat-name">Name</label>
              <input id="cat-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="cat-type">Type</label>
              <select id="cat-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            {form.type === 'expense' && (
              <div className="field">
                <label htmlFor="cat-limit">Monthly limit (optional)</label>
                <input
                  id="cat-limit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monthly_limit}
                  onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })}
                />
              </div>
            )}
            <div className="field">
              <label>Color</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {COLORS.map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setForm({ ...form, color })}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: color,
                      border: form.color === color ? '2px solid var(--text)' : '2px solid transparent',
                      padding: 0,
                    }}
                    aria-label={color}
                  />
                ))}
              </div>
            </div>
            <button className="btn" type="submit" style={{ width: '100%', marginTop: '0.5rem' }}>
              {editing ? 'Save changes' : 'Create category'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
