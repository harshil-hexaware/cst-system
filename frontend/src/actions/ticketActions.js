import ticketService from '../services/ticketService';
import {
  TICKETS_FETCH_START, TICKETS_FETCH_SUCCESS, TICKETS_FETCH_FAILURE,
  DASHBOARD_FETCH_START, DASHBOARD_FETCH_SUCCESS, DASHBOARD_FETCH_FAILURE,
} from './actionTypes';

export const fetchTickets = (params = {}) => async (dispatch) => {
  dispatch({ type: TICKETS_FETCH_START });
  try {
    const { data } = await ticketService.list(params);
    dispatch({ type: TICKETS_FETCH_SUCCESS, payload: data.data });
    return { ok: true };
  } catch (err) {
    const message = err.response?.data?.error?.message || 'Failed to load tickets';
    dispatch({ type: TICKETS_FETCH_FAILURE, payload: message });
    return { ok: false, message };
  }
};

export const fetchDashboardSummary = () => async (dispatch) => {
  dispatch({ type: DASHBOARD_FETCH_START });
  try {
    const { data } = await ticketService.dashboardSummary();
    dispatch({ type: DASHBOARD_FETCH_SUCCESS, payload: data.data });
    return { ok: true };
  } catch (err) {
    const message = err.response?.data?.error?.message || 'Failed to load dashboard';
    dispatch({ type: DASHBOARD_FETCH_FAILURE, payload: message });
    return { ok: false, message };
  }
};
