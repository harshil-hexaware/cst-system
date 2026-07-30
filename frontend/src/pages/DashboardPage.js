import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchDashboardSummary } from '../actions/ticketActions';
import LoadingSpinner from '../components/LoadingSpinner';

function SummaryCard({ label, value, colorClass = 'text-primary' }) {
  return (
    <div className="col-6 col-md-4 col-lg-3 mb-3">
      <div className="card h-100 shadow-sm text-center">
        <div className="card-body">
          <div className={`display-6 fw-bold ${colorClass}`}>{value}</div>
          <div className="text-muted small">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { summary, loading } = useSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardSummary());
  }, [dispatch]);

  if (loading || !summary) return <LoadingSpinner label="Loading dashboard…" />;

  const isCustomer = user?.role === 'CUSTOMER';
  const isAgent = user?.role === 'AGENT';

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          {isCustomer && 'My Dashboard'}
          {isAgent && 'Agent Dashboard'}
          {!isCustomer && !isAgent && 'Operations Dashboard'}
        </h2>
        {isCustomer && (
          <Link to="/tickets/new" className="btn btn-primary">+ New Ticket</Link>
        )}
      </div>

      <div className="row">
        {isCustomer && (
          <>
            <SummaryCard label="Open Requests" value={summary.open + summary.inProgress + summary.escalated + summary.onHold} colorClass="text-primary" />
            <SummaryCard label="Resolved" value={summary.resolved} colorClass="text-success" />
            <SummaryCard label="Closed" value={summary.closed} colorClass="text-secondary" />
            <SummaryCard label="Total Requests" value={summary.total} colorClass="text-dark" />
          </>
        )}

        {isAgent && (
          <>
            <SummaryCard label="Assigned Tickets" value={summary.total} colorClass="text-primary" />
            <SummaryCard label="Pending (Open/In Progress)" value={summary.open + summary.inProgress} colorClass="text-warning" />
            <SummaryCard label="Resolved" value={summary.resolved} colorClass="text-success" />
            <SummaryCard label="SLA Breaches" value={summary.slaBreaches} colorClass="text-danger" />
          </>
        )}

        {!isCustomer && !isAgent && (
          <>
            <SummaryCard label="Total Tickets" value={summary.total} />
            <SummaryCard label="Open" value={summary.open} colorClass="text-primary" />
            <SummaryCard label="In Progress" value={summary.inProgress} colorClass="text-info" />
            <SummaryCard label="Escalated" value={summary.escalated} colorClass="text-danger" />
            <SummaryCard label="Resolved" value={summary.resolved} colorClass="text-success" />
            <SummaryCard label="Closed" value={summary.closed} colorClass="text-secondary" />
            <SummaryCard label="SLA Breaches" value={summary.slaBreaches} colorClass="text-danger" />
          </>
        )}
      </div>

      <div className="mt-3">
        <Link to="/tickets" className="btn btn-outline-primary">View all tickets →</Link>
      </div>
    </div>
  );
}
