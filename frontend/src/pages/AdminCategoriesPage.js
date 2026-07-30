import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import ticketService from '../services/ticketService';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ticketService.listCategories(true);
      setCategories(data.data);
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ticketService.createCategory(form);
      toast.success('Category created');
      setForm({ name: '', description: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (cat) => {
    try {
      await ticketService.updateCategory(cat.id, { isActive: !cat.isActive });
      toast.success(cat.isActive ? 'Category deactivated' : 'Category activated');
      load();
    } catch (err) {
      toast.error('Failed to update category');
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4">Category Management</h2>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title">Add Category</h5>
          <form onSubmit={handleSubmit} className="row g-2 align-items-end">
            <div className="col-md-4">
              <label htmlFor="name" className="form-label">Name</label>
              <input
                id="name"
                className="form-control"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="description" className="form-label">Description</label>
              <input
                id="description"
                className="form-control"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
                {submitting ? 'Adding…' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading categories…" />
      ) : (
        <table className="table table-hover bg-white shadow-sm">
          <thead className="table-light">
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="text-muted">{c.description}</td>
                <td>
                  <span className={`badge ${c.isActive ? 'bg-success' : 'bg-secondary'}`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => handleToggleActive(c)}>
                    {c.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
