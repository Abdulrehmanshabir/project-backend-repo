import { configureStore } from '@reduxjs/toolkit';
import branchesReducer from './slices/branchesSlice';

export const store = configureStore({
  reducer: {
    branches: branchesReducer,
  },
});

export default store;

