import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import ticketService from '../services/ticketService';
import LoadingSpinner from '../components/LoadingSpinner';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';

// Mirrors the backend's TRANSITION_ROLES exactly (see
// ticket-service/src/domain/ticketStateMachine.js) so each role only
// ever sees action buttons it's actually permitted to click — the
// backend remains the authoritative enforcement point either way.
const TRANSITION_ROLES = {
  'OPEN->IN_PROGRESS': ['AGENT', 'MANAGER', 'ADMIN'],
  'OPEN->ESCALATED': ['AGENT', 'MANAGER', 'ADMIN'],
  'OPEN->CLOSED': ['MANAGER', 'ADMIN'],
  'IN_PROGRESS->ON_HOLD': ['AGENT', 'MANAGER', 'ADMIN'],
  'IN_PROGRESS->ESCALATED': ['AGENT', 'MANAGER', 'ADMIN'],
  'IN_PROGRESS->RESOLVED': ['AGENT', 'MANAGER', 'ADMIN'],
  'IN_PROGRESS->CLOSED': ['MANAGER', 'ADMIN'],
  'ON_HOLD->IN_PROGRESS': ['AGENT', 'MANAGER', 'ADMIN'],
  'ON_HOLD->ESCALATED': ['AGENT', 'MANAGER', 'ADMIN'],
  'ON_HOLD->CLOSED': ['MANAGER', 'ADMIN'],
  'ESCALATED->IN_PROGRESS': ['MANAGER', 'ADMIN'],
  'ESCALATED->RESOLVED': ['MANAGER', 'ADMIN'],
  'ESCALATED->CLOSED': ['MANAGER', 'ADMIN'],
  'RESOLVED->CLOSED': ['CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN'],
  'RESOLVED->REOPENED': ['CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN'],
  'CLOSED->REOPENED': ['CUSTOMER', 'MANAGER', 'ADMIN'],
  'REOPENED->IN_PROGRESS': ['AGENT', 'MANAGER', 'ADMIN'],
  'REOPENED->ESCALATED': ['AGENT', 'MANAGER', 'ADMIN'],
  'REOPENED->CLOSED': ['MANAGER', 'ADMIN'],
};

const ALL_TARGETS_BY_SOURCE = {
  OPEN: ['IN_PROGRESS', 'ESCALATED', 'CLOSED'],
  IN_PROGRESS: ['ON_HOLD', 'ESCALATED', 'RESOLVED', 'CLOSED'],
  ON_HOLD: ['IN_PROGRESS', 'ESCALATED', 'CLOSED'],
  ESCALATED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'ESCALATED', 'CLOSED'],
};

function getAllowedTransitions(status, role) {
  const candidates = ALL_TARGETS_BY_SOURCE[status] || [];
  return candidates.filter((to) => (TRANSITION_ROLES[`${status}->${to}`] || []).includes(role));
}

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'];

function AttachmentThumbnail({ ticketId, attachment, onOpen }) {
  const [thumbUrl, setThumbUrl] = useState(null);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    ticketService.downloadAttachment(ticketId, attachment.id)
      .then((response) => {
        if (cancelled) return;
        objectUrl = window.URL.createObjectURL(response.data);
        setThumbUrl(objectUrl);
      })
      .catch(() => { /* silently fall back to the file icon on preview failure */ });
    return () => {
      cancelled = true;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, attachment.id]);

  if (!thumbUrl) {
    return <span aria-hidden="true">🖼️</span>;
  }
  return (
    <img
      src={thumbUrl}
      alt={attachment.fileName}
      role="button"
      onClick={onOpen}
      style={{
        width: 32, height: 32, objectFit: 'cover', borderRadius: 4, cursor: 'pointer',
      }}
    />
  );
}

