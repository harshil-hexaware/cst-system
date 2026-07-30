import apiClient from './apiClient';

const userService = {
  getMe: () => apiClient.get('/users/me'),
  updateMe: (payload) => apiClient.patch('/users/me', payload),
  list: (params) => apiClient.get('/users', { params }),
  changeRole: (userId, role) => apiClient.patch(`/users/${userId}/role`, { role }),
  deactivate: (userId) => apiClient.post(`/users/${userId}/deactivate`),
  activate: (userId) => apiClient.post(`/users/${userId}/activate`),
  deleteUser: (userId) => apiClient.delete(`/users/${userId}`),
  listAgents: () => apiClient.get('/users/agents'),
};

export default userService;
