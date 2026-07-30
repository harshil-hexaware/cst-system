import authReducer from '../src/reducers/authReducer';
import {
  AUTH_LOGIN_START, AUTH_LOGIN_SUCCESS, AUTH_LOGIN_FAILURE, AUTH_LOGOUT,
} from '../src/actions/actionTypes';

describe('authReducer', () => {
  it('returns the initial state by default', () => {
    const state = authReducer(undefined, { type: '@@INIT' });
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('sets loading true on AUTH_LOGIN_START', () => {
    const state = authReducer(undefined, { type: AUTH_LOGIN_START });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('sets isAuthenticated and user on AUTH_LOGIN_SUCCESS', () => {
    const user = { id: 'u1', role: 'CUSTOMER' };
    const state = authReducer(undefined, { type: AUTH_LOGIN_SUCCESS, payload: user });
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(user);
    expect(state.loading).toBe(false);
  });

  it('sets error and clears authentication on AUTH_LOGIN_FAILURE', () => {
    const state = authReducer(undefined, { type: AUTH_LOGIN_FAILURE, payload: 'Invalid credentials' });
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe('Invalid credentials');
  });

  it('resets to initial state on AUTH_LOGOUT', () => {
    const loggedIn = { user: { id: 'u1' }, isAuthenticated: true, loading: false, error: null };
    const state = authReducer(loggedIn, { type: AUTH_LOGOUT });
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });
});
