import apiClient from './apiClient';

const ticketService = {
  create: (payload) => apiClient.post('/tickets', payload),
  list: (params) => apiClient.get('/tickets', { params }),
  getById: (id) => apiClient.get(`/tickets/${id}`),
  updateStatus: (id, payload) => apiClient.patch(`/tickets/${id}/status`, payload),
  assign: (id, agentId) => apiClient.post(`/tickets/${id}/assign`, { agentId }),
  autoAssign: (id) => apiClient.post(`/tickets/${id}/auto-assign`),
  addComment: (id, payload) => apiClient.post(`/tickets/${id}/comments`, payload),
  uploadAttachment: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    // IMPORTANT: do not set Content-Type manually here. Axios/the
    // browser must generate it (multipart/form-data; boundary=...) —
    // hardcoding it without a boundary means the server can never
    // parse the multipart body, so no file ever actually uploads.
    return apiClient.post(`/tickets/${id}/attachments`, formData);
  },
  downloadAttachment: (ticketId, attachmentId) => apiClient.get(
    `/tickets/${ticketId}/attachments/${attachmentId}`,
    { responseType: 'blob' },
  ),
  dashboardSummary: () => apiClient.get('/tickets/dashboard/summary'),
  listCategories: (includeInactive = false) => apiClient.get('/tickets/categories', { params: { includeInactive } }),
  createCategory: (payload) => apiClient.post('/tickets/categories', payload),
  updateCategory: (id, payload) => apiClient.patch(`/tickets/categories/${id}`, payload),
  listSlaConfig: () => apiClient.get('/tickets/sla-config'),
  updateSlaConfig: (priority, payload) => apiClient.patch(`/tickets/sla-config/${priority}`, payload),
};

export default ticketService;
