import authService from '../services/authService';
import { setAccessToken, clearSession } from '../services/apiClient';
import {
  AUTH_LOGIN_START, AUTH_LOGIN_SUCCESS, AUTH_LOGIN_FAILURE, AUTH_LOGOUT,
} from './actionTypes';

/**
 * Redux Thunk action creator: login.
 * Demonstrates the required Thunk pattern — an async function
 * dispatched through the store, rather than a plain action object.
 */
export const login = (email, password) => async (dispatch) => {
  dispatch({ type: AUTH_LOGIN_START });
  try {
    const { data } = await authService.login({ email, password });
    const { accessToken, refreshToken, user } = data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    dispatch({ type: AUTH_LOGIN_SUCCESS, payload: user });
    return { ok: true };
  } catch (err) {
    const message = err.response?.data?.error?.message || 'Login failed';
    dispatch({ type: AUTH_LOGIN_FAILURE, payload: message });
    return { ok: false, message };
  }
};

export const logout = () => async (dispatch) => {
  try {
    await authService.logout();
  } catch (err) {
    // Best-effort — clear local session regardless of server response
  }
  clearSession();
  dispatch({ type: AUTH_LOGOUT });
};

export const restoreSession = () => (dispatch) => {
  const raw = localStorage.getItem('user');
  const token = localStorage.getItem('accessToken');
  if (raw && token) {
    dispatch({ type: AUTH_LOGIN_SUCCESS, payload: JSON.parse(raw) });
  }
};

export { setAccessToken };
