import {
  DASHBOARD_FETCH_START, DASHBOARD_FETCH_SUCCESS, DASHBOARD_FETCH_FAILURE,
} from '../actions/actionTypes';

const initialState = {
  summary: null,
  loading: false,
  error: null,
};

export default function dashboardReducer(state = initialState, action) {
  switch (action.type) {
    case DASHBOARD_FETCH_START:
      return { ...state, loading: true, error: null };
    case DASHBOARD_FETCH_SUCCESS:
      return { ...state, loading: false, summary: action.payload };
    case DASHBOARD_FETCH_FAILURE:
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}
