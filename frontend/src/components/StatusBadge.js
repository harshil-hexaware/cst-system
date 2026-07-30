import React from 'react';

const STATUS_STYLES = {
  OPEN: 'bg-primary',
  IN_PROGRESS: 'bg-info text-dark',
  ON_HOLD: 'bg-secondary',
  ESCALATED: 'bg-danger',
  RESOLVED: 'bg-success',
  CLOSED: 'bg-dark',
  REOPENED: 'bg-warning text-dark',
};

const PRIORITY_STYLES = {
  LOW: 'bg-light text-dark border',
  MEDIUM: 'bg-info text-dark',
  HIGH: 'bg-warning text-dark',
  CRITICAL: 'bg-danger',
};

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_STYLES[status] || 'bg-secondary'}`}>{status.replace('_', ' ')}</span>;
}

export function PriorityBadge({ priority }) {
  return <span className={`badge ${PRIORITY_STYLES[priority] || 'bg-secondary'}`}>{priority}</span>;
}
