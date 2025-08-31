import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import http from '../../services/http';

export const fetchBranches = createAsyncThunk('branches/fetch', async () => {
  const res = await http.get('/api/branches');
  return Array.isArray(res.data) ? res.data : [];
});

const branchesSlice = createSlice({
  name: 'branches',
  initialState: { list: [], current: localStorage.getItem('activeBranchId') || '' },
  reducers: {
    setCurrentBranch(state, action){
      state.current = action.payload || '';
      if (state.current) localStorage.setItem('activeBranchId', state.current);
    }
  },
  extraReducers: (builder)=>{
    builder
      .addCase(fetchBranches.fulfilled, (state, action) => {
        state.list = action.payload;
        const codes = new Set(state.list.map(b=>b.code));
        if (!codes.has(state.current)) {
          state.current = state.list[0]?.code || '';
          if (state.current) localStorage.setItem('activeBranchId', state.current);
        }
      });
  }
});

export const { setCurrentBranch } = branchesSlice.actions;
export default branchesSlice.reducer;

