import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * @param {{children: React.ReactNode, allowedRoles?: string[]}} props
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length && user?.role && !allowedRoles.includes(user.role)) {
    // Role gating is enforced authoritatively by the backend; this is a
    // UX convenience to avoid flashing a page the user can't use.
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
