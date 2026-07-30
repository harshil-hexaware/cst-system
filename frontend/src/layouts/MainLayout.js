import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../actions/authActions';

export default function MainLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand fw-bold d-flex align-items-center gap-2" to="/dashboard">
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="16" cy="16" r="15" fill="#ffffff" fillOpacity="0.15" stroke="#ffffff" strokeWidth="1.5" />
              <path
                d="M10 13.5C10 11.0147 12.0147 9 14.5 9H17.5C19.9853 9 22 11.0147 22 13.5C22 15.9853 19.9853 18 17.5 18H14.8L11.5 21V18H14.5C12.0147 18 10 15.9853 10 13.5Z"
                fill="#ffffff"
              />
              <circle cx="13.5" cy="13.5" r="1.2" fill="#0d6efd" />
              <circle cx="17" cy="13.5" r="1.2" fill="#0d6efd" />
            </svg>
            <span>Support Desk</span>
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navMenu"
            aria-controls="navMenu"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="navMenu">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <Link className="nav-link" to="/dashboard">Dashboard</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/tickets">Tickets</Link>
              </li>
              {user?.role === 'CUSTOMER' && (
                <li className="nav-item">
                  <Link className="nav-link" to="/tickets/new">New Ticket</Link>
                </li>
              )}
              {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
                <li className="nav-item">
                  <Link className="nav-link" to="/assign-tickets">Assign Tickets</Link>
                </li>
              )}
              {(user?.role === 'MANAGER' || user?.role === 'ADMIN') && (
                <li className="nav-item">
                  <Link className="nav-link" to="/admin/users">Users</Link>
                </li>
              )}
              {user?.role === 'ADMIN' && (
                <li className="nav-item">
                  <Link className="nav-link" to="/admin/categories">Categories</Link>
                </li>
              )}
              {user?.role === 'ADMIN' && (
                <li className="nav-item">
                  <Link className="nav-link" to="/admin/sla-config">SLA Config</Link>
                </li>
              )}
            </ul>
            {user && (
              <span className="navbar-text text-white me-3">
                {user.email}
                {' '}
                <span className="badge bg-light text-primary ms-1">{user.role}</span>
              </span>
            )}
            <button type="button" className="btn btn-outline-light btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow-1 bg-light">
        <Outlet />
      </main>

      <footer className="bg-dark text-white-50 text-center py-3 small">
        Customer Support Ticketing System
      </footer>
    </div>
  );
}
