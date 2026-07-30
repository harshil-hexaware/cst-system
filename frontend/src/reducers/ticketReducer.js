import {
  TICKETS_FETCH_START, TICKETS_FETCH_SUCCESS, TICKETS_FETCH_FAILURE,
} from '../actions/actionTypes';

const initialState = {
  rows: [],
  count: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
  loading: false,
  error: null,
};

export default function ticketReducer(state = initialState, action) {
  switch (action.type) {
    case TICKETS_FETCH_START:
      return { ...state, loading: true, error: null };
    case TICKETS_FETCH_SUCCESS:
      return { ...state, loading: false, ...action.payload };
    case TICKETS_FETCH_FAILURE:
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}
