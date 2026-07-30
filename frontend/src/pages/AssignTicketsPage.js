import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import ticketService from '../services/ticketService';
import userService from '../services/userService';
import LoadingSpinner from '../components/LoadingSpinner';
import { PriorityBadge, StatusBadge } from '../components/StatusBadge';

export default function AssignTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState({});
  const [assigningId, setAssigningId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketsRes, agentsRes] = await Promise.all([
        ticketService.list({ unassigned: true, pageSize: 50 }),
        userService.listAgents(),
      ]);
      setTickets(ticketsRes.data.data.rows);
      setAgents(agentsRes.data.data);
    } catch (err) {
      toast.error('Failed to load unassigned tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleManualAssign = async (ticketId) => {
    const agentId = selectedAgent[ticketId];
    if (!agentId) {
      toast.info('Pick an agent first');
      return;
    }
    setAssigningId(ticketId);
    try {
      await ticketService.assign(ticketId, agentId);
      toast.success('Ticket assigned');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Assignment failed');
    } finally {
      setAssigningId(null);
    }
  };

  const handleAutoAssign = async (ticketId) => {
    setAssigningId(ticketId);
    try {
      await ticketService.autoAssign(ticketId);
      toast.success('Auto-assigned to least-loaded agent');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Auto-assignment failed');
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) return <LoadingSpinner label="Loading unassigned tickets…" />;

  return (
    <div className="container py-4">
      <h2 className="mb-4">Assign Tickets</h2>

      {agents.length === 0 && (
        <div className="alert alert-warning">
          No active agents found. Promote a Customer to Agent on the
          {' '}
          <Link to="/admin/users">User Management</Link>
          {' '}
          page first.
        </div>
      )}

      {tickets.length === 0 ? (
        <p className="text-muted">No unassigned tickets — nice work.</p>
      ) : (
        <div className="table-responsive">
          <table className="table bg-white shadow-sm align-middle">
            <thead className="table-light">
              <tr>
                <th>Ticket #</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assign to</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td><Link to={`/tickets/${t.id}`}>{t.ticketNumber}</Link></td>
                  <td>{t.subject}</td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td style={{ minWidth: 180 }}>
                    <select
                      className="form-select form-select-sm"
                      value={selectedAgent[t.id] || ''}
                      onChange={(e) => setSelectedAgent({ ...selectedAgent, [t.id]: e.target.value })}
                    >
                      <option value="">Select agent…</option>
                      {agents.map((a) => (
                        <option key={a.userId} value={a.userId}>
                          {a.firstName} {a.lastName} ({a.workloadCount} open)
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      disabled={assigningId === t.id}
                      onClick={() => handleManualAssign(t.id)}
                    >
                      Assign
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      disabled={assigningId === t.id || agents.length === 0}
                      onClick={() => handleAutoAssign(t.id)}
                    >
                      Auto-assign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
