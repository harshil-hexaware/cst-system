import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import userService from '../services/userService';
import LoadingSpinner from '../components/LoadingSpinner';

// Mirrors the backend's exact role-assignment rules (userService.changeRole
// in user-service) so the UI never even offers a choice that would be
// rejected — the backend remains the authoritative enforcement point.
function allowedTargetRoles(actorRole) {
  if (actorRole === 'ADMIN') return ['CUSTOMER', 'AGENT', 'MANAGER'];
  if (actorRole === 'MANAGER') return ['AGENT'];
  return [];
}

export default function AdminUsersPage() {
  const { user: actor } = useSelector((state) => state.auth);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);

  const targetRoles = allowedTargetRoles(actor?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { pageSize: 50 };
      if (roleFilter) params.role = roleFilter;
      if (search) params.search = search;
      const { data } = await userService.list(params);
      setUsers(data.data.rows);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleRoleChange = async (userId, role) => {
    setSavingId(userId);
    try {
      await userService.changeRole(userId, role);
      toast.success(`Role updated to ${role}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update role');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (u) => {
    setSavingId(u.userId);
    try {
      if (u.isActive) {
        await userService.deactivate(u.userId);
        toast.success('User deactivated');
      } else {
        await userService.activate(u.userId);
        toast.success('User activated');
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update user');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (u) => {
    const confirmed = window.confirm(
      `Permanently delete ${u.firstName} ${u.lastName} (${u.email})? This cannot be undone. Their past tickets and comments are kept for history, but their account will be gone.`,
    );
    if (!confirmed) return;

    setSavingId(u.userId);
    try {
      await userService.deleteUser(u.userId);
      toast.success('User deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete user');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4">User Management</h2>

      <div className="row mb-3 g-2">
        <div className="col-md-4">
          <input
            className="form-control"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          {actor?.role === 'MANAGER' ? (
            <input className="form-control" value="Agents only" disabled />
          ) : (
            <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All roles</option>
              <option value="CUSTOMER">Customer</option>
              <option value="AGENT">Agent</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          )}
        </div>
      </div>

      {actor?.role === 'MANAGER' && (
        <div className="alert alert-info small">
          As a Manager, you can see and manage Agent accounts here —
          promoting a Customer to Agent, for example. Only an Admin can
          assign the Manager role or see other account types.
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading users…" />
      ) : (
        <div className="table-responsive">
          <table className="table table-hover bg-white shadow-sm align-middle">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted py-4">No users found</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.userId}>
                  <td>{u.firstName} {u.lastName}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge bg-secondary">{u.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${u.isActive ? 'bg-success' : 'bg-dark'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="d-flex gap-2 flex-wrap">
                    {targetRoles.filter((r) => r !== u.role).map((r) => (
                      <button
                        key={r}
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        disabled={savingId === u.userId}
                        onClick={() => handleRoleChange(u.userId, r)}
                      >
                        Make {r}
                      </button>
                    ))}
                    {actor?.role === 'ADMIN' && (
                      <button
                        type="button"
                        className={`btn btn-sm ${u.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                        disabled={savingId === u.userId}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                    {actor?.role === 'ADMIN' && u.userId !== actor.id && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={savingId === u.userId}
                        onClick={() => handleDelete(u)}
                      >
                        Delete
                      </button>
                    )}
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
