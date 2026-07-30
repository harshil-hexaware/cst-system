import {
  AUTH_LOGIN_START, AUTH_LOGIN_SUCCESS, AUTH_LOGIN_FAILURE, AUTH_LOGOUT,
} from '../actions/actionTypes';

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export default function authReducer(state = initialState, action) {
  switch (action.type) {
    case AUTH_LOGIN_START:
      return { ...state, loading: true, error: null };
    case AUTH_LOGIN_SUCCESS:
      return {
        ...state, loading: false, isAuthenticated: true, user: action.payload, error: null,
      };
    case AUTH_LOGIN_FAILURE:
      return {
        ...state, loading: false, isAuthenticated: false, error: action.payload,
      };
    case AUTH_LOGOUT:
      return initialState;
    default:
      return state;
  }
}
