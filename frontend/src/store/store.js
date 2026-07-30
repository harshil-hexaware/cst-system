import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { thunk } from 'redux-thunk';
import authReducer from '../reducers/authReducer';
import ticketReducer from '../reducers/ticketReducer';
import dashboardReducer from '../reducers/dashboardReducer';

const rootReducer = combineReducers({
  auth: authReducer,
  tickets: ticketReducer,
  dashboard: dashboardReducer,
});

const composeEnhancers = (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;

const store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk)),
);

export default store;
