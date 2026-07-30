import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ticketService from '../services/ticketService';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function CreateTicketPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    subject: '', description: '', categoryId: '', priority: 'MEDIUM',
  });
  const [submitting, setSubmitting] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    ticketService.listCategories()
      .then(({ data }) => setCategories(data.data))
      .catch(() => toast.error('Could not load categories'))
      .finally(() => setLoadingCategories(false));
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await ticketService.create({
        ...form,
        categoryId: parseInt(form.categoryId, 10),
      });
      toast.success(`Ticket ${data.data.ticketNumber} created`);
      navigate(`/tickets/${data.data.id}`);
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Failed to create ticket';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 640 }}>
      <h2 className="mb-4">Create a Support Ticket</h2>
      <div className="card shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="subject" className="form-label">Subject</label>
              <input id="subject" name="subject" className="form-control" value={form.subject} onChange={handleChange} required minLength={3} />
            </div>

            <div className="mb-3">
              <label htmlFor="description" className="form-label">Description</label>
              <textarea id="description" name="description" className="form-control" rows={5} value={form.description} onChange={handleChange} required />
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="categoryId" className="form-label">Category</label>
                <select id="categoryId" name="categoryId" className="form-select" value={form.categoryId} onChange={handleChange} required disabled={loadingCategories}>
                  <option value="">Select a category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="priority" className="form-label">Priority</label>
                <select id="priority" name="priority" className="form-select" value={form.priority} onChange={handleChange}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
