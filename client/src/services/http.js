import axios from 'axios';

// Resolve API base URL from env, with runtime override via localStorage
function resolveBaseURL() {
  let raw = import.meta?.env?.VITE_API_URL;
  console.log('Raw VITE_API_URL:', raw);
  console.log('import.meta.env.VITE_API_URL:', import.meta.env.VITE_API_URL);
  let val = typeof raw === 'string' ? raw.trim() : '';
  let invalid = !val || val === 'undefined' || val === 'null' || val === '/';
  if (invalid) {
    try {
      const ls = localStorage.getItem('apiBaseUrl');
      if (ls && typeof ls === 'string') {
        val = ls.trim();
        invalid = !val || val === 'undefined' || val === 'null' || val === '/';
      }
    } catch {}
  }
  return invalid ? undefined : val.replace(/\/+$/, '');
}

const http = axios.create({
  baseURL: resolveBaseURL(),
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
