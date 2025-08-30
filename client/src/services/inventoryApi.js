import http from './http';

export const ProductsApi = {
  list: (q='') => http.get('/api/products', { params: { q } }).then(r => r.data),
  create: (payload) => http.post('/api/products', payload).then(r => r.data),
  update: (id, patch) => http.patch(`/api/products/${id}`, patch).then(r => r.data),
  remove: (id) => http.delete(`/api/products/${id}`).then(r => r.data),
};

export const StockApi = {
  byBranch: (branchId) => http.get('/api/stock', { params: { branchId } }).then(r => r.data),
  adjust: (payload) => http.patch('/api/stock/adjust', payload).then(r => r.data),
};

export const SalesApi = {
  recent: (branchId) => http.get('/api/sales/recent', { params: { branchId } }).then(r => r.data),
  create: (payload) => http.post('/api/sales', payload).then(r => r.data),
};

export const ReportsApi = {
  lowStock: (branchId, threshold=5) => http.get('/api/reports/low-stock', { params: { branchId, threshold } }).then(r => r.data),
  dailySales: (branchId) => http.get('/api/reports/daily-sales', { params: { branchId } }).then(r => r.data),
};
