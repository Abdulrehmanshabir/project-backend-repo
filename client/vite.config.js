import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env to make sure Vite exposes VITE_* to the client code
  loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react()],
    // No dev proxy; frontend must use absolute base URL via VITE_API_URL
  };
});