export default function TicketDetailsPage() {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadTicket = useCallback(async () => {
    try {
      const { data } = await ticketService.getById(id);
      setTicket(data.data);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadTicket(); }, [loadTicket]);

  const handleTransition = async (status) => {
    try {
      await ticketService.updateStatus(id, { status });
      toast.success(`Ticket moved to ${status.replace('_', ' ')}`);
      loadTicket();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Transition failed');
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setPosting(true);
    try {
      await ticketService.addComment(id, { body: commentBody, isInternal });
      setCommentBody('');
      setIsInternal(false);
      loadTicket();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to add comment');
    } finally {
      setPosting(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      await ticketService.uploadAttachment(id, file);
      toast.success('Attachment uploaded');
      setFile(null);
      loadTicket();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachment) => {
    try {
      const response = await ticketService.downloadAttachment(id, attachment.id);
      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // axios returns blob-error-bodies as a Blob even on failure when
      // responseType is 'blob' — read it as text to get the real message.
      let message = 'Download failed';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          message = JSON.parse(text)?.error?.message || message;
        } catch (parseErr) {
          // fall through to generic message
        }
      }
      toast.error(message);
    }
  };

  if (loading) return <LoadingSpinner label="Loading ticket…" />;
  if (!ticket) return <div className="container py-4">Ticket not found.</div>;

  const canAddInternalNote = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  // Customers never see status-transition action buttons, even for
  // transitions the backend would technically allow them to perform
  // (e.g. closing/reopening a resolved ticket) — explicit product
  // decision to keep the customer-facing ticket view read-only aside
  // from commenting and attaching files.
  const availableTransitions = user?.role === 'CUSTOMER' ? [] : getAllowedTransitions(ticket.status, user?.role);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <h2 className="mb-1">{ticket.subject}</h2>
          <div className="text-muted">{ticket.ticketNumber}</div>
        </div>
        <div>
          <PriorityBadge priority={ticket.priority} />
          {' '}
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <p style={{ whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
        </div>
      </div>

      {availableTransitions.length > 0 && (
        <div className="mb-4">
          <span className="fw-semibold me-2">Actions:</span>
          {availableTransitions.map((status) => (
            <button
              key={status}
              type="button"
              className="btn btn-outline-primary btn-sm me-2 mb-2"
              onClick={() => handleTransition(status)}
            >
              Move to
              {' '}
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}

      <div className="row">
        <div className="col-lg-8">
          <h5>Conversation</h5>
          <div className="mb-3">
            {(ticket.comments || []).length === 0 && <p className="text-muted">No comments yet.</p>}
            {(ticket.comments || []).map((c) => (
              <div key={c.id} className={`card mb-2 ${c.isInternal ? 'border-warning' : ''}`}>
                <div className="card-body py-2">
                  {c.isInternal && <span className="badge bg-warning text-dark mb-1">Internal Note</span>}
                  <p className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>{c.body}</p>
                  <small className="text-muted">{new Date(c.createdAt).toLocaleString()}</small>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleCommentSubmit} className="card p-3 shadow-sm">
            <textarea
              className="form-control mb-2"
              rows={3}
              placeholder="Add a comment…"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />
            <div className="d-flex justify-content-between align-items-center">
              {canAddInternalNote ? (
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isInternal"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="isInternal">Internal note (not visible to customer)</label>
                </div>
              ) : <span />}
              <button type="submit" className="btn btn-primary" disabled={posting}>
                {posting ? 'Posting…' : 'Post Comment'}
              </button>
            </div>
          </form>
        </div>

        <div className="col-lg-4">
          <h5>Attachments</h5>
          <ul className="list-group mb-3">
            {(ticket.attachments || []).length === 0 && (
              <li className="list-group-item text-muted">No attachments</li>
            )}
            {(ticket.attachments || []).map((a) => (
              <li key={a.id} className="list-group-item d-flex align-items-center justify-content-between gap-2">
                <div className="d-flex align-items-center gap-2 text-truncate">
                  {IMAGE_MIME_TYPES.includes(a.mimeType) ? (
                    <AttachmentThumbnail ticketId={id} attachment={a} onOpen={() => handleDownload(a)} />
                  ) : (
                    <span aria-hidden="true">📎</span>
                  )}
                  <span className="small text-truncate">{a.fileName}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary flex-shrink-0"
                  onClick={() => handleDownload(a)}
                >
                  Download
                </button>
              </li>
            ))}
          </ul>
          <form onSubmit={handleFileUpload} className="card p-3 shadow-sm mb-4">
            <input
              type="file"
              className="form-control mb-2"
              onChange={(e) => setFile(e.target.files[0])}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
            />
            <button type="submit" className="btn btn-outline-primary btn-sm" disabled={!file || uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </form>

          <h5>History</h5>
          <ul className="list-group">
            {(ticket.history || []).map((h) => (
              <li key={h.id} className="list-group-item small">
                <strong>{h.fieldChanged}</strong>
                {': '}
                {h.oldValue || '—'}
                {' → '}
                {h.newValue}
                <br />
                <span className="text-muted">{new Date(h.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
