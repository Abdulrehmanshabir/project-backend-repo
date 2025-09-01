import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load VITE_* vars from the current mode's .env files
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // Use VITE_API_URL for proxy target (trim trailing slashes)
  const target = (env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

  return {
    plugins: [react()],
    // Dev-only proxy so relative calls like /auth and /api hit the backend
    server: {
      proxy: {
        '/auth': { target, changeOrigin: true },
        '/api': { target, changeOrigin: true },
      }
    }
  };
});
