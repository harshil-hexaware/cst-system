import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchTickets } from '../actions/ticketActions';
import LoadingSpinner from '../components/LoadingSpinner';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';

const STATUSES = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED'];

function EmptyState({ role }) {
  if (role === 'AGENT') {
    return (
      <tr>
        <td colSpan={5} className="text-center text-muted py-4">
          <p className="mb-1">No tickets assigned to you yet.</p>
          <p className="mb-0 small">
            A manager assigns tickets from the "Assign Tickets" page. If you were
            just promoted to Agent, log out and log back in so your account
            reflects your new role.
          </p>
        </td>
      </tr>
    );
  }
  return <tr><td colSpan={5} className="text-center text-muted py-4">No tickets found</td></tr>;
}

export default function TicketListPage() {
  const dispatch = useDispatch();
  const {
    rows, loading, page, totalPages,
  } = useSelector((state) => state.tickets);
  const { user } = useSelector((state) => state.auth);
  const [filters, setFilters] = useState({ status: '', page: 1 });

  useEffect(() => {
    const params = { page: filters.page, pageSize: 10 };
    if (filters.status) params.status = filters.status;
    dispatch(fetchTickets(params));
  }, [dispatch, filters]);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h2 className="mb-0">Tickets</h2>
        <select
          className="form-select"
          style={{ maxWidth: 220 }}
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value, page: 1 })}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading tickets…" />
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle bg-white shadow-sm">
              <thead className="table-light">
                <tr>
                  <th>Ticket #</th>
                  <th>Subject</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <EmptyState role={user?.role} />}
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link to={`/tickets/${t.id}`}>{t.ticketNumber}</Link>
                    </td>
                    <td>{t.subject}</td>
                    <td><PriorityBadge priority={t.priority} /></td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav aria-label="Ticket pagination">
              <ul className="pagination">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                    <button type="button" className="page-link" onClick={() => setFilters({ ...filters, page: p })}>
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
