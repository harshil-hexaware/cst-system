import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import userService from '../services/userService';
import LoadingSpinner from '../components/LoadingSpinner';

const ROLES = ['CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN'];

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ role: '', search: '', page: 1 });
  const [totalPages, setTotalPages] = useState(0);
  const [busyUserId, setBusyUserId] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: filters.page, pageSize: 10 };
      if (filters.role) params.role = filters.role;
      if (filters.search) params.search = filters.search;
      const { data } = await userService.list(params);
      setUsers(data.data.rows);
      setTotalPages(data.data.totalPages);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleRoleChange = async (userId, role) => {
    setBusyUserId(userId);
    try {
      await userService.changeRole(userId, role);
      toast.success(`Role updated to ${role}`);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update role');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleActive = async (user) => {
    setBusyUserId(user.userId);
    try {
      if (user.isActive) {
        await userService.deactivate(user.userId);
        toast.success('User deactivated');
      } else {
        await userService.activate(user.userId);
        toast.success('User activated');
      }
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update status');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4">User Management</h2>

      <div className="row mb-3 g-2">
        <div className="col-md-4">
          <input
            type="search"
            className="form-control"
            placeholder="Search by name or email…"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          />
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
          >
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading users…" />
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-hover align-middle bg-white shadow-sm">
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
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 140 }}
                        value={u.role}
                        disabled={busyUserId === u.userId}
                        onChange={(e) => handleRoleChange(u.userId, e.target.value)}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'bg-success' : 'bg-secondary'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn-sm ${u.isActive ? 'btn-outline-danger' : 'btn-outline-success'}`}
                        disabled={busyUserId === u.userId}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav>
              <ul className="pagination">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === filters.page ? 'active' : ''}`}>
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
