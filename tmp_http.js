import axios from 'axios';
const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});
http.interceptors.request.use((config) => {
  const tk = localStorage.getItem('accessToken');
  if (tk) config.headers.Authorization = `Bearer ${tk}`;
  // Attach branchId for branch-scoped endpoints if missing
  try {
    const branchId = localStorage.getItem('activeBranchId');
    const url = config.url || '';
    const isScoped = url.startsWith('/api/stock') || url.startsWith('/api/sales') || url.startsWith('/api/reports');
    if (branchId && isScoped) {
      if ((config.method || 'get').toLowerCase() === 'get') {
        const usp = new URLSearchParams(config.params || {});
        if (!usp.has('branchId')) usp.set('branchId', branchId);
        config.params = Object.fromEntries(usp.entries());
      } else if (config.data && typeof config.data === 'object' && !('branchId' in config.data)) {
        config.data = { ...config.data, branchId };
      }
    }
  } catch {}
  return config;
});

// Centralized response error handling
http.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Token invalid/expired: sign out and redirect to login
      localStorage.removeItem('accessToken');
      try { window?.location?.assign?.('/login'); } catch {}
    }
    return Promise.reject(error);
  }
);
export default http;
