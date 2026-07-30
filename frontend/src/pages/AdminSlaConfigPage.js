import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import ticketService from '../services/ticketService';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminSlaConfigPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [savingPriority, setSavingPriority] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await ticketService.listSlaConfig();
      setRules(data.data);
      const initialDrafts = {};
      data.data.forEach((r) => {
        initialDrafts[r.priority] = {
          responseTimeMins: r.responseTimeMins,
          resolutionTimeMins: r.resolutionTimeMins,
        };
      });
      setDrafts(initialDrafts);
    } catch (err) {
      toast.error('Failed to load SLA configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = (priority, field, value) => {
    setDrafts({
      ...drafts,
      [priority]: { ...drafts[priority], [field]: parseInt(value, 10) || 0 },
    });
  };

  const handleSave = async (priority) => {
    setSavingPriority(priority);
    try {
      await ticketService.updateSlaConfig(priority, drafts[priority]);
      toast.success(`${priority} SLA updated`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update SLA rule');
    } finally {
      setSavingPriority(null);
    }
  };

  if (loading) return <LoadingSpinner label="Loading SLA configuration…" />;

  return (
    <div className="container py-4">
      <h2 className="mb-4">SLA Configuration</h2>
      <p className="text-muted">
        Response and resolution times are in minutes. Resolution time determines
        each new ticket&apos;s due date and SLA breach tracking.
      </p>

      <div className="table-responsive">
        <table className="table bg-white shadow-sm align-middle">
          <thead className="table-light">
            <tr>
              <th>Priority</th>
              <th>Response Time (mins)</th>
              <th>Resolution Time (mins)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.priority}>
                <td><span className="badge bg-secondary">{r.priority}</span></td>
                <td style={{ maxWidth: 160 }}>
                  <input
                    type="number"
                    min={1}
                    className="form-control"
                    value={drafts[r.priority]?.responseTimeMins ?? ''}
                    onChange={(e) => handleChange(r.priority, 'responseTimeMins', e.target.value)}
                  />
                </td>
                <td style={{ maxWidth: 160 }}>
                  <input
                    type="number"
                    min={1}
                    className="form-control"
                    value={drafts[r.priority]?.resolutionTimeMins ?? ''}
                    onChange={(e) => handleChange(r.priority, 'resolutionTimeMins', e.target.value)}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={savingPriority === r.priority}
                    onClick={() => handleSave(r.priority)}
                  >
                    {savingPriority === r.priority ? 'Saving…' : 'Save'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
